import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const DEPLOYED_SUPPORTER_SBT = "0x2D01B0c19Ce5572dFc2Aa90f4dE6256720E30923";

export default buildModule("SupporterRegistrationAdapterSepolia", (m) => {
  // This isolated module deliberately deploys only the public testnet adapter.
  // The account running it must still hold DEFAULT_ADMIN_ROLE on the existing SBT.
  const supporterSbtAddress = m.getParameter("supporterSbt", DEPLOYED_SUPPORTER_SBT);
  const supporterSbt = m.contractAt("SupporterSBTUpgradeable", supporterSbtAddress);
  const supporterRegistrationAdapter = m.contract("CreatorFirstSupporterRegistrationAdapter", [
    supporterSbtAddress,
  ]);
  const relayerRole = m.staticCall(supporterSbt, "RELAYER_ROLE");
  m.call(supporterSbt, "grantRole", [relayerRole, supporterRegistrationAdapter], {
    id: "GrantSupporterRegistrationAdapterRelayerRole",
  });

  return { supporterRegistrationAdapter };
});
