// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @notice Harmless testnet execution target for bicameral governance demos.
/// @dev This contract does not control production subscriptions, assets or SBTs.
contract CreatorFirstGovernedPolicy {
    address public immutable governor;
    uint32 public earlySupporterWindowDays;
    uint32 public maxEarlySupporters;
    uint64 public version;

    error Unauthorized();
    error InvalidPolicy();

    event DemoPolicyUpdated(uint64 indexed version, uint32 earlySupporterWindowDays, uint32 maxEarlySupporters);

    constructor(address governorAddress, uint32 initialWindowDays, uint32 initialMaxEarlySupporters) {
        if (governorAddress == address(0)) revert Unauthorized();
        governor = governorAddress;
        _setPolicy(initialWindowDays, initialMaxEarlySupporters);
    }

    function setDemoPolicy(uint32 windowDays, uint32 earlySupporterLimit) external {
        if (msg.sender != governor) revert Unauthorized();
        _setPolicy(windowDays, earlySupporterLimit);
    }

    function _setPolicy(uint32 windowDays, uint32 earlySupporterLimit) internal {
        if (windowDays == 0 || windowDays > 365 || earlySupporterLimit == 0 || earlySupporterLimit > 100_000) {
            revert InvalidPolicy();
        }
        earlySupporterWindowDays = windowDays;
        maxEarlySupporters = earlySupporterLimit;
        version += 1;
        emit DemoPolicyUpdated(version, windowDays, earlySupporterLimit);
    }
}
