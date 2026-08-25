import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const DEFAULT_GOVERNOR = "0x640711f1C249F8F6e8921E01060c99ccc6D72B95";
const DEFAULT_SUBSCRIPTION = "0x7bEeD194032a8D655cF72E61889896eef97F3d90";
const DEFAULT_CREATOR_REGISTRY = "0x5676d34d7C41849311b99932d8272af58b63e6E9";

export default buildModule("TestnetLegislatorRegistrationAdapterSepolia", (m) => {
  const governorAddress = m.getParameter("governor", DEFAULT_GOVERNOR);
  const subscriptionAddress = m.getParameter("subscription", DEFAULT_SUBSCRIPTION);
  const creatorRegistryAddress = m.getParameter("creatorRegistry", DEFAULT_CREATOR_REGISTRY);

  const governor = m.contractAt("CreatorFirstBicameralGovernor", governorAddress, {
    id: "CreatorFirstBicameralGovernorV2",
  });
  const adapter = m.contract("CreatorFirstTestnetLegislatorRegistrationAdapter", [
    governorAddress,
    subscriptionAddress,
    creatorRegistryAddress,
  ]);
  const registrarRole = m.staticCall(governor, "REGISTRAR_ROLE");
  m.call(governor, "grantRole", [registrarRole, adapter], {
    id: "GrantLegislatorAdapterRegistrarRole",
  });

  return { governor, adapter };
});
