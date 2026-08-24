// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {CreatorFirstCreatorRegistry} from "./CreatorFirstCreatorRegistry.sol";
import {ICreatorInitialRegistration} from "./ICreatorInitialRegistration.sol";

/// @notice Testnet-only adapter from a canonical bytes32 scope to the current
///         uint256 self-declared creator registry. It is not production identity verification.
contract CreatorFirstCreatorRegistrationAdapter is AccessControl, ICreatorInitialRegistration {
    bytes32 public constant MAPPER_ROLE = keccak256("MAPPER_ROLE");
    string public constant TESTNET_NOTICE = "TESTNET ONLY - SELF-DECLARED CREATOR REGISTRATION TIME";

    CreatorFirstCreatorRegistry public immutable registry;
    uint64 public registryVersion = 1;
    mapping(bytes32 creatorScopeId => uint256 creatorId) public creatorIdByScope;

    error InvalidAddress();
    error InvalidCreatorScope();
    error CreatorRegistrationMissing(uint256 creatorId);

    event CreatorScopeLinked(bytes32 indexed creatorScopeId, uint256 indexed creatorId, uint64 registryVersion);

    constructor(address admin, CreatorFirstCreatorRegistry registryAddress) {
        if (admin == address(0) || address(registryAddress) == address(0)) revert InvalidAddress();
        registry = registryAddress;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MAPPER_ROLE, admin);
    }

    function linkCreatorScope(bytes32 creatorScopeId, uint256 creatorId) external onlyRole(MAPPER_ROLE) {
        if (creatorScopeId == bytes32(0)) revert InvalidCreatorScope();
        (,,, uint64 registeredAt,,) = registry.creators(creatorId);
        if (registeredAt == 0) revert CreatorRegistrationMissing(creatorId);
        creatorIdByScope[creatorScopeId] = creatorId;
        emit CreatorScopeLinked(creatorScopeId, creatorId, registryVersion);
    }

    function initialRegistration(bytes32 creatorScopeId)
        external
        view
        returns (uint64 registeredAt, bool current, uint64 version)
    {
        uint256 creatorId = creatorIdByScope[creatorScopeId];
        if (creatorId == 0) return (0, false, registryVersion);
        (,,, registeredAt,, current) = registry.creators(creatorId);
        return (registeredAt, current, registryVersion);
    }
}
