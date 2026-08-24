// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ITransparentZKVerifier} from "./ITransparentZKVerifier.sol";

/// @notice Interface-only test double. It does not implement zero knowledge,
///         soundness or a production proof system.
contract CreatorFirstTransparentZKMockVerifier is ITransparentZKVerifier {
    bytes32 public constant MOCK_DOMAIN = keccak256("CFP_TRANSPARENT_ZK_TESTNET_MOCK_V1");
    bytes32 public constant VERIFIER_TYPE = keccak256("TESTNET_MOCK_NOT_CRYPTOGRAPHIC_ZK");
    string public constant TESTNET_NOTICE =
        "TESTNET MOCK ONLY - NOT A ZERO-KNOWLEDGE OR PRODUCTION VERIFIER";

    function verifyProof(bytes32 programHash, bytes32 publicInputsHash, bytes calldata proof)
        external
        pure
        returns (bool)
    {
        if (proof.length != 32) return false;
        bytes32 suppliedDigest = abi.decode(proof, (bytes32));
        bytes32 expectedDigest = keccak256(abi.encode(MOCK_DOMAIN, programHash, publicInputsHash));
        return suppliedDigest == expectedDigest;
    }

    function verifierType() external pure returns (bytes32) {
        return VERIFIER_TYPE;
    }

    function isTestnetMock() external pure returns (bool) {
        return true;
    }
}
