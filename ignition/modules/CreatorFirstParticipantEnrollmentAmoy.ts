import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("CreatorFirstParticipantEnrollmentAmoy", (m) => {
  const deployer = m.getAccount(0);
  const distributorAddress = m.getParameter(
    "testPolDistributor",
    "0x8a0B3F08EC1Bd4231be92320381a1bAc56D112BE",
  );
  const distributor = m.contractAt("CreatorFirstTestnetPolDistributor", distributorAddress);
  const participantRegistry = m.contract("CreatorFirstTestnetParticipantRegistry", [
    deployer,
    deployer,
    distributor,
  ]);
  const registrarRole = m.staticCall(distributor, "REGISTRAR_ROLE");
  m.call(distributor, "grantRole", [registrarRole, participantRegistry], {
    id: "GrantParticipantRegistryTestPolRegistrarRole",
  });

  return { participantRegistry, distributor };
});
