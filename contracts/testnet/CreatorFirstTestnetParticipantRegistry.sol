// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface ICreatorFirstTestnetPolRegistration {
    function registerAndTopUp(bytes32 participantId, address payable wallet, bytes32 operationId)
        external
        returns (uint256 amount);
}

/// @notice Testnet-only enrolment boundary after an invited person selects a wallet off-chain.
/// @dev The operator approves a claimed invitation's opaque participant id, wallet and role set. The bound
///      wallet then proves control by sending its own role-registration transaction.
///      Names, email addresses and other personal data must never be used as participant ids.
contract CreatorFirstTestnetParticipantRegistry is AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant APPROVER_ROLE = keccak256("APPROVER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    uint8 public constant USER_ROLE = 1;
    uint8 public constant CREATOR_ROLE = 2;
    uint8 public constant ALL_ROLES = USER_ROLE | CREATOR_ROLE;

    string public constant TESTNET_NOTICE =
        "TESTNET ONLY - INVITATION CLAIM APPROVAL IS NOT IDENTITY, RIGHTS, PAYEE OR PRODUCTION ELIGIBILITY";

    struct Participant {
        address payable wallet;
        uint8 approvedRoles;
        uint8 registeredRoles;
        uint64 approvedAt;
        uint64 approvalExpiresAt;
        bool active;
        bool initialFundingCompleted;
    }

    ICreatorFirstTestnetPolRegistration public immutable distributor;
    mapping(bytes32 participantId => Participant participant) public participants;
    mapping(address wallet => bytes32 participantId) public participantIdByWallet;
    mapping(bytes32 participantId => mapping(uint8 role => bytes32 consentVersion)) public consentVersions;

    error InvalidAddress();
    error InvalidIdentifier();
    error InvalidRoles(uint8 roles);
    error InvalidExpiry(uint64 expiry);
    error ParticipantAlreadyApproved(bytes32 participantId);
    error WalletAlreadyApproved(address wallet);
    error ParticipantNotApproved(address wallet);
    error ParticipantInactive(bytes32 participantId);
    error ApprovalExpired(bytes32 participantId, uint64 expiredAt);
    error RoleNotApproved(uint8 role);
    error RoleAlreadyRegistered(uint8 role);
    error WalletMismatch(address expected, address actual);
    error InitialFundingAlreadyCompleted(bytes32 participantId);

    event ParticipantClaimApproved(
        bytes32 indexed participantId,
        address indexed wallet,
        uint8 approvedRoles,
        uint64 approvedAt,
        uint64 approvalExpiresAt
    );
    event ParticipantRoleRegistered(
        bytes32 indexed participantId,
        address indexed wallet,
        uint8 indexed role,
        bytes32 consentVersion
    );
    event ParticipantActiveStateChanged(bytes32 indexed participantId, bool active);
    event ParticipantInitialFundingCompleted(
        bytes32 indexed participantId,
        address indexed wallet,
        bytes32 indexed operationId,
        uint256 amount
    );

    constructor(
        address admin,
        address approver,
        ICreatorFirstTestnetPolRegistration distributorAddress
    ) {
        if (admin == address(0) || approver == address(0) || address(distributorAddress) == address(0)) {
            revert InvalidAddress();
        }
        distributor = distributorAddress;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(APPROVER_ROLE, approver);
        _grantRole(PAUSER_ROLE, admin);
    }

    /// @notice Records a server-verified invitation claim without publishing personal data.
    /// @param participantId Random or strongly salted opaque id; never a direct personal-data hash.
    /// @param wallet Wallet whose control must be proven by the later self-registration transaction.
    /// @param approvedRoles Bit set composed only of USER_ROLE and CREATOR_ROLE.
    /// @param approvalExpiresAt Deadline for self-registration, not an expiry of an activated role.
    function approveClaimedInvitation(
        bytes32 participantId,
        address payable wallet,
        uint8 approvedRoles,
        uint64 approvalExpiresAt
    ) external onlyRole(APPROVER_ROLE) whenNotPaused {
        if (participantId == bytes32(0)) revert InvalidIdentifier();
        if (wallet == address(0)) revert InvalidAddress();
        if (approvedRoles == 0 || approvedRoles & ~ALL_ROLES != 0) revert InvalidRoles(approvedRoles);
        if (approvalExpiresAt <= block.timestamp) revert InvalidExpiry(approvalExpiresAt);
        if (participants[participantId].wallet != address(0)) revert ParticipantAlreadyApproved(participantId);
        if (participantIdByWallet[wallet] != bytes32(0)) revert WalletAlreadyApproved(wallet);

        uint64 approvedAt = uint64(block.timestamp);
        participants[participantId] = Participant({
            wallet: wallet,
            approvedRoles: approvedRoles,
            registeredRoles: 0,
            approvedAt: approvedAt,
            approvalExpiresAt: approvalExpiresAt,
            active: true,
            initialFundingCompleted: false
        });
        participantIdByWallet[wallet] = participantId;
        emit ParticipantClaimApproved(participantId, wallet, approvedRoles, approvedAt, approvalExpiresAt);
    }

    /// @notice Supplies the invitation-claim wallet with the distributor's bounded initial target.
    /// @dev This registry must hold the distributor REGISTRAR_ROLE before the call can succeed.
    function fundInitial(bytes32 participantId, bytes32 operationId)
        external
        onlyRole(APPROVER_ROLE)
        whenNotPaused
        nonReentrant
        returns (uint256 amount)
    {
        if (operationId == bytes32(0)) revert InvalidIdentifier();
        Participant storage participant = _activeApproval(participantId);
        if (participant.initialFundingCompleted) revert InitialFundingAlreadyCompleted(participantId);

        amount = distributor.registerAndTopUp(participantId, participant.wallet, operationId);
        participant.initialFundingCompleted = true;
        emit ParticipantInitialFundingCompleted(participantId, participant.wallet, operationId, amount);
    }

    /// @notice Activates one approved role through a transaction sent by the bound wallet itself.
    function registerSelf(uint8 role, bytes32 consentVersion) external whenNotPaused {
        if (!_isSingleRole(role) || consentVersion == bytes32(0)) revert InvalidRoles(role);
        bytes32 participantId = participantIdByWallet[msg.sender];
        if (participantId == bytes32(0)) revert ParticipantNotApproved(msg.sender);
        Participant storage participant = _activeApproval(participantId);
        if (participant.wallet != msg.sender) revert WalletMismatch(participant.wallet, msg.sender);
        if (participant.approvedRoles & role == 0) revert RoleNotApproved(role);
        if (participant.registeredRoles & role != 0) revert RoleAlreadyRegistered(role);

        participant.registeredRoles |= role;
        consentVersions[participantId][role] = consentVersion;
        emit ParticipantRoleRegistered(participantId, msg.sender, role, consentVersion);
    }

    function setParticipantActive(bytes32 participantId, bool active) external onlyRole(APPROVER_ROLE) {
        Participant storage participant = participants[participantId];
        if (participant.wallet == address(0)) revert ParticipantNotApproved(address(0));
        participant.active = active;
        emit ParticipantActiveStateChanged(participantId, active);
    }

    function isClaimApproved(address wallet, uint8 role) external view returns (bool) {
        if (!_isSingleRole(role)) return false;
        bytes32 participantId = participantIdByWallet[wallet];
        if (participantId == bytes32(0)) return false;
        Participant storage participant = participants[participantId];
        return participant.active && participant.approvalExpiresAt >= block.timestamp
            && participant.approvedRoles & role != 0;
    }

    function isRegistered(address wallet, uint8 role) external view returns (bool) {
        if (!_isSingleRole(role)) return false;
        bytes32 participantId = participantIdByWallet[wallet];
        if (participantId == bytes32(0)) return false;
        Participant storage participant = participants[participantId];
        return participant.active && participant.registeredRoles & role != 0;
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function _activeApproval(bytes32 participantId) private view returns (Participant storage participant) {
        participant = participants[participantId];
        if (participant.wallet == address(0)) revert ParticipantNotApproved(address(0));
        if (!participant.active) revert ParticipantInactive(participantId);
        if (participant.registeredRoles == 0 && participant.approvalExpiresAt < block.timestamp) {
            revert ApprovalExpired(participantId, participant.approvalExpiresAt);
        }
    }

    function _isSingleRole(uint8 role) private pure returns (bool) {
        return role == USER_ROLE || role == CREATOR_ROLE;
    }
}
