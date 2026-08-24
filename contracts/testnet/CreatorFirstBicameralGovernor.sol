// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice Testnet-only bicameral quadratic governor.
/// @dev Membership is registered by a test registrar. Ballots are public and
///      intentionally omit production personhood, sortition and privacy proofs.
contract CreatorFirstBicameralGovernor is AccessControl, ReentrancyGuard {
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");
    bytes32 public constant REVIEWER_ROLE = keccak256("REVIEWER_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    uint8 public constant MAX_INTENSITY = 9;

    enum House {
        NONE,
        CREATOR,
        USER
    }

    enum ChangeClass {
        NONE,
        P1_PARAMETER,
        P2_UPGRADE,
        P3_CONSTITUTIONAL
    }

    enum ProposalState {
        NONE,
        PENDING,
        VOTING,
        AWAITING_FINALIZATION,
        REJECTED,
        JOINT_APPROVED,
        REVIEWED,
        TIMELOCKED,
        EXECUTED,
        CANCELLED,
        EXPIRED
    }

    struct Session {
        bytes32 ruleHash;
        uint64 startsAt;
        uint64 endsAt;
        uint32 voiceCreditBudget;
        uint32 creatorQuorum;
        uint32 userQuorum;
        bool exists;
    }

    struct Proposal {
        uint256 sessionId;
        bytes32 contentHash;
        bytes32 specificationHash;
        bytes32 manifestHash;
        bytes32 callDataHash;
        address target;
        uint256 value;
        uint64 votingStartsAt;
        uint64 votingEndsAt;
        uint64 executableAt;
        uint64 expiresAt;
        int64 creatorScore;
        int64 userScore;
        uint32 creatorParticipants;
        uint32 userParticipants;
        ChangeClass changeClass;
        bool creatorApproved;
        bool userApproved;
        bool finalized;
        bool reviewed;
        bool queued;
        bool executed;
        bool cancelled;
    }

    struct Ballot {
        int8 intensity;
        uint32 cost;
        bool cast;
    }

    uint256 public immutable allowedChainId;
    uint64 public immutable p1Delay;
    uint64 public immutable p2Delay;
    uint64 public immutable p3Delay;
    uint64 public immutable executionWindow;

    uint256 public sessionCount;
    uint256 public proposalCount;

    mapping(uint256 sessionId => Session session) public sessions;
    mapping(uint256 sessionId => mapping(address member => House house)) public memberHouse;
    mapping(uint256 sessionId => mapping(address member => uint32 spent)) public spentVoiceCredits;
    mapping(uint256 proposalId => Proposal proposal) public proposals;
    mapping(uint256 proposalId => mapping(address member => Ballot ballot)) public ballots;
    mapping(uint256 proposalId => bytes32 evidenceHash) public constitutionalEvidenceHash;
    mapping(uint256 proposalId => bytes32 evidenceHash) public reviewEvidenceHash;

    error InvalidAddress();
    error InvalidConfiguration();
    error InvalidHash();
    error InvalidTimeRange();
    error InvalidSession(uint256 sessionId);
    error InvalidProposal(uint256 proposalId);
    error InvalidHouse();
    error MemberAlreadyRegistered(address member);
    error MembershipClosed(uint256 sessionId);
    error VotingClosed(uint256 proposalId);
    error InvalidIntensity(int8 intensity);
    error VoiceCreditExceeded(uint32 budget, uint32 attempted);
    error FinalizationUnavailable(uint256 proposalId);
    error BicameralApprovalMissing(uint256 proposalId);
    error ReviewMissing(uint256 proposalId);
    error ConstitutionalEvidenceMissing(uint256 proposalId);
    error ProposalNotQueued(uint256 proposalId);
    error TimelockNotMature(uint64 executableAt);
    error ExecutionExpired(uint64 expiresAt);
    error ManifestMismatch();
    error WrongChain(uint256 expected, uint256 actual);
    error ExecutionFailed(bytes returnData);
    error FinalState(uint256 proposalId);

    event SessionCreated(
        uint256 indexed sessionId,
        bytes32 indexed ruleHash,
        uint64 startsAt,
        uint64 endsAt,
        uint32 voiceCreditBudget,
        uint32 creatorQuorum,
        uint32 userQuorum
    );
    event MemberRegistered(uint256 indexed sessionId, address indexed member, House indexed house);
    event ProposalRegistered(
        uint256 indexed proposalId,
        uint256 indexed sessionId,
        ChangeClass indexed changeClass,
        bytes32 contentHash,
        bytes32 specificationHash,
        bytes32 manifestHash,
        address target,
        uint256 value,
        bytes32 callDataHash,
        uint64 votingStartsAt,
        uint64 votingEndsAt
    );
    event BallotCast(
        uint256 indexed proposalId,
        uint256 indexed sessionId,
        address indexed member,
        House house,
        int8 intensity,
        uint32 cost,
        uint32 totalSpent
    );
    event ProposalFinalized(
        uint256 indexed proposalId,
        bool creatorApproved,
        bool userApproved,
        int64 creatorScore,
        int64 userScore,
        uint32 creatorParticipants,
        uint32 userParticipants
    );
    event ReviewRecorded(uint256 indexed proposalId, bytes32 indexed evidenceHash);
    event ConstitutionalEvidenceRecorded(uint256 indexed proposalId, bytes32 indexed evidenceHash);
    event ProposalQueued(uint256 indexed proposalId, uint64 executableAt, uint64 expiresAt);
    event ProposalExecuted(uint256 indexed proposalId, address indexed target, bytes32 indexed callDataHash);
    event ProposalCancelled(uint256 indexed proposalId, bytes32 indexed incidentHash);

    constructor(
        address admin,
        address registrar,
        address reviewer,
        address guardian,
        uint256 expectedChainId,
        uint64 parameterDelay,
        uint64 upgradeDelay,
        uint64 constitutionalDelay,
        uint64 operationWindow
    ) {
        if (admin == address(0) || registrar == address(0) || reviewer == address(0) || guardian == address(0)) {
            revert InvalidAddress();
        }
        if (
            expectedChainId == 0 || parameterDelay == 0 || upgradeDelay < parameterDelay
                || constitutionalDelay < upgradeDelay || operationWindow == 0
        ) revert InvalidConfiguration();

        allowedChainId = expectedChainId;
        p1Delay = parameterDelay;
        p2Delay = upgradeDelay;
        p3Delay = constitutionalDelay;
        executionWindow = operationWindow;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REGISTRAR_ROLE, registrar);
        _grantRole(REVIEWER_ROLE, reviewer);
        _grantRole(GUARDIAN_ROLE, guardian);
    }

    function createSession(
        bytes32 ruleHash,
        uint64 startsAt,
        uint64 endsAt,
        uint32 voiceCreditBudget,
        uint32 creatorQuorum,
        uint32 userQuorum
    ) external onlyRole(REGISTRAR_ROLE) returns (uint256 sessionId) {
        if (ruleHash == bytes32(0)) revert InvalidHash();
        if (startsAt <= block.timestamp || endsAt <= startsAt) revert InvalidTimeRange();
        if (voiceCreditBudget == 0 || creatorQuorum == 0 || userQuorum == 0) revert InvalidConfiguration();

        sessionId = ++sessionCount;
        sessions[sessionId] = Session({
            ruleHash: ruleHash,
            startsAt: startsAt,
            endsAt: endsAt,
            voiceCreditBudget: voiceCreditBudget,
            creatorQuorum: creatorQuorum,
            userQuorum: userQuorum,
            exists: true
        });
        emit SessionCreated(
            sessionId,
            ruleHash,
            startsAt,
            endsAt,
            voiceCreditBudget,
            creatorQuorum,
            userQuorum
        );
    }

    function registerMember(uint256 sessionId, address member, House house) external onlyRole(REGISTRAR_ROLE) {
        Session storage session = _session(sessionId);
        if (block.timestamp >= session.startsAt) revert MembershipClosed(sessionId);
        if (member == address(0)) revert InvalidAddress();
        if (house != House.CREATOR && house != House.USER) revert InvalidHouse();
        if (memberHouse[sessionId][member] != House.NONE) revert MemberAlreadyRegistered(member);

        memberHouse[sessionId][member] = house;
        emit MemberRegistered(sessionId, member, house);
    }

    function registerProposal(
        uint256 sessionId,
        bytes32 contentHash,
        bytes32 specificationHash,
        bytes32 manifestHash,
        ChangeClass changeClass,
        address target,
        uint256 value,
        bytes32 callDataHash,
        uint64 votingStartsAt,
        uint64 votingEndsAt
    ) external onlyRole(REGISTRAR_ROLE) returns (uint256 proposalId) {
        Session storage session = _session(sessionId);
        if (contentHash == bytes32(0) || specificationHash == bytes32(0) || manifestHash == bytes32(0)) {
            revert InvalidHash();
        }
        if (target == address(0)) revert InvalidAddress();
        if (callDataHash == bytes32(0)) revert InvalidHash();
        if (changeClass == ChangeClass.NONE) revert InvalidConfiguration();
        if (
            votingStartsAt < session.startsAt || votingStartsAt <= block.timestamp || votingEndsAt <= votingStartsAt
                || votingEndsAt > session.endsAt
        ) revert InvalidTimeRange();

        proposalId = ++proposalCount;
        Proposal storage proposal = proposals[proposalId];
        proposal.sessionId = sessionId;
        proposal.contentHash = contentHash;
        proposal.specificationHash = specificationHash;
        proposal.manifestHash = manifestHash;
        proposal.callDataHash = callDataHash;
        proposal.target = target;
        proposal.value = value;
        proposal.votingStartsAt = votingStartsAt;
        proposal.votingEndsAt = votingEndsAt;
        proposal.changeClass = changeClass;

        emit ProposalRegistered(
            proposalId,
            sessionId,
            changeClass,
            contentHash,
            specificationHash,
            manifestHash,
            target,
            value,
            callDataHash,
            votingStartsAt,
            votingEndsAt
        );
    }

    function castVote(uint256 proposalId, int8 intensity) external {
        Proposal storage proposal = _proposal(proposalId);
        if (proposal.finalized || proposal.cancelled || proposal.executed) revert FinalState(proposalId);
        if (block.timestamp < proposal.votingStartsAt || block.timestamp >= proposal.votingEndsAt) {
            revert VotingClosed(proposalId);
        }
        if (intensity < -int8(MAX_INTENSITY) || intensity > int8(MAX_INTENSITY)) {
            revert InvalidIntensity(intensity);
        }

        House house = memberHouse[proposal.sessionId][msg.sender];
        if (house != House.CREATOR && house != House.USER) revert InvalidHouse();

        Ballot storage ballot = ballots[proposalId][msg.sender];
        uint32 absolute = intensity < 0 ? uint32(uint8(-intensity)) : uint32(uint8(intensity));
        uint32 nextCost = absolute * absolute;
        uint32 currentSpent = spentVoiceCredits[proposal.sessionId][msg.sender];
        uint32 nextSpent = currentSpent - ballot.cost + nextCost;
        uint32 budget = sessions[proposal.sessionId].voiceCreditBudget;
        if (nextSpent > budget) revert VoiceCreditExceeded(budget, nextSpent);

        if (house == House.CREATOR) {
            if (!ballot.cast) proposal.creatorParticipants += 1;
            proposal.creatorScore = proposal.creatorScore - int64(ballot.intensity) + int64(intensity);
        } else {
            if (!ballot.cast) proposal.userParticipants += 1;
            proposal.userScore = proposal.userScore - int64(ballot.intensity) + int64(intensity);
        }

        ballot.intensity = intensity;
        ballot.cost = nextCost;
        ballot.cast = true;
        spentVoiceCredits[proposal.sessionId][msg.sender] = nextSpent;
        emit BallotCast(proposalId, proposal.sessionId, msg.sender, house, intensity, nextCost, nextSpent);
    }

    function finalizeProposal(uint256 proposalId) external {
        Proposal storage proposal = _proposal(proposalId);
        if (proposal.finalized || proposal.cancelled || proposal.executed) revert FinalState(proposalId);
        if (block.timestamp < proposal.votingEndsAt) revert FinalizationUnavailable(proposalId);

        Session storage session = sessions[proposal.sessionId];
        proposal.creatorApproved = proposal.creatorParticipants >= session.creatorQuorum && proposal.creatorScore > 0;
        proposal.userApproved = proposal.userParticipants >= session.userQuorum && proposal.userScore > 0;
        proposal.finalized = true;

        emit ProposalFinalized(
            proposalId,
            proposal.creatorApproved,
            proposal.userApproved,
            proposal.creatorScore,
            proposal.userScore,
            proposal.creatorParticipants,
            proposal.userParticipants
        );
    }

    function recordReview(uint256 proposalId, bytes32 evidenceHash) external onlyRole(REVIEWER_ROLE) {
        Proposal storage proposal = _proposal(proposalId);
        if (!proposal.finalized || !proposal.creatorApproved || !proposal.userApproved) {
            revert BicameralApprovalMissing(proposalId);
        }
        if (proposal.cancelled || proposal.executed || proposal.queued) revert FinalState(proposalId);
        if (evidenceHash == bytes32(0)) revert InvalidHash();
        if (
            proposal.changeClass == ChangeClass.P3_CONSTITUTIONAL
                && constitutionalEvidenceHash[proposalId] == bytes32(0)
        ) revert ConstitutionalEvidenceMissing(proposalId);
        reviewEvidenceHash[proposalId] = evidenceHash;
        proposal.reviewed = true;
        emit ReviewRecorded(proposalId, evidenceHash);
    }

    function recordConstitutionalEvidence(uint256 proposalId, bytes32 evidenceHash)
        external
        onlyRole(REVIEWER_ROLE)
    {
        Proposal storage proposal = _proposal(proposalId);
        if (!proposal.finalized || !proposal.creatorApproved || !proposal.userApproved) {
            revert BicameralApprovalMissing(proposalId);
        }
        if (proposal.changeClass != ChangeClass.P3_CONSTITUTIONAL) revert InvalidConfiguration();
        if (proposal.reviewed || proposal.queued || proposal.cancelled || proposal.executed) revert FinalState(proposalId);
        if (evidenceHash == bytes32(0)) revert InvalidHash();
        constitutionalEvidenceHash[proposalId] = evidenceHash;
        emit ConstitutionalEvidenceRecorded(proposalId, evidenceHash);
    }

    function queueProposal(uint256 proposalId) external {
        Proposal storage proposal = _proposal(proposalId);
        if (!proposal.finalized || !proposal.creatorApproved || !proposal.userApproved) {
            revert BicameralApprovalMissing(proposalId);
        }
        if (!proposal.reviewed) revert ReviewMissing(proposalId);
        if (proposal.queued || proposal.cancelled || proposal.executed) revert FinalState(proposalId);

        uint64 executableAt = uint64(block.timestamp) + delayFor(proposal.changeClass);
        proposal.executableAt = executableAt;
        proposal.expiresAt = executableAt + executionWindow;
        proposal.queued = true;
        emit ProposalQueued(proposalId, proposal.executableAt, proposal.expiresAt);
    }

    function executeProposal(uint256 proposalId, bytes calldata callData)
        external
        payable
        nonReentrant
        returns (bytes memory returnData)
    {
        Proposal storage proposal = _proposal(proposalId);
        if (block.chainid != allowedChainId) revert WrongChain(allowedChainId, block.chainid);
        if (!proposal.queued) revert ProposalNotQueued(proposalId);
        if (proposal.cancelled || proposal.executed) revert FinalState(proposalId);
        if (block.timestamp < proposal.executableAt) revert TimelockNotMature(proposal.executableAt);
        if (block.timestamp > proposal.expiresAt) revert ExecutionExpired(proposal.expiresAt);
        if (msg.value != proposal.value || keccak256(callData) != proposal.callDataHash) revert ManifestMismatch();

        proposal.executed = true;
        (bool success, bytes memory result) = proposal.target.call{value: proposal.value}(callData);
        if (!success) revert ExecutionFailed(result);
        emit ProposalExecuted(proposalId, proposal.target, proposal.callDataHash);
        return result;
    }

    function cancelQueuedProposal(uint256 proposalId, bytes32 incidentHash) external onlyRole(GUARDIAN_ROLE) {
        Proposal storage proposal = _proposal(proposalId);
        if (!proposal.queued) revert ProposalNotQueued(proposalId);
        if (proposal.cancelled || proposal.executed) revert FinalState(proposalId);
        if (incidentHash == bytes32(0)) revert InvalidHash();
        proposal.cancelled = true;
        emit ProposalCancelled(proposalId, incidentHash);
    }

    function delayFor(ChangeClass changeClass) public view returns (uint64) {
        if (changeClass == ChangeClass.P1_PARAMETER) return p1Delay;
        if (changeClass == ChangeClass.P2_UPGRADE) return p2Delay;
        if (changeClass == ChangeClass.P3_CONSTITUTIONAL) return p3Delay;
        revert InvalidConfiguration();
    }

    function remainingVoiceCredits(uint256 sessionId, address member) external view returns (uint32) {
        Session storage session = _session(sessionId);
        return session.voiceCreditBudget - spentVoiceCredits[sessionId][member];
    }

    function proposalState(uint256 proposalId) public view returns (ProposalState) {
        Proposal storage proposal = _proposal(proposalId);
        if (proposal.executed) return ProposalState.EXECUTED;
        if (proposal.cancelled) return ProposalState.CANCELLED;
        if (proposal.queued && block.timestamp > proposal.expiresAt) return ProposalState.EXPIRED;
        if (proposal.queued) return ProposalState.TIMELOCKED;
        if (proposal.reviewed) return ProposalState.REVIEWED;
        if (proposal.finalized && proposal.creatorApproved && proposal.userApproved) return ProposalState.JOINT_APPROVED;
        if (proposal.finalized) return ProposalState.REJECTED;
        if (block.timestamp >= proposal.votingEndsAt) return ProposalState.AWAITING_FINALIZATION;
        if (block.timestamp >= proposal.votingStartsAt) return ProposalState.VOTING;
        return ProposalState.PENDING;
    }

    function _session(uint256 sessionId) internal view returns (Session storage session) {
        session = sessions[sessionId];
        if (!session.exists) revert InvalidSession(sessionId);
    }

    function _proposal(uint256 proposalId) internal view returns (Proposal storage proposal) {
        proposal = proposals[proposalId];
        if (proposal.sessionId == 0) revert InvalidProposal(proposalId);
    }
}
