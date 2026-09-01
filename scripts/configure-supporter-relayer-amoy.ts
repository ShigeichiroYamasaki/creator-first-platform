import { network } from "hardhat";
import { formatEther, getAddress, parseAbi, parseEther } from "viem";

const supporterSbt = getAddress(
  process.env.SUPPORTER_SBT_ADDRESS ?? "0x0406Cf42Ab5d3529ceAe869b6F05A3876379AB18",
);
const relayer = getAddress(process.env.SUPPORTER_RELAYER_ADDRESS ?? "");
const targetBalance = parseEther(process.env.SUPPORTER_RELAYER_TARGET_POL ?? "0.05");
const confirmations = Number(process.env.SUPPORTER_RELAYER_CONFIRMATIONS ?? "2");
const abi = parseAbi([
  "function RELAYER_ROLE() view returns (bytes32)",
  "function hasRole(bytes32 role,address account) view returns (bool)",
  "function grantRole(bytes32 role,address account)",
]);

const { viem } = await network.create();
const [deployer] = await viem.getWalletClients();
const publicClient = await viem.getPublicClient();
const role = await publicClient.readContract({ address: supporterSbt, abi, functionName: "RELAYER_ROLE" });
const alreadyGranted = await publicClient.readContract({
  address: supporterSbt,
  abi,
  functionName: "hasRole",
  args: [role, relayer],
});

if (!alreadyGranted) {
  const hash = await deployer.writeContract({
    address: supporterSbt,
    abi,
    functionName: "grantRole",
    args: [role, relayer],
    gasPrice: 50_000_000_000n,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations });
  if (receipt.status !== "success") throw new Error(`RELAYER_ROLE grant reverted: ${hash}`);
  console.log(`Supporter RELAYER_ROLE granted: ${hash}`);
} else {
  console.log("Supporter RELAYER_ROLE already granted");
}

const currentBalance = await publicClient.getBalance({ address: relayer });
if (currentBalance < targetBalance) {
  const value = targetBalance - currentBalance;
  const hash = await deployer.sendTransaction({
    to: relayer,
    value,
    gas: 25_000n,
    gasPrice: 50_000_000_000n,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations });
  if (receipt.status !== "success") throw new Error(`Supporter relayer funding reverted: ${hash}`);
  console.log(`Supporter relayer funded: ${formatEther(value)} POL`);
  console.log(`Funding transaction: ${hash}`);
} else {
  console.log(`Supporter relayer already funded: ${formatEther(currentBalance)} POL`);
}
