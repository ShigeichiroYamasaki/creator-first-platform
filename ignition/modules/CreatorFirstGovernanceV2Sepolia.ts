import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("CreatorFirstGovernanceV2Sepolia", (m) => {
  const deployer = m.getAccount(0);
  const parameterDelay = m.getParameter("parameterDelay", 60n);
  const upgradeDelay = m.getParameter("upgradeDelay", 5n * 60n);
  const constitutionalDelay = m.getParameter("constitutionalDelay", 15n * 60n);
  const executionWindow = m.getParameter("executionWindow", 7n * 24n * 60n * 60n);

  // Testnet bootstrap only. Separate registrar, reviewer and guardian roles
  // before any broader public exercise; production must use reviewed controls.
  const governor = m.contract("CreatorFirstBicameralGovernor", [
    deployer,
    deployer,
    deployer,
    deployer,
    11_155_111n,
    parameterDelay,
    upgradeDelay,
    constitutionalDelay,
    executionWindow,
  ]);
  const governedPolicy = m.contract("CreatorFirstGovernedPolicy", [
    governor,
    30,
    100,
  ]);

  return { governor, governedPolicy };
});
