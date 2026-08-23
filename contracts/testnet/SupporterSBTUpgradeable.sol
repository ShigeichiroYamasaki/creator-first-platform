// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {EIP712Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {IERC5192} from "./IERC5192.sol";

contract SupporterSBTUpgradeable is
    ERC721Upgradeable,
    AccessControlUpgradeable,
    EIP712Upgradeable,
    UUPSUpgradeable,
    IERC5192
{
    bytes32 public constant POLICY_ROLE = keccak256("POLICY_ROLE");
    bytes32 public constant RELAYER_ROLE = keccak256("RELAYER_ROLE");
    bytes32 public constant REVOKER_ROLE = keccak256("REVOKER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant METADATA_ROLE = keccak256("METADATA_ROLE");

    bytes32 public constant SUPPORT_INTENT_TYPEHASH = keccak256(
        "SupportIntent(bytes32 creatorId,address holder,uint256 nonce,uint256 deadline,bytes32 consentVersion)"
    );

    enum Tier {
        NONE,
        SUPPORTER,
        EARLY_SUPPORTER
    }

    struct EarlyPolicy {
        uint64 earlyUntil;
        uint32 maxEarlySupporters;
        uint32 earlyIssued;
        uint64 version;
        bool active;
    }

    struct Credential {
        bytes32 creatorId;
        Tier tier;
        uint64 policyVersion;
        uint64 issuedAt;
        bool active;
    }

    uint256 private _nextTokenId;
    string private _supporterMetadataUri;
    string private _earlyMetadataUri;

    mapping(bytes32 creatorId => EarlyPolicy policy) public earlyPolicies;
    mapping(uint256 tokenId => Credential credential) public credentials;
    mapping(bytes32 creatorId => mapping(address holder => uint256 tokenId)) public activeTokenOf;
    mapping(address holder => uint256 nonce) public nonces;

    error InvalidAddress();
    error InvalidCreator();
    error InvalidPolicy();
    error SignatureExpired(uint256 deadline);
    error InvalidNonce(uint256 expected, uint256 provided);
    error InvalidSignature(address recovered, address holder);
    error CredentialAlreadyActive(bytes32 creatorId, address holder);
    error CredentialNotActive(uint256 tokenId);
    error Soulbound();

    event EarlyPolicyUpdated(
        bytes32 indexed creatorId,
        uint64 indexed version,
        uint64 earlyUntil,
        uint32 maxEarlySupporters,
        bool active
    );
    event SupporterRegistered(
        uint256 indexed tokenId,
        bytes32 indexed creatorId,
        address indexed holder,
        Tier tier,
        uint64 policyVersion,
        bytes32 consentVersion
    );
    event SupporterCredentialRevoked(uint256 indexed tokenId, bytes32 indexed creatorId, address indexed holder);
    event SupporterCredentialBurned(uint256 indexed tokenId, bytes32 indexed creatorId, address indexed holder);
    event MetadataUrisUpdated(string supporterMetadataUri, string earlyMetadataUri);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address admin,
        address policyManager,
        address relayer,
        address revoker,
        address upgrader,
        string calldata supporterMetadataUri,
        string calldata earlyMetadataUri
    ) external initializer {
        if (
            admin == address(0) || policyManager == address(0) || relayer == address(0)
                || revoker == address(0) || upgrader == address(0)
        ) revert InvalidAddress();

        __ERC721_init("Creator First Supporter SBT", "CFSBT");
        __AccessControl_init();
        __EIP712_init("Creator First Supporter SBT", "1");

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(POLICY_ROLE, policyManager);
        _grantRole(RELAYER_ROLE, relayer);
        _grantRole(REVOKER_ROLE, revoker);
        _grantRole(UPGRADER_ROLE, upgrader);
        _grantRole(METADATA_ROLE, admin);

        _supporterMetadataUri = supporterMetadataUri;
        _earlyMetadataUri = earlyMetadataUri;
        _nextTokenId = 1;
    }

    function setEarlyPolicy(
        bytes32 creatorId,
        uint64 earlyUntil,
        uint32 maxEarlySupporters,
        bool active
    ) external onlyRole(POLICY_ROLE) {
        if (creatorId == bytes32(0)) revert InvalidCreator();
        if (active && (earlyUntil <= block.timestamp || maxEarlySupporters == 0)) revert InvalidPolicy();

        EarlyPolicy storage policy = earlyPolicies[creatorId];
        policy.earlyUntil = earlyUntil;
        policy.maxEarlySupporters = maxEarlySupporters;
        policy.version += 1;
        policy.active = active;
        emit EarlyPolicyUpdated(creatorId, policy.version, earlyUntil, maxEarlySupporters, active);
    }

    function registerSupporterWithSignature(
        bytes32 creatorId,
        address holder,
        uint256 nonce,
        uint256 deadline,
        bytes32 consentVersion,
        bytes calldata signature
    ) external onlyRole(RELAYER_ROLE) returns (uint256 tokenId, Tier tier) {
        if (creatorId == bytes32(0)) revert InvalidCreator();
        if (holder == address(0)) revert InvalidAddress();
        if (block.timestamp > deadline) revert SignatureExpired(deadline);
        uint256 expectedNonce = nonces[holder];
        if (nonce != expectedNonce) revert InvalidNonce(expectedNonce, nonce);
        if (activeTokenOf[creatorId][holder] != 0) revert CredentialAlreadyActive(creatorId, holder);

        bytes32 structHash = keccak256(
            abi.encode(SUPPORT_INTENT_TYPEHASH, creatorId, holder, nonce, deadline, consentVersion)
        );
        address recovered = ECDSA.recover(_hashTypedDataV4(structHash), signature);
        if (recovered != holder) revert InvalidSignature(recovered, holder);

        nonces[holder] = expectedNonce + 1;
        EarlyPolicy storage policy = earlyPolicies[creatorId];
        bool isEarly = policy.active && block.timestamp <= policy.earlyUntil
            && policy.earlyIssued < policy.maxEarlySupporters;
        tier = isEarly ? Tier.EARLY_SUPPORTER : Tier.SUPPORTER;
        if (isEarly) policy.earlyIssued += 1;

        tokenId = _nextTokenId++;
        credentials[tokenId] = Credential({
            creatorId: creatorId,
            tier: tier,
            policyVersion: policy.version,
            issuedAt: uint64(block.timestamp),
            active: true
        });
        activeTokenOf[creatorId][holder] = tokenId;
        _safeMint(holder, tokenId);

        emit Locked(tokenId);
        emit SupporterRegistered(tokenId, creatorId, holder, tier, policy.version, consentVersion);
    }

    function revoke(uint256 tokenId) external onlyRole(REVOKER_ROLE) {
        Credential storage credential = credentials[tokenId];
        if (!credential.active) revert CredentialNotActive(tokenId);
        address holder = ownerOf(tokenId);
        credential.active = false;
        activeTokenOf[credential.creatorId][holder] = 0;
        emit SupporterCredentialRevoked(tokenId, credential.creatorId, holder);
    }

    function burn(uint256 tokenId) external {
        address holder = ownerOf(tokenId);
        if (msg.sender != holder && !hasRole(REVOKER_ROLE, msg.sender)) revert InvalidAddress();
        Credential storage credential = credentials[tokenId];
        if (credential.active) {
            credential.active = false;
            activeTokenOf[credential.creatorId][holder] = 0;
        }
        _burn(tokenId);
        emit SupporterCredentialBurned(tokenId, credential.creatorId, holder);
    }

    function getSupporterTier(bytes32 creatorId, address holder) external view returns (Tier) {
        uint256 tokenId = activeTokenOf[creatorId][holder];
        return tokenId == 0 ? Tier.NONE : credentials[tokenId].tier;
    }

    function locked(uint256 tokenId) external view returns (bool) {
        ownerOf(tokenId);
        return true;
    }

    function setMetadataUris(string calldata supporterMetadataUri, string calldata earlyMetadataUri)
        external
        onlyRole(METADATA_ROLE)
    {
        _supporterMetadataUri = supporterMetadataUri;
        _earlyMetadataUri = earlyMetadataUri;
        emit MetadataUrisUpdated(supporterMetadataUri, earlyMetadataUri);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        ownerOf(tokenId);
        return credentials[tokenId].tier == Tier.EARLY_SUPPORTER ? _earlyMetadataUri : _supporterMetadataUri;
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Upgradeable, AccessControlUpgradeable)
        returns (bool)
    {
        return interfaceId == type(IERC5192).interfaceId || super.supportsInterface(interfaceId);
    }

    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address previousOwner)
    {
        previousOwner = _ownerOf(tokenId);
        if (previousOwner != address(0) && to != address(0)) revert Soulbound();
        return super._update(to, tokenId, auth);
    }

    function _authorizeUpgrade(address) internal override onlyRole(UPGRADER_ROLE) {}
}
