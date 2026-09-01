import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("CreatorFirstGovernanceRelayAmoy", (m) => {
  const deployer = m.getAccount(0);
  const subscription = m.getParameter(
    "subscription",
    "0xFFbB494c89cBDDB7F2aeC85E14019f793416F2BD",
  );
  const creatorRegistry = m.getParameter(
    "creatorRegistry",
    "0x7823e12075Ab59DE11eaa1044345906C062bF63c",
  );
  const governanceRelayer = m.getParameter("governanceRelayer");
  const publicDemoRuleHash = m.getParameter(
    "publicDemoRuleHash",
    "0x7c7d4b67883b80f114dd64b09399c0d66c1c7daf6951f9fcb658a8bc41ff2b55",
  );
  const publicDemoStartsAt = m.getParameter("publicDemoStartsAt");
  const publicDemoEndsAt = m.getParameter("publicDemoEndsAt");

  const governor = m.contract("CreatorFirstBicameralGovernor", [
    deployer,
    deployer,
    deployer,
    deployer,
    80_002n,
    60n,
    5n * 60n,
    15n * 60n,
    7n * 24n * 60n * 60n,
  ]);
  const governedPolicy = m.contract("CreatorFirstGovernedPolicy", [governor, 30, 100]);
  const legislatorRegistrationAdapter = m.contract(
    "CreatorFirstTestnetLegislatorRegistrationAdapter",
    [governor, subscription, creatorRegistry],
  );
  const cfp0002DeploymentFactory = m.contract(
    "CreatorFirstCFP0002DeploymentFactory",
    [governor],
  );

  const registrarRole = m.staticCall(governor, "REGISTRAR_ROLE");
  m.call(governor, "grantRole", [registrarRole, legislatorRegistrationAdapter], {
    id: "GrantLegislatorRegistrationAdapterRegistrarRole",
  });
  const relayerRole = m.staticCall(governor, "RELAYER_ROLE");
  m.call(governor, "grantRole", [relayerRole, governanceRelayer], {
    id: "GrantGovernanceRelayerRole",
  });
  m.call(governor, "createSession", [
    publicDemoRuleHash,
    publicDemoStartsAt,
    publicDemoEndsAt,
    25,
    1,
    1,
  ], { id: "CreatePublicDemoSessionOne" });

  return {
    governor,
    governedPolicy,
    legislatorRegistrationAdapter,
    cfp0002DeploymentFactory,
  };
});
