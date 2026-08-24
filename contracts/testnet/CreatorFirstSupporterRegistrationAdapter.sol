// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface ISupporterSBTRegistration {
    function registerSupporterWithSignature(
        bytes32 creatorId,
        address holder,
        uint256 nonce,
        uint256 deadline,
        bytes32 consentVersion,
        bytes calldata signature
    ) external returns (uint256 tokenId, uint8 tier);
}

/// @notice Testnet-only public entry point for a holder-funded Supporter SBT registration.
/// @dev This adapter must receive RELAYER_ROLE on the Supporter SBT. It never accepts an
///      arbitrary holder: msg.sender is always the credential holder and signed subject.
contract CreatorFirstSupporterRegistrationAdapter {
    ISupporterSBTRegistration public immutable supporterSbt;

    error InvalidSupporterSbt();
    error DeadlineTooFar(uint256 deadline);

    event SelfRegistrationForwarded(
        bytes32 indexed creatorId,
        address indexed holder,
        uint256 indexed tokenId,
        uint8 tier,
        bytes32 consentVersion
    );

    constructor(ISupporterSBTRegistration supporterSbt_) {
        if (address(supporterSbt_) == address(0)) revert InvalidSupporterSbt();
        supporterSbt = supporterSbt_;
    }

    function registerSelf(
        bytes32 creatorId,
        uint256 nonce,
        uint256 deadline,
        bytes32 consentVersion,
        bytes calldata signature
    ) external returns (uint256 tokenId, uint8 tier) {
        // Keep browser-generated authorizations short-lived. The SBT contract separately
        // rejects expired signatures and validates creator, nonce and EIP-712 signer.
        if (deadline > block.timestamp + 15 minutes) revert DeadlineTooFar(deadline);
        (tokenId, tier) = supporterSbt.registerSupporterWithSignature(
            creatorId,
            msg.sender,
            nonce,
            deadline,
            consentVersion,
            signature
        );
        emit SelfRegistrationForwarded(creatorId, msg.sender, tokenId, tier, consentVersion);
    }
}
