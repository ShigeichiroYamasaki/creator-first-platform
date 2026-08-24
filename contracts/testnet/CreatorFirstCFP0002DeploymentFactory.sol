// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ICreatorInitialRegistration} from "./ICreatorInitialRegistration.sol";

/// @notice Testnet policy artifact for CFP-0002. It classifies time only and
///         does not mint an SBT or grant a service, financial or governance right.
contract CreatorFirstCFP0002EarlySupporterPolicy {
    uint64 public constant WINDOW_SECONDS = 365 days;

    ICreatorInitialRegistration public immutable creatorRegistration;
    bytes32 public immutable cfpContentHash;
    bytes32 public immutable specificationHash;

    error InvalidAddress();
    error InvalidHash();
    error InvalidCreatorRegistration();
    error InvalidRegistrationOrder();

    constructor(
        ICreatorInitialRegistration registrationSource,
        bytes32 approvedCfpContentHash,
        bytes32 approvedSpecificationHash
    ) {
        if (address(registrationSource) == address(0)) revert InvalidAddress();
        if (approvedCfpContentHash == bytes32(0) || approvedSpecificationHash == bytes32(0)) {
            revert InvalidHash();
        }
        creatorRegistration = registrationSource;
        cfpContentHash = approvedCfpContentHash;
        specificationHash = approvedSpecificationHash;
    }

    function qualifiesAt(bytes32 creatorScopeId, uint64 supporterRegisteredAt) public view returns (bool) {
        (uint64 creatorRegisteredAt, bool current,) = creatorRegistration.initialRegistration(creatorScopeId);
        if (!current || creatorRegisteredAt == 0) revert InvalidCreatorRegistration();
        if (supporterRegisteredAt < creatorRegisteredAt) revert InvalidRegistrationOrder();
        return uint256(supporterRegisteredAt) < uint256(creatorRegisteredAt) + uint256(WINDOW_SECONDS);
    }

    function qualifiesNow(bytes32 creatorScopeId) external view returns (bool) {
        return qualifiesAt(creatorScopeId, uint64(block.timestamp));
    }
}

/// @notice The approved Governor is the only deployer. A proposal binds exact
///         calldata to this factory, so no policy code is created before execution.
contract CreatorFirstCFP0002DeploymentFactory {
    address public immutable governor;
    mapping(bytes32 deploymentSalt => address policy) public deployments;

    error Unauthorized();
    error InvalidAddress();
    error AlreadyDeployed(bytes32 deploymentSalt, address policy);

    event CFP0002PolicyDeployed(
        bytes32 indexed deploymentSalt,
        address indexed policy,
        address indexed registrationSource,
        bytes32 cfpContentHash,
        bytes32 specificationHash
    );

    constructor(address governorAddress) {
        if (governorAddress == address(0)) revert InvalidAddress();
        governor = governorAddress;
    }

    function deployPolicy(
        bytes32 deploymentSalt,
        ICreatorInitialRegistration registrationSource,
        bytes32 cfpContentHash,
        bytes32 specificationHash
    ) external returns (address policy) {
        if (msg.sender != governor) revert Unauthorized();
        if (address(registrationSource) == address(0)) revert InvalidAddress();
        address existing = deployments[deploymentSalt];
        if (existing != address(0)) revert AlreadyDeployed(deploymentSalt, existing);
        policy = address(
            new CreatorFirstCFP0002EarlySupporterPolicy{salt: deploymentSalt}(
                registrationSource,
                cfpContentHash,
                specificationHash
            )
        );
        deployments[deploymentSalt] = policy;
        emit CFP0002PolicyDeployed(
            deploymentSalt,
            policy,
            address(registrationSource),
            cfpContentHash,
            specificationHash
        );
    }

    function predictPolicyAddress(
        bytes32 deploymentSalt,
        ICreatorInitialRegistration registrationSource,
        bytes32 cfpContentHash,
        bytes32 specificationHash
    ) external view returns (address) {
        bytes memory creationCode = abi.encodePacked(
            type(CreatorFirstCFP0002EarlySupporterPolicy).creationCode,
            abi.encode(registrationSource, cfpContentHash, specificationHash)
        );
        bytes32 digest = keccak256(
            abi.encodePacked(bytes1(0xff), address(this), deploymentSalt, keccak256(creationCode))
        );
        return address(uint160(uint256(digest)));
    }
}
