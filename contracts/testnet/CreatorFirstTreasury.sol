// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @notice Minimal testnet custody boundary. Events are transparency inputs,
///         not statutory accounting records or payment approvals by themselves.
contract CreatorFirstTreasury is AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant DISBURSER_ROLE = keccak256("DISBURSER_ROLE");

    enum SpendCategory {
        CREATOR,
        OPERATIONS,
        TAX,
        PROMOTION,
        COMMUNITY
    }

    IERC20 public immutable settlementAsset;
    mapping(bytes32 disbursementRef => bool used) public usedDisbursementReference;

    error InvalidAddress();
    error InvalidAmount();
    error DuplicateReference(bytes32 disbursementRef);
    error NativeAssetRejected();

    event TreasuryDisbursed(
        bytes32 indexed disbursementRef,
        SpendCategory indexed category,
        address indexed recipient,
        uint256 amount
    );

    constructor(IERC20 asset, address admin, address disburser) {
        if (address(asset) == address(0) || admin == address(0) || disburser == address(0)) {
            revert InvalidAddress();
        }
        settlementAsset = asset;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(DISBURSER_ROLE, disburser);
    }

    function disburse(
        bytes32 disbursementRef,
        SpendCategory category,
        address recipient,
        uint256 amount
    ) external onlyRole(DISBURSER_ROLE) {
        if (disbursementRef == bytes32(0)) revert DuplicateReference(disbursementRef);
        if (usedDisbursementReference[disbursementRef]) revert DuplicateReference(disbursementRef);
        if (recipient == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();

        usedDisbursementReference[disbursementRef] = true;
        settlementAsset.safeTransfer(recipient, amount);
        emit TreasuryDisbursed(disbursementRef, category, recipient, amount);
    }

    function assetBalance() external view returns (uint256) {
        return settlementAsset.balanceOf(address(this));
    }

    receive() external payable {
        revert NativeAssetRejected();
    }
}
