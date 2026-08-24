// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface ITransparentZKVerifier {
    function verifyProof(bytes32 programHash, bytes32 publicInputsHash, bytes calldata proof)
        external
        view
        returns (bool);

    function verifierType() external pure returns (bytes32);

    function isTestnetMock() external pure returns (bool);
}
