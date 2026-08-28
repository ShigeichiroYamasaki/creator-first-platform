import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { keccak256, stringToHex } from "viem";

const ONE_TOKEN = 10n ** 18n;

export default buildModule("CreatorFirstTestnet", (m) => {
  const deployer = m.getAccount(0);
  // The first private demo bootstraps roles to the deployment account. Before
  // any public demo, grant each role to its reviewed operator and revoke the
  // bootstrap grants; production must use multisig/timelock governance.
  const admin = deployer;
  const policyManager = deployer;
  const relayer = deployer;
  const revoker = deployer;
  const upgrader = deployer;
  const treasuryDisburser = deployer;
  const planManager = deployer;
  const governanceRegistrar = deployer;
  const governanceReviewer = deployer;
  const governanceGuardian = deployer;
  const proofPolicyManager = deployer;
  const proofPauser = deployer;

  const initialMockSupply = m.getParameter(
    "initialMockSupply",
    1_000_000n * ONE_TOKEN,
  );
  const monthlyPrice = m.getParameter("monthlyPrice", 1_000n * ONE_TOKEN);
  const monthlyDuration = m.getParameter("monthlyDuration", 30n * 24n * 60n * 60n);
  const initialTestPolFunding = m.getParameter("initialTestPolFunding", 2n * 10n ** 16n);
  const supporterMetadataUri = m.getParameter(
    "supporterMetadataUri",
    "https://shigeichiroyamasaki.github.io/creator-first-platform/sbt/supporter.json",
  );
  const earlyMetadataUri = m.getParameter(
    "earlyMetadataUri",
    "https://shigeichiroyamasaki.github.io/creator-first-platform/sbt/early-supporter.json",
  );
  const governanceParameterDelay = m.getParameter("governanceParameterDelay", 60n);
  const governanceUpgradeDelay = m.getParameter("governanceUpgradeDelay", 5n * 60n);
  const governanceConstitutionalDelay = m.getParameter("governanceConstitutionalDelay", 15n * 60n);
  const governanceExecutionWindow = m.getParameter("governanceExecutionWindow", 7n * 24n * 60n * 60n);
  const publicDemoRuleHash = m.getParameter(
    "publicDemoRuleHash",
    "0x7c7d4b67883b80f114dd64b09399c0d66c1c7daf6951f9fcb658a8bc41ff2b55",
  );
  const publicDemoStartsAt = m.getParameter("publicDemoStartsAt", 1_788_244_104n);
  const publicDemoEndsAt = m.getParameter("publicDemoEndsAt", 1_790_836_104n);

  const mockJPYC = m.contract("MockJPYC", [admin, initialMockSupply]);
  const treasury = m.contract("CreatorFirstTreasury", [
    mockJPYC,
    admin,
    treasuryDisburser,
  ]);
  const subscription = m.contract("CreatorFirstSubscription", [
    mockJPYC,
    treasury,
    admin,
    planManager,
    monthlyPrice,
    monthlyDuration,
  ]);
  const creatorRegistry = m.contract("CreatorFirstCreatorRegistry", [admin]);

  const supporterImplementation = m.contract("SupporterSBTUpgradeable");
  const initializationData = m.encodeFunctionCall(
    supporterImplementation,
    "initialize",
    [
      admin,
      policyManager,
      relayer,
      revoker,
      upgrader,
      supporterMetadataUri,
      earlyMetadataUri,
    ],
  );
  const supporterProxy = m.contract("SupporterSBTProxy", [
    supporterImplementation,
    initializationData,
  ]);
  const supporterSBT = m.contractAt("SupporterSBTUpgradeable", supporterProxy, {
    id: "SupporterSBTProxyInstance",
  });
  const supporterRegistrationAdapter = m.contract("CreatorFirstSupporterRegistrationAdapter", [
    supporterProxy,
  ]);
  const relayerRole = m.staticCall(supporterSBT, "RELAYER_ROLE");
  m.call(supporterSBT, "grantRole", [relayerRole, supporterRegistrationAdapter], {
    id: "GrantSupporterRegistrationAdapterRelayerRole",
  });
  const bicameralGovernor = m.contract("CreatorFirstBicameralGovernor", [
    admin,
    governanceRegistrar,
    governanceReviewer,
    governanceGuardian,
    80_002n,
    governanceParameterDelay,
    governanceUpgradeDelay,
    governanceConstitutionalDelay,
    governanceExecutionWindow,
  ]);
  const governedPolicy = m.contract("CreatorFirstGovernedPolicy", [
    bicameralGovernor,
    30,
    100,
  ]);
  const legislatorRegistrationAdapter = m.contract("CreatorFirstTestnetLegislatorRegistrationAdapter", [
    bicameralGovernor,
    subscription,
    creatorRegistry,
  ]);
  const registrarRole = m.staticCall(bicameralGovernor, "REGISTRAR_ROLE");
  m.call(bicameralGovernor, "grantRole", [registrarRole, legislatorRegistrationAdapter], {
    id: "GrantLegislatorRegistrationAdapterRegistrarRole",
  });
  m.call(bicameralGovernor, "createSession", [
    publicDemoRuleHash,
    publicDemoStartsAt,
    publicDemoEndsAt,
    25,
    1,
    1,
  ], {
    id: "CreatePublicDemoSessionOne",
  });
  const creatorRegistrationAdapter = m.contract("CreatorFirstCreatorRegistrationAdapter", [
    admin,
    creatorRegistry,
  ]);
  const cfp0002DeploymentFactory = m.contract("CreatorFirstCFP0002DeploymentFactory", [
    bicameralGovernor,
  ]);
  const transparentZKMockVerifier = m.contract("CreatorFirstTransparentZKMockVerifier");
  const transparentZKRegistry = m.contract("CreatorFirstTransparentZKRegistry", [
    admin,
    proofPolicyManager,
    proofPauser,
  ]);
  const testnetPolDistributor = m.contract("CreatorFirstTestnetPolDistributor", [
    admin,
    deployer,
    deployer,
  ], { value: initialTestPolFunding });
  const participantRegistry = m.contract("CreatorFirstTestnetParticipantRegistry", [
    admin,
    deployer,
    testnetPolDistributor,
  ]);
  const testPolRegistrarRole = m.staticCall(testnetPolDistributor, "REGISTRAR_ROLE");
  m.call(testnetPolDistributor, "grantRole", [testPolRegistrarRole, participantRegistry], {
    id: "GrantParticipantRegistryTestPolRegistrarRole",
  });
  const transparentZKMockProfileId = keccak256(
    stringToHex("cfp.testnet.transparent-zk.mock.v1"),
  );
  const transparentZKMockProgramHash = keccak256(
    stringToHex("cfp.testnet.usage-snapshot.mock-program.v1"),
  );
  m.call(transparentZKRegistry, "registerMockProfile", [
    transparentZKMockProfileId,
    transparentZKMockVerifier,
    transparentZKMockProgramHash,
  ]);

  return {
    mockJPYC,
    treasury,
    subscription,
    creatorRegistry,
    supporterImplementation,
    supporterProxy,
    supporterSBT,
    supporterRegistrationAdapter,
    bicameralGovernor,
    governedPolicy,
    legislatorRegistrationAdapter,
    creatorRegistrationAdapter,
    cfp0002DeploymentFactory,
    transparentZKMockVerifier,
    transparentZKRegistry,
    testnetPolDistributor,
    participantRegistry,
  };
});
