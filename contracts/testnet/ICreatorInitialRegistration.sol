// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface ICreatorInitialRegistration {
    function initialRegistration(bytes32 creatorScopeId)
        external
        view
        returns (uint64 registeredAt, bool current, uint64 registryVersion);
}
