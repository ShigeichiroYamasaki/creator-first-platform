// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice Testnet-only gas station for pre-approved CFP experiment participants.
/// @dev An off-chain operator estimates the next approved operation's gas need and
///      submits a target wallet balance. This contract enforces registration,
///      replay protection, per-transfer and lifetime caps, cooldown, daily budget,
///      and the target-balance ceiling. Test POL has no monetary value.
contract CreatorFirstTestnetPolDistributor is AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    string public constant TESTNET_NOTICE =
        "TESTNET ONLY - AMOY POL HAS NO MONETARY VALUE OR PRODUCTION RIGHTS";
    uint256 public constant INITIAL_TARGET_BALANCE = 0.02 ether;
    uint256 public constant MAX_TARGET_BALANCE = 0.05 ether;
    uint256 public constant MAX_PER_DISTRIBUTION = 0.05 ether;
    uint256 public constant LIFETIME_CAP_PER_PARTICIPANT = 0.5 ether;
    uint256 public constant DAILY_GLOBAL_BUDGET = 1 ether;
    uint64 public constant TOP_UP_COOLDOWN = 10 minutes;

    struct Participant {
        address payable wallet;
        uint128 cumulativeDistributed;
        uint64 registeredAt;
        uint64 lastDistributedAt;
        bool active;
    }

    mapping(bytes32 participantId => Participant participant) public participants;
    mapping(address wallet => bytes32 participantId) public participantIdByWallet;
    mapping(bytes32 operationId => bool used) public usedOperationIds;
    mapping(uint256 day => uint256 amount) public distributedByDay;

    error InvalidAddress();
    error InvalidIdentifier();
    error ParticipantAlreadyRegistered(bytes32 participantId);
    error WalletAlreadyRegistered(address wallet);
    error ParticipantNotActive(bytes32 participantId);
    error WalletMismatch(address expected, address actual);
    error OperationAlreadyUsed(bytes32 operationId);
    error InvalidTargetBalance(uint256 targetBalance, uint256 maximum);
    error NoTopUpNeeded(uint256 currentBalance, uint256 targetBalance);
    error CooldownActive(uint256 availableAt);
    error LifetimeCapReached(bytes32 participantId);
    error DailyBudgetExceeded(uint256 requested, uint256 remaining);
    error InsufficientDistributorBalance(uint256 requested, uint256 available);
    error NativeTransferFailed(address recipient, uint256 amount);
    error InvalidWithdrawal(uint256 requested, uint256 available);

    event DistributorFunded(address indexed sender, uint256 amount, uint256 balanceAfter);
    event ParticipantRegistered(bytes32 indexed participantId, address indexed wallet, uint64 registeredAt);
    event ParticipantActiveStateChanged(bytes32 indexed participantId, bool active);
    event TestPolDistributed(
        bytes32 indexed participantId,
        address indexed wallet,
        bytes32 indexed operationId,
        uint256 amount,
        uint256 targetBalance,
        uint256 cumulativeDistributed
    );
    event EmergencyWithdrawal(address indexed recipient, uint256 amount);

    constructor(address admin, address registrar, address distributor) payable {
        if (admin == address(0) || registrar == address(0) || distributor == address(0)) {
            revert InvalidAddress();
        }
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REGISTRAR_ROLE, registrar);
        _grantRole(DISTRIBUTOR_ROLE, distributor);
        _grantRole(PAUSER_ROLE, admin);
        if (msg.value != 0) emit DistributorFunded(msg.sender, msg.value, msg.value);
    }

    /// @notice Registers one pre-approved participant and supplies the minimum
    ///         initial balance when the wallet is below 0.02 Test POL.
    function registerAndTopUp(bytes32 participantId, address payable wallet, bytes32 operationId)
        external
        onlyRole(REGISTRAR_ROLE)
        whenNotPaused
        nonReentrant
        returns (uint256 amount)
    {
        if (participantId == bytes32(0) || operationId == bytes32(0)) revert InvalidIdentifier();
        if (wallet == address(0)) revert InvalidAddress();
        if (participants[participantId].wallet != address(0)) {
            revert ParticipantAlreadyRegistered(participantId);
        }
        if (participantIdByWallet[wallet] != bytes32(0)) revert WalletAlreadyRegistered(wallet);

        uint64 registeredAt = uint64(block.timestamp);
        participants[participantId] = Participant({
            wallet: wallet,
            cumulativeDistributed: 0,
            registeredAt: registeredAt,
            lastDistributedAt: 0,
            active: true
        });
        participantIdByWallet[wallet] = participantId;
        emit ParticipantRegistered(participantId, wallet, registeredAt);

        if (wallet.balance < INITIAL_TARGET_BALANCE) {
            amount = _topUp(participantId, wallet, INITIAL_TARGET_BALANCE, operationId, false);
        } else {
            usedOperationIds[operationId] = true;
        }
    }

    /// @notice Replenishes a registered wallet only to the operator-provided
    ///         target required for an approved operation, never above 0.05 POL.
    function topUp(bytes32 participantId, address payable wallet, uint256 targetBalance, bytes32 operationId)
        external
        onlyRole(DISTRIBUTOR_ROLE)
        whenNotPaused
        nonReentrant
        returns (uint256 amount)
    {
        amount = _topUp(participantId, wallet, targetBalance, operationId, true);
    }

    function setParticipantActive(bytes32 participantId, bool active) external onlyRole(REGISTRAR_ROLE) {
        Participant storage participant = participants[participantId];
        if (participant.wallet == address(0)) revert ParticipantNotActive(participantId);
        participant.active = active;
        emit ParticipantActiveStateChanged(participantId, active);
    }

    function previewTopUp(bytes32 participantId, address wallet, uint256 targetBalance)
        external
        view
        returns (uint256 amount)
    {
        Participant storage participant = participants[participantId];
        if (!participant.active) return 0;
        if (participant.wallet != wallet || targetBalance == 0 || targetBalance > MAX_TARGET_BALANCE) return 0;
        if (wallet.balance >= targetBalance) return 0;
        uint256 remainingLifetime = LIFETIME_CAP_PER_PARTICIPANT - participant.cumulativeDistributed;
        uint256 desired = targetBalance - wallet.balance;
        amount = _min(desired, _min(MAX_PER_DISTRIBUTION, remainingLifetime));
        uint256 todayRemaining = DAILY_GLOBAL_BUDGET - distributedByDay[block.timestamp / 1 days];
        amount = _min(amount, todayRemaining);
        amount = _min(amount, address(this).balance);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /// @notice Returns unused Test POL during an incident or after the experiment.
    ///         Pausing is required so distribution cannot race the withdrawal.
    function emergencyWithdraw(address payable recipient, uint256 amount)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
        whenPaused
        nonReentrant
    {
        if (recipient == address(0)) revert InvalidAddress();
        if (amount == 0 || amount > address(this).balance) {
            revert InvalidWithdrawal(amount, address(this).balance);
        }
        (bool success,) = recipient.call{value: amount}("");
        if (!success) revert NativeTransferFailed(recipient, amount);
        emit EmergencyWithdrawal(recipient, amount);
    }

    function _topUp(
        bytes32 participantId,
        address payable wallet,
        uint256 targetBalance,
        bytes32 operationId,
        bool enforceCooldown
    ) private returns (uint256 amount) {
        if (operationId == bytes32(0)) revert InvalidIdentifier();
        if (usedOperationIds[operationId]) revert OperationAlreadyUsed(operationId);
        Participant storage participant = participants[participantId];
        if (!participant.active) revert ParticipantNotActive(participantId);
        if (participant.wallet != wallet) revert WalletMismatch(participant.wallet, wallet);
        if (targetBalance == 0 || targetBalance > MAX_TARGET_BALANCE) {
            revert InvalidTargetBalance(targetBalance, MAX_TARGET_BALANCE);
        }

        uint256 currentBalance = wallet.balance;
        if (currentBalance >= targetBalance) revert NoTopUpNeeded(currentBalance, targetBalance);
        if (
            enforceCooldown && participant.lastDistributedAt != 0
                && block.timestamp < uint256(participant.lastDistributedAt) + TOP_UP_COOLDOWN
        ) {
            revert CooldownActive(uint256(participant.lastDistributedAt) + TOP_UP_COOLDOWN);
        }

        uint256 remainingLifetime = LIFETIME_CAP_PER_PARTICIPANT - participant.cumulativeDistributed;
        if (remainingLifetime == 0) revert LifetimeCapReached(participantId);
        amount = _min(targetBalance - currentBalance, _min(MAX_PER_DISTRIBUTION, remainingLifetime));

        uint256 day = block.timestamp / 1 days;
        uint256 dailyDistributed = distributedByDay[day];
        uint256 remainingDaily = DAILY_GLOBAL_BUDGET - dailyDistributed;
        if (amount > remainingDaily) revert DailyBudgetExceeded(amount, remainingDaily);
        if (amount > address(this).balance) {
            revert InsufficientDistributorBalance(amount, address(this).balance);
        }

        usedOperationIds[operationId] = true;
        participant.cumulativeDistributed += uint128(amount);
        participant.lastDistributedAt = uint64(block.timestamp);
        distributedByDay[day] = dailyDistributed + amount;

        (bool success,) = wallet.call{value: amount}("");
        if (!success) revert NativeTransferFailed(wallet, amount);
        emit TestPolDistributed(
            participantId,
            wallet,
            operationId,
            amount,
            targetBalance,
            participant.cumulativeDistributed
        );
    }

    function _min(uint256 left, uint256 right) private pure returns (uint256) {
        return left < right ? left : right;
    }

    receive() external payable {
        emit DistributorFunded(msg.sender, msg.value, address(this).balance);
    }
}
