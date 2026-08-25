import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const DEFAULT_GOVERNOR = "0x640711f1C249F8F6e8921E01060c99ccc6D72B95";
const SESSION_RULE_HASH = "0x7c7d4b67883b80f114dd64b09399c0d66c1c7daf6951f9fcb658a8bc41ff2b55";
const STARTS_AT = 1_788_244_104n; // 2026-09-01T06:28:24Z
const ENDS_AT = 1_790_836_104n; // 2026-10-01T06:28:24Z

export default buildModule("TestnetGovernanceSessionOneSepolia", (m) => {
  const governorAddress = m.getParameter("governor", DEFAULT_GOVERNOR);
  const governor = m.contractAt("CreatorFirstBicameralGovernor", governorAddress, {
    id: "CreatorFirstBicameralGovernorV2",
  });
  const createSession = m.call(governor, "createSession", [
    SESSION_RULE_HASH,
    STARTS_AT,
    ENDS_AT,
    25,
    1,
    1,
  ], {
    id: "CreatePublicDemoSessionOne",
  });

  return { governor, createSession };
});
