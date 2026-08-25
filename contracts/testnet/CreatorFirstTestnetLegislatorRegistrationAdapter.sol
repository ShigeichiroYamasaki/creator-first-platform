// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface ITestnetBicameralGovernorRegistrar {
    function registerMember(uint256 sessionId, address member, uint8 house) external;
}

interface ITestnetSubscriptionEligibility {
    function isActive(address subscriber) external view returns (bool);
}

interface ITestnetCreatorEligibility {
    function creatorIdByAccount(address account) external view returns (uint256);

    function creators(uint256 creatorId)
        external
        view
        returns (
            address account,
            address payoutAddress,
            bytes32 profileCommitment,
            uint64 registeredAt,
            uint32 releaseCount,
            bool active
        );
}

/// @notice Testnet-only self-registration adapter for a configured governance session.
/// @dev Subscription and creator-registry state are test fixtures, not production
///      personhood, creator verification, or sortition evidence.
contract CreatorFirstTestnetLegislatorRegistrationAdapter {
    uint8 private constant CREATOR_HOUSE = 1;
    uint8 private constant USER_HOUSE = 2;

    ITestnetBicameralGovernorRegistrar public immutable governor;
    ITestnetSubscriptionEligibility public immutable subscription;
    ITestnetCreatorEligibility public immutable creatorRegistry;

    error InvalidAddress();
    error UserNotEligible(address account);
    error CreatorNotEligible(address account);

    event TestnetLegislatorRegistered(uint256 indexed sessionId, address indexed member, uint8 indexed house);

    constructor(address governor_, address subscription_, address creatorRegistry_) {
        if (governor_ == address(0) || subscription_ == address(0) || creatorRegistry_ == address(0)) {
            revert InvalidAddress();
        }
        governor = ITestnetBicameralGovernorRegistrar(governor_);
        subscription = ITestnetSubscriptionEligibility(subscription_);
        creatorRegistry = ITestnetCreatorEligibility(creatorRegistry_);
    }

    function registerAsUser(uint256 sessionId) external {
        if (!subscription.isActive(msg.sender)) revert UserNotEligible(msg.sender);
        governor.registerMember(sessionId, msg.sender, USER_HOUSE);
        emit TestnetLegislatorRegistered(sessionId, msg.sender, USER_HOUSE);
    }

    function registerAsCreator(uint256 sessionId) external {
        uint256 creatorId = creatorRegistry.creatorIdByAccount(msg.sender);
        if (creatorId == 0) revert CreatorNotEligible(msg.sender);
        (address account,,,,, bool active) = creatorRegistry.creators(creatorId);
        if (account != msg.sender || !active) revert CreatorNotEligible(msg.sender);
        governor.registerMember(sessionId, msg.sender, CREATOR_HOUSE);
        emit TestnetLegislatorRegistered(sessionId, msg.sender, CREATOR_HOUSE);
    }
}
