// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract CreatorFirstSubscription is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant PLAN_MANAGER_ROLE = keccak256("PLAN_MANAGER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    struct Plan {
        uint128 price;
        uint64 duration;
        uint64 version;
        bool enabled;
    }

    IERC20 public immutable settlementAsset;
    address public immutable treasury;
    Plan public plan;
    mapping(address subscriber => uint64 activeUntil) public subscriptionActiveUntil;
    mapping(bytes32 paymentRef => bool used) public usedPaymentReference;

    error InvalidAddress();
    error InvalidPlan();
    error StalePlanVersion(uint64 expected, uint64 actual);
    error DuplicatePaymentReference(bytes32 paymentRef);
    error NativeAssetRejected();

    event PlanUpdated(uint64 indexed version, uint128 price, uint64 duration, bool enabled);
    event SubscriptionPaymentFinalized(
        bytes32 indexed paymentReference,
        address indexed subscriber,
        address indexed asset,
        uint256 amount,
        uint64 planVersion,
        uint64 activeUntil
    );

    constructor(
        IERC20 asset,
        address treasury_,
        address admin,
        address planManager,
        uint128 initialPrice,
        uint64 initialDuration
    ) {
        if (
            address(asset) == address(0) || treasury_ == address(0) || admin == address(0)
                || planManager == address(0)
        ) revert InvalidAddress();
        settlementAsset = asset;
        treasury = treasury_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PLAN_MANAGER_ROLE, planManager);
        _grantRole(PAUSER_ROLE, admin);
        if (initialPrice == 0 || initialDuration == 0) revert InvalidPlan();
        plan = Plan(initialPrice, initialDuration, 1, true);
        emit PlanUpdated(1, initialPrice, initialDuration, true);
    }

    function setPlan(uint128 price, uint64 duration, bool enabled) external onlyRole(PLAN_MANAGER_ROLE) {
        if (price == 0 || duration == 0) revert InvalidPlan();
        uint64 nextVersion = plan.version + 1;
        plan = Plan(price, duration, nextVersion, enabled);
        emit PlanUpdated(nextVersion, price, duration, enabled);
    }

    function subscribe(bytes32 paymentReference, uint64 expectedPlanVersion)
        external
        nonReentrant
        whenNotPaused
        returns (uint64 activeUntil)
    {
        Plan memory current = plan;
        if (!current.enabled || current.price == 0 || current.duration == 0) revert InvalidPlan();
        if (expectedPlanVersion != current.version) {
            revert StalePlanVersion(expectedPlanVersion, current.version);
        }
        if (paymentReference == bytes32(0) || usedPaymentReference[paymentReference]) {
            revert DuplicatePaymentReference(paymentReference);
        }

        usedPaymentReference[paymentReference] = true;
        settlementAsset.safeTransferFrom(msg.sender, treasury, current.price);

        uint64 previous = subscriptionActiveUntil[msg.sender];
        uint64 startsAt = previous > block.timestamp ? previous : uint64(block.timestamp);
        activeUntil = startsAt + current.duration;
        subscriptionActiveUntil[msg.sender] = activeUntil;

        emit SubscriptionPaymentFinalized(
            paymentReference,
            msg.sender,
            address(settlementAsset),
            current.price,
            current.version,
            activeUntil
        );
    }

    function isActive(address subscriber) external view returns (bool) {
        return subscriptionActiveUntil[subscriber] >= block.timestamp;
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    receive() external payable {
        revert NativeAssetRejected();
    }
}
