// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice TESTNET ONLY. This token has no monetary value, redemption claim, or
///         exchangeability with any production JPYC product.
contract MockJPYC is ERC20, AccessControl {
    bytes32 public constant FAUCET_ROLE = keccak256("FAUCET_ROLE");
    string public constant TEST_ASSET_NOTICE =
        "TESTNET ONLY - NO VALUE, NO REDEMPTION, NOT PRODUCTION JPYC";

    error NativeAssetRejected();

    constructor(address admin, uint256 initialSupply) ERC20("Mock JPYC (Test Only)", "tJPYC") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(FAUCET_ROLE, admin);
        _mint(admin, initialSupply);
    }

    function faucet(address recipient, uint256 amount) external onlyRole(FAUCET_ROLE) {
        _mint(recipient, amount);
    }

    receive() external payable {
        revert NativeAssetRejected();
    }
}
