// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/// @notice Testnet-only registry for pseudonymous creator and release
///         commitments. It is not identity, rights or payee verification.
contract CreatorFirstCreatorRegistry is AccessControl, Pausable {
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    string public constant TESTNET_NOTICE =
        "TESTNET ONLY - NO IDENTITY, RIGHTS, PAYEE OR RELEASE VERIFICATION";

    enum ReleaseState {
        NONE,
        DECLARED_UNVERIFIED,
        WITHDRAWN
    }

    struct Creator {
        address account;
        address payoutAddress;
        bytes32 profileCommitment;
        uint64 registeredAt;
        uint32 releaseCount;
        bool active;
    }

    struct Release {
        uint256 creatorId;
        bytes32 metadataCommitment;
        bytes32 rightsDeclarationCommitment;
        uint64 declaredAt;
        ReleaseState state;
    }

    uint256 public creatorCount;
    uint256 public nextReleaseId = 1;
    mapping(uint256 creatorId => Creator creator) public creators;
    mapping(address account => uint256 creatorId) public creatorIdByAccount;
    mapping(bytes32 profileCommitment => uint256 creatorId) public creatorIdByProfileCommitment;
    mapping(uint256 releaseId => Release release) public releases;

    error InvalidAddress();
    error InvalidCommitment();
    error CreatorAlreadyRegistered(address account);
    error ProfileCommitmentAlreadyUsed(bytes32 profileCommitment);
    error CreatorNotRegistered(address account);
    error ReleaseNotActive(uint256 releaseId);
    error NotReleaseCreator(uint256 releaseId, uint256 creatorId);
    error NativeAssetRejected();

    event CreatorRegistered(
        uint256 indexed creatorId,
        address indexed account,
        address indexed payoutAddress,
        bytes32 profileCommitment
    );
    event CreatorProfileUpdated(uint256 indexed creatorId, bytes32 previousCommitment, bytes32 newCommitment);
    event CreatorPayoutAddressUpdated(
        uint256 indexed creatorId,
        address indexed previousAddress,
        address indexed newAddress
    );
    event CreatorActiveStateChanged(uint256 indexed creatorId, bool active);
    event ReleaseDeclared(
        uint256 indexed releaseId,
        uint256 indexed creatorId,
        bytes32 metadataCommitment,
        bytes32 rightsDeclarationCommitment
    );
    event ReleaseWithdrawn(uint256 indexed releaseId, uint256 indexed creatorId);

    constructor(address admin) {
        if (admin == address(0)) revert InvalidAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
    }

    function registerCreator(bytes32 profileCommitment, address payoutAddress)
        external
        whenNotPaused
        returns (uint256 creatorId)
    {
        if (profileCommitment == bytes32(0)) revert InvalidCommitment();
        if (payoutAddress == address(0)) revert InvalidAddress();
        if (creatorIdByAccount[msg.sender] != 0) revert CreatorAlreadyRegistered(msg.sender);
        if (creatorIdByProfileCommitment[profileCommitment] != 0) {
            revert ProfileCommitmentAlreadyUsed(profileCommitment);
        }

        creatorId = ++creatorCount;
        creators[creatorId] = Creator({
            account: msg.sender,
            payoutAddress: payoutAddress,
            profileCommitment: profileCommitment,
            registeredAt: uint64(block.timestamp),
            releaseCount: 0,
            active: true
        });
        creatorIdByAccount[msg.sender] = creatorId;
        creatorIdByProfileCommitment[profileCommitment] = creatorId;

        emit CreatorRegistered(creatorId, msg.sender, payoutAddress, profileCommitment);
    }

    function updateProfileCommitment(bytes32 newCommitment) external whenNotPaused {
        uint256 creatorId = _registeredCreatorId(msg.sender);
        if (newCommitment == bytes32(0)) revert InvalidCommitment();
        uint256 existingCreatorId = creatorIdByProfileCommitment[newCommitment];
        if (existingCreatorId != 0 && existingCreatorId != creatorId) {
            revert ProfileCommitmentAlreadyUsed(newCommitment);
        }

        Creator storage creator = creators[creatorId];
        bytes32 previousCommitment = creator.profileCommitment;
        delete creatorIdByProfileCommitment[previousCommitment];
        creator.profileCommitment = newCommitment;
        creatorIdByProfileCommitment[newCommitment] = creatorId;
        emit CreatorProfileUpdated(creatorId, previousCommitment, newCommitment);
    }

    function updatePayoutAddress(address newAddress) external whenNotPaused {
        if (newAddress == address(0)) revert InvalidAddress();
        uint256 creatorId = _registeredCreatorId(msg.sender);
        Creator storage creator = creators[creatorId];
        address previousAddress = creator.payoutAddress;
        creator.payoutAddress = newAddress;
        emit CreatorPayoutAddressUpdated(creatorId, previousAddress, newAddress);
    }

    function setActive(bool active) external whenNotPaused {
        uint256 creatorId = _registeredCreatorId(msg.sender);
        creators[creatorId].active = active;
        emit CreatorActiveStateChanged(creatorId, active);
    }

    function declareRelease(bytes32 metadataCommitment, bytes32 rightsDeclarationCommitment)
        external
        whenNotPaused
        returns (uint256 releaseId)
    {
        if (metadataCommitment == bytes32(0) || rightsDeclarationCommitment == bytes32(0)) {
            revert InvalidCommitment();
        }
        uint256 creatorId = _registeredCreatorId(msg.sender);
        Creator storage creator = creators[creatorId];
        if (!creator.active) revert CreatorNotRegistered(msg.sender);

        releaseId = nextReleaseId++;
        releases[releaseId] = Release({
            creatorId: creatorId,
            metadataCommitment: metadataCommitment,
            rightsDeclarationCommitment: rightsDeclarationCommitment,
            declaredAt: uint64(block.timestamp),
            state: ReleaseState.DECLARED_UNVERIFIED
        });
        creator.releaseCount += 1;
        emit ReleaseDeclared(
            releaseId,
            creatorId,
            metadataCommitment,
            rightsDeclarationCommitment
        );
    }

    function withdrawRelease(uint256 releaseId) external whenNotPaused {
        uint256 creatorId = _registeredCreatorId(msg.sender);
        Release storage release = releases[releaseId];
        if (release.state != ReleaseState.DECLARED_UNVERIFIED) revert ReleaseNotActive(releaseId);
        if (release.creatorId != creatorId) revert NotReleaseCreator(releaseId, creatorId);
        release.state = ReleaseState.WITHDRAWN;
        emit ReleaseWithdrawn(releaseId, creatorId);
    }

    function isRegistered(address account) external view returns (bool) {
        return creatorIdByAccount[account] != 0;
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function _registeredCreatorId(address account) private view returns (uint256 creatorId) {
        creatorId = creatorIdByAccount[account];
        if (creatorId == 0) revert CreatorNotRegistered(account);
    }

    receive() external payable {
        revert NativeAssetRejected();
    }
}
