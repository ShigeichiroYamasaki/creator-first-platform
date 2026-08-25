// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

interface ISortitionGovernorRegistrar {
    function sessions(uint256 sessionId)
        external
        view
        returns (
            bytes32 ruleHash,
            uint64 startsAt,
            uint64 endsAt,
            uint32 voiceCreditBudget,
            uint32 creatorQuorum,
            uint32 userQuorum,
            bool exists
        );

    function registerMember(uint256 sessionId, address member, uint8 house) external;
}

/// @notice Verifiable, non-economic sortition boundary for production governance.
/// @dev Eligibility roots and external randomness remain separately governed inputs.
///      This contract stores no legal identity and grants membership only after a
///      selected indexed leaf is proven by its voting wallet.
contract CreatorFirstVerifiableSortition is AccessControl {
    bytes32 public constant ROUND_MANAGER_ROLE = keccak256("ROUND_MANAGER_ROLE");
    bytes32 public constant RANDOMNESS_PROVIDER_ROLE = keccak256("RANDOMNESS_PROVIDER_ROLE");

    uint8 public constant CREATOR_HOUSE = 1;
    uint8 public constant USER_HOUSE = 2;
    bytes32 public constant ALGORITHM_HASH = keccak256("CFP_PARTIAL_FISHER_YATES_V1");

    struct Round {
        bytes32 eligibilitySnapshotHash;
        bytes32 randomnessRequestId;
        uint64 eligibilityClosesAt;
        uint64 claimDeadline;
        uint256 randomWord;
        bool randomnessFulfilled;
        bool exists;
    }

    struct HouseConfig {
        bytes32 eligibilityRoot;
        uint32 populationSize;
        uint32 primarySeats;
        uint32 alternateSeats;
        uint32 selectedCount;
        uint32 activeRankLimit;
    }

    ISortitionGovernorRegistrar public immutable governor;

    mapping(uint256 sessionId => Round round) public rounds;
    mapping(uint256 sessionId => mapping(uint8 house => HouseConfig config)) public houseConfigs;
    mapping(bytes32 requestId => uint256 sessionId) public requestSessionId;
    mapping(uint256 sessionId => mapping(uint8 house => mapping(uint32 position => uint32 encodedValue)))
        private _shuffleValues;
    mapping(uint256 sessionId => mapping(uint8 house => mapping(uint32 rank => uint32 encodedIndex)))
        public selectedIndexPlusOne;
    mapping(uint256 sessionId => mapping(uint8 house => mapping(uint32 rank => bool claimed))) public rankClaimed;
    mapping(uint256 sessionId => mapping(bytes32 governanceIdCommitment => bool used)) public governanceIdentityUsed;

    error InvalidAddress();
    error InvalidHouse();
    error InvalidConfiguration();
    error InvalidTimeRange();
    error InvalidSession(uint256 sessionId);
    error RoundAlreadyExists(uint256 sessionId);
    error RandomnessRequestAlreadyUsed(bytes32 requestId);
    error EligibilityStillOpen(uint64 closesAt);
    error RandomnessAlreadyFulfilled(uint256 sessionId);
    error RandomnessMissing(uint256 sessionId);
    error AllSelectionsFinalized(uint256 sessionId, uint8 house);
    error SelectionMissing(uint256 sessionId, uint8 house, uint32 rank);
    error RankNotActive(uint32 rank, uint32 activeRankLimit);
    error RankAlreadyClaimed(uint32 rank);
    error ClaimWindowClosed(uint64 deadline);
    error InvalidEligibilityProof();
    error GovernanceIdentityAlreadyUsed(bytes32 commitment);
    error VotingWalletMismatch(address expected, address actual);
    error AlternateActivationUnavailable();
    error InvalidEvidence();

    event SortitionRoundCreated(
        uint256 indexed sessionId,
        bytes32 indexed eligibilitySnapshotHash,
        bytes32 indexed randomnessRequestId,
        uint64 eligibilityClosesAt,
        uint64 claimDeadline
    );
    event HouseEligibilityCommitted(
        uint256 indexed sessionId,
        uint8 indexed house,
        bytes32 eligibilityRoot,
        uint32 populationSize,
        uint32 primarySeats,
        uint32 alternateSeats
    );
    event RandomnessFulfilled(uint256 indexed sessionId, bytes32 indexed requestId, uint256 randomWord);
    event SelectionFinalized(uint256 indexed sessionId, uint8 indexed house, uint32 indexed rank, uint32 candidateIndex);
    event LegislatorSeatClaimed(
        uint256 indexed sessionId,
        uint8 indexed house,
        uint32 indexed rank,
        uint32 candidateIndex,
        bytes32 governanceIdCommitment,
        address votingWallet
    );
    event AlternateActivated(
        uint256 indexed sessionId,
        uint8 indexed house,
        uint32 indexed rank,
        bytes32 vacancyEvidenceHash
    );

    constructor(address admin, address roundManager, address randomnessProvider, address governor_) {
        if (
            admin == address(0) || roundManager == address(0) || randomnessProvider == address(0)
                || governor_ == address(0)
        ) revert InvalidAddress();
        governor = ISortitionGovernorRegistrar(governor_);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ROUND_MANAGER_ROLE, roundManager);
        _grantRole(RANDOMNESS_PROVIDER_ROLE, randomnessProvider);
    }

    function createRound(
        uint256 sessionId,
        bytes32 eligibilitySnapshotHash,
        bytes32 randomnessRequestId,
        uint64 eligibilityClosesAt,
        uint64 claimDeadline,
        bytes32 creatorRoot,
        uint32 creatorPopulation,
        uint32 creatorPrimarySeats,
        uint32 creatorAlternateSeats,
        bytes32 userRoot,
        uint32 userPopulation,
        uint32 userPrimarySeats,
        uint32 userAlternateSeats
    ) external onlyRole(ROUND_MANAGER_ROLE) {
        if (rounds[sessionId].exists) revert RoundAlreadyExists(sessionId);
        if (
            eligibilitySnapshotHash == bytes32(0) || randomnessRequestId == bytes32(0)
                || creatorRoot == bytes32(0) || userRoot == bytes32(0)
        ) revert InvalidConfiguration();
        if (requestSessionId[randomnessRequestId] != 0) revert RandomnessRequestAlreadyUsed(randomnessRequestId);

        (, uint64 sessionStartsAt,,,,, bool sessionExists) = governor.sessions(sessionId);
        if (!sessionExists) revert InvalidSession(sessionId);
        if (
            eligibilityClosesAt <= block.timestamp || claimDeadline <= eligibilityClosesAt
                || claimDeadline >= sessionStartsAt
        ) revert InvalidTimeRange();
        _validateHouseConfiguration(
            creatorPopulation,
            creatorPrimarySeats,
            creatorAlternateSeats
        );
        _validateHouseConfiguration(userPopulation, userPrimarySeats, userAlternateSeats);

        rounds[sessionId] = Round({
            eligibilitySnapshotHash: eligibilitySnapshotHash,
            randomnessRequestId: randomnessRequestId,
            eligibilityClosesAt: eligibilityClosesAt,
            claimDeadline: claimDeadline,
            randomWord: 0,
            randomnessFulfilled: false,
            exists: true
        });
        houseConfigs[sessionId][CREATOR_HOUSE] = HouseConfig({
            eligibilityRoot: creatorRoot,
            populationSize: creatorPopulation,
            primarySeats: creatorPrimarySeats,
            alternateSeats: creatorAlternateSeats,
            selectedCount: 0,
            activeRankLimit: creatorPrimarySeats
        });
        houseConfigs[sessionId][USER_HOUSE] = HouseConfig({
            eligibilityRoot: userRoot,
            populationSize: userPopulation,
            primarySeats: userPrimarySeats,
            alternateSeats: userAlternateSeats,
            selectedCount: 0,
            activeRankLimit: userPrimarySeats
        });
        requestSessionId[randomnessRequestId] = sessionId;

        emit SortitionRoundCreated(
            sessionId,
            eligibilitySnapshotHash,
            randomnessRequestId,
            eligibilityClosesAt,
            claimDeadline
        );
        emit HouseEligibilityCommitted(
            sessionId,
            CREATOR_HOUSE,
            creatorRoot,
            creatorPopulation,
            creatorPrimarySeats,
            creatorAlternateSeats
        );
        emit HouseEligibilityCommitted(
            sessionId,
            USER_HOUSE,
            userRoot,
            userPopulation,
            userPrimarySeats,
            userAlternateSeats
        );
    }

    function fulfillRandomness(bytes32 requestId, uint256 randomWord)
        external
        onlyRole(RANDOMNESS_PROVIDER_ROLE)
    {
        uint256 sessionId = requestSessionId[requestId];
        Round storage round = rounds[sessionId];
        if (!round.exists || round.randomnessRequestId != requestId) revert InvalidSession(sessionId);
        if (block.timestamp < round.eligibilityClosesAt) revert EligibilityStillOpen(round.eligibilityClosesAt);
        if (block.timestamp >= round.claimDeadline) revert ClaimWindowClosed(round.claimDeadline);
        if (round.randomnessFulfilled) revert RandomnessAlreadyFulfilled(sessionId);
        if (randomWord == 0) revert InvalidConfiguration();
        round.randomWord = randomWord;
        round.randomnessFulfilled = true;
        emit RandomnessFulfilled(sessionId, requestId, randomWord);
    }

    function finalizeNextSelection(uint256 sessionId, uint8 house)
        external
        returns (uint32 rank, uint32 candidateIndex)
    {
        _requireHouse(house);
        Round storage round = rounds[sessionId];
        if (!round.exists) revert InvalidSession(sessionId);
        if (!round.randomnessFulfilled) revert RandomnessMissing(sessionId);
        HouseConfig storage config = houseConfigs[sessionId][house];
        rank = config.selectedCount;
        uint32 totalSelections = config.primarySeats + config.alternateSeats;
        if (rank >= totalSelections) revert AllSelectionsFinalized(sessionId, house);

        uint32 remaining = config.populationSize - rank;
        uint32 randomPosition = rank + uint32(
            uint256(keccak256(abi.encode(round.randomWord, sessionId, house, rank))) % remaining
        );
        candidateIndex = _shuffleValue(sessionId, house, randomPosition);
        uint32 rankValue = _shuffleValue(sessionId, house, rank);
        _shuffleValues[sessionId][house][randomPosition] = rankValue + 1;
        selectedIndexPlusOne[sessionId][house][rank] = candidateIndex + 1;
        config.selectedCount = rank + 1;
        emit SelectionFinalized(sessionId, house, rank, candidateIndex);
    }

    function claimSeat(
        uint256 sessionId,
        uint8 house,
        uint32 rank,
        bytes32 governanceIdCommitment,
        address votingWallet,
        bytes32[] calldata eligibilityProof
    ) external {
        _requireHouse(house);
        Round storage round = rounds[sessionId];
        if (!round.exists) revert InvalidSession(sessionId);
        if (msg.sender != votingWallet) revert VotingWalletMismatch(votingWallet, msg.sender);
        if (governanceIdCommitment == bytes32(0) || votingWallet == address(0)) revert InvalidConfiguration();
        HouseConfig storage config = houseConfigs[sessionId][house];
        (, uint64 sessionStartsAt,,,,, bool sessionExists) = governor.sessions(sessionId);
        if (!sessionExists || block.timestamp >= sessionStartsAt) revert ClaimWindowClosed(sessionStartsAt);
        if (rank < config.primarySeats && block.timestamp > round.claimDeadline) {
            revert ClaimWindowClosed(round.claimDeadline);
        }
        if (rank >= config.activeRankLimit) revert RankNotActive(rank, config.activeRankLimit);
        uint32 encodedIndex = selectedIndexPlusOne[sessionId][house][rank];
        if (encodedIndex == 0) revert SelectionMissing(sessionId, house, rank);
        if (rankClaimed[sessionId][house][rank]) revert RankAlreadyClaimed(rank);
        if (governanceIdentityUsed[sessionId][governanceIdCommitment]) {
            revert GovernanceIdentityAlreadyUsed(governanceIdCommitment);
        }
        uint32 candidateIndex = encodedIndex - 1;
        bytes32 leaf = eligibilityLeaf(candidateIndex, governanceIdCommitment, votingWallet);
        if (!MerkleProof.verifyCalldata(eligibilityProof, config.eligibilityRoot, leaf)) {
            revert InvalidEligibilityProof();
        }

        rankClaimed[sessionId][house][rank] = true;
        governanceIdentityUsed[sessionId][governanceIdCommitment] = true;
        governor.registerMember(sessionId, votingWallet, house);
        emit LegislatorSeatClaimed(
            sessionId,
            house,
            rank,
            candidateIndex,
            governanceIdCommitment,
            votingWallet
        );
    }

    function activateNextAlternate(uint256 sessionId, uint8 house, bytes32 vacancyEvidenceHash)
        external
        onlyRole(ROUND_MANAGER_ROLE)
        returns (uint32 rank)
    {
        _requireHouse(house);
        Round storage round = rounds[sessionId];
        if (!round.exists) revert InvalidSession(sessionId);
        if (block.timestamp <= round.claimDeadline) revert AlternateActivationUnavailable();
        if (vacancyEvidenceHash == bytes32(0)) revert InvalidEvidence();
        HouseConfig storage config = houseConfigs[sessionId][house];
        uint32 totalSelections = config.primarySeats + config.alternateSeats;
        rank = config.activeRankLimit;
        if (rank >= totalSelections || rank >= config.selectedCount) revert AlternateActivationUnavailable();
        config.activeRankLimit = rank + 1;
        emit AlternateActivated(sessionId, house, rank, vacancyEvidenceHash);
    }

    function eligibilityLeaf(uint32 candidateIndex, bytes32 governanceIdCommitment, address votingWallet)
        public
        pure
        returns (bytes32)
    {
        return keccak256(bytes.concat(keccak256(abi.encode(candidateIndex, governanceIdCommitment, votingWallet))));
    }

    function _shuffleValue(uint256 sessionId, uint8 house, uint32 position) private view returns (uint32) {
        uint32 encoded = _shuffleValues[sessionId][house][position];
        return encoded == 0 ? position : encoded - 1;
    }

    function _validateHouseConfiguration(uint32 population, uint32 primarySeats, uint32 alternateSeats)
        private
        pure
    {
        if (
            population == 0 || primarySeats == 0
                || uint256(primarySeats) + uint256(alternateSeats) > population
        ) revert InvalidConfiguration();
    }

    function _requireHouse(uint8 house) private pure {
        if (house != CREATOR_HOUSE && house != USER_HOUSE) revert InvalidHouse();
    }
}
