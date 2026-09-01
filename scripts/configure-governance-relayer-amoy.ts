import { network } from "hardhat";
import { formatEther, getAddress, parseAbi, parseEther } from "viem";

const governor = getAddress(process.env.GOVERNOR_ADDRESS ?? "");
const relayer = getAddress(process.env.GOVERNANCE_RELAYER_ADDRESS ?? "");
const targetBalance = parseEther(process.env.GOVERNANCE_RELAYER_TARGET_POL ?? "0.05");
const confirmations = Number(process.env.GOVERNANCE_RELAYER_CONFIRMATIONS ?? "2");
const abi = parseAbi([
  "function RELAYER_ROLE() view returns (bytes32)",
  "function hasRole(bytes32 role,address account) view returns (bool)",
  "function grantRole(bytes32 role,address account)",
]);
const { viem } = await network.create();
const [deployer] = await viem.getWalletClients();
const publicClient = await viem.getPublicClient();
const role = await publicClient.readContract({ address: governor, abi, functionName: "RELAYER_ROLE" });
const hasRole = await publicClient.readContract({ address: governor, abi, functionName: "hasRole", args: [role, relayer] });
if (!hasRole) {
  const hash = await deployer.writeContract({ address: governor, abi, functionName: "grantRole", args: [role, relayer], gasPrice: 50_000_000_000n });
  const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations });
  if (receipt.status !== "success") throw new Error(`Governance RELAYER_ROLE grant reverted: ${hash}`);
  console.log(`Governance RELAYER_ROLE granted: ${hash}`);
}
const balance = await publicClient.getBalance({ address: relayer });
if (balance < targetBalance) {
  const value = targetBalance - balance;
  const hash = await deployer.sendTransaction({ to: relayer, value, gas: 25_000n, gasPrice: 50_000_000_000n });
  const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations });
  if (receipt.status !== "success") throw new Error(`Governance relayer funding reverted: ${hash}`);
  console.log(`Governance relayer funded: ${formatEther(value)} POL`);
  console.log(`Funding transaction: ${hash}`);
} else console.log(`Governance relayer already funded: ${formatEther(balance)} POL`);
