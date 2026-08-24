// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ITransparentZKVerifier} from "./ITransparentZKVerifier.sol";

/// @notice Testnet-only proof-envelope and verifier-profile registry.
///         It validates integration boundaries, not cryptographic production readiness.
contract CreatorFirstTransparentZKRegistry is AccessControl, Pausable {
    bytes32 public constant POLICY_ROLE = keccak256("POLICY_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    string public constant TESTNET_NOTICE =
        "TESTNET ONLY - MOCK PROOFS DO NOT ESTABLISH USAGE, RIGHTS, ELIGIBILITY OR DISTRIBUTION";

    struct VerifierProfile {
        address verifier;
        bytes32 programHash;
        bytes32 verifierType;
        uint64 registeredAt;
        bool active;
        bool testnetMock;
    }

    struct VerificationReceipt {
        bytes32 profileId;
        bytes32 publicInputsHash;
        bytes32 proofHash;
        address submitter;
        uint64 verifiedAt;
    }

    mapping(bytes32 profileId => VerifierProfile profile) public verifierProfiles;
    mapping(bytes32 receiptId => VerificationReceipt receipt) public receipts;

    error InvalidAddress();
    error InvalidIdentifier();
    error ProfileAlreadyExists(bytes32 profileId);
    error ProfileNotActive(bytes32 profileId);
    error ProductionVerifierRejected(address verifier);
    error ReceiptAlreadyExists(bytes32 receiptId);
    error MockProofRejected(bytes32 profileId);
    error NativeAssetRejected();

    event VerifierProfileRegistered(
        bytes32 indexed profileId,
        address indexed verifier,
        bytes32 indexed programHash,
        bytes32 verifierType,
        bool testnetMock
    );
    event VerifierProfileDeprecated(bytes32 indexed profileId);
    event MockProofReceiptRecorded(
        bytes32 indexed receiptId,
        bytes32 indexed profileId,
        bytes32 indexed externalStatementId,
        bytes32 publicInputsHash,
        bytes32 proofHash,
        address submitter
    );

    constructor(address admin, address policyManager, address pauser) {
        if (admin == address(0) || policyManager == address(0) || pauser == address(0)) {
            revert InvalidAddress();
        }
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(POLICY_ROLE, policyManager);
        _grantRole(PAUSER_ROLE, pauser);
    }

    function registerMockProfile(bytes32 profileId, address verifier, bytes32 programHash)
        external
        onlyRole(POLICY_ROLE)
    {
        if (profileId == bytes32(0) || programHash == bytes32(0)) revert InvalidIdentifier();
        if (verifier == address(0)) revert InvalidAddress();
        if (verifierProfiles[profileId].verifier != address(0)) revert ProfileAlreadyExists(profileId);

        ITransparentZKVerifier candidate = ITransparentZKVerifier(verifier);
        if (!candidate.isTestnetMock()) revert ProductionVerifierRejected(verifier);
        bytes32 verifierType_ = candidate.verifierType();
        verifierProfiles[profileId] = VerifierProfile({
            verifier: verifier,
            programHash: programHash,
            verifierType: verifierType_,
            registeredAt: uint64(block.timestamp),
            active: true,
            testnetMock: true
        });
        emit VerifierProfileRegistered(profileId, verifier, programHash, verifierType_, true);
    }

    function deprecateProfile(bytes32 profileId) external onlyRole(POLICY_ROLE) {
        VerifierProfile storage profile = verifierProfiles[profileId];
        if (!profile.active) revert ProfileNotActive(profileId);
        profile.active = false;
        emit VerifierProfileDeprecated(profileId);
    }

    function verifyAndRecord(
        bytes32 profileId,
        bytes32 externalStatementId,
        bytes32 publicInputsHash,
        bytes calldata proof
    ) external whenNotPaused returns (bytes32 receiptId) {
        if (externalStatementId == bytes32(0) || publicInputsHash == bytes32(0)) {
            revert InvalidIdentifier();
        }
        VerifierProfile memory profile = verifierProfiles[profileId];
        if (!profile.active) revert ProfileNotActive(profileId);

        receiptId = keccak256(
            abi.encode(block.chainid, address(this), profileId, externalStatementId, publicInputsHash)
        );
        if (receipts[receiptId].verifiedAt != 0) revert ReceiptAlreadyExists(receiptId);
        if (
            !ITransparentZKVerifier(profile.verifier).verifyProof(
                profile.programHash, publicInputsHash, proof
            )
        ) revert MockProofRejected(profileId);

        bytes32 proofHash = keccak256(proof);
        receipts[receiptId] = VerificationReceipt({
            profileId: profileId,
            publicInputsHash: publicInputsHash,
            proofHash: proofHash,
            submitter: msg.sender,
            verifiedAt: uint64(block.timestamp)
        });
        emit MockProofReceiptRecorded(
            receiptId,
            profileId,
            externalStatementId,
            publicInputsHash,
            proofHash,
            msg.sender
        );
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    receive() external payable {
        revert NativeAssetRejected();
    }
}
