// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice TESTNET ONLY. This token has no monetary value, redemption claim, or
///         exchangeability with any production JPYC product.
contract MockJPYC is ERC20, AccessControl {
    bytes32 public constant FAUCET_ROLE = keccak256("FAUCET_ROLE");
    uint256 public constant CLAIM_AMOUNT = 2_000 ether;
    string public constant TEST_ASSET_NOTICE =
        "TESTNET ONLY - NO VALUE, NO REDEMPTION, NOT PRODUCTION JPYC";

    error NativeAssetRejected();
    error TestTokensAlreadyClaimed(address account);

    mapping(address account => bool claimed) public hasClaimed;

    event TestTokensClaimed(address indexed account, uint256 amount);

    constructor(address admin, uint256 initialSupply) ERC20("Mock JPYC (Test Only)", "tJPYC") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(FAUCET_ROLE, admin);
        _mint(admin, initialSupply);
    }

    function faucet(address recipient, uint256 amount) external onlyRole(FAUCET_ROLE) {
        _mint(recipient, amount);
    }

    /// @notice Gives each testnet address one fixed demo allocation. This
    ///         public faucet is intentionally unavailable in production.
    function claim() external {
        if (hasClaimed[msg.sender]) revert TestTokensAlreadyClaimed(msg.sender);
        hasClaimed[msg.sender] = true;
        _mint(msg.sender, CLAIM_AMOUNT);
        emit TestTokensClaimed(msg.sender, CLAIM_AMOUNT);
    }

    receive() external payable {
        revert NativeAssetRejected();
    }
}
