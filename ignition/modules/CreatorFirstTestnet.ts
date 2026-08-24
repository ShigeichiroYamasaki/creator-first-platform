import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

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

  const initialMockSupply = m.getParameter(
    "initialMockSupply",
    1_000_000n * ONE_TOKEN,
  );
  const monthlyPrice = m.getParameter("monthlyPrice", 1_000n * ONE_TOKEN);
  const monthlyDuration = m.getParameter("monthlyDuration", 30n * 24n * 60n * 60n);
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
  const bicameralGovernor = m.contract("CreatorFirstBicameralGovernor", [
    admin,
    governanceRegistrar,
    governanceReviewer,
    governanceGuardian,
    11_155_111n,
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

  return {
    mockJPYC,
    treasury,
    subscription,
    creatorRegistry,
    supporterImplementation,
    supporterProxy,
    supporterSBT,
    bicameralGovernor,
    governedPolicy,
  };
});
