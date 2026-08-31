import { network } from "hardhat";
import { formatEther, getAddress, parseEther } from "viem";

const operatorAddress = getAddress(
  process.env.PARTICIPANT_OPERATOR_ADDRESS ?? "0x4C6235088C0c507c880DFe1a01184951e65017C2",
);
const targetBalance = parseEther(process.env.PARTICIPANT_OPERATOR_TARGET_POL ?? "0.05");
const confirmations = Number(process.env.PARTICIPANT_OPERATOR_CONFIRMATIONS ?? "2");

const { viem } = await network.create();
const [deployer] = await viem.getWalletClients();
const publicClient = await viem.getPublicClient();
const currentBalance = await publicClient.getBalance({ address: operatorAddress });

if (currentBalance >= targetBalance) {
  console.log(`Participant operator already funded: ${formatEther(currentBalance)} POL`);
  process.exit(0);
}

const value = targetBalance - currentBalance;
const transactionHash = await deployer.sendTransaction({
  to: operatorAddress,
  value,
  gas: 25_000n,
  gasPrice: 50_000_000_000n,
});
const receipt = await publicClient.waitForTransactionReceipt({ hash: transactionHash, confirmations });

if (receipt.status !== "success") {
  throw new Error(`Participant operator funding reverted: ${transactionHash}`);
}

console.log(`Participant operator funded: ${formatEther(value)} POL`);
console.log(`Transaction: ${transactionHash}`);
