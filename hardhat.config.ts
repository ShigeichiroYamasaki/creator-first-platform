import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { configVariable, defineConfig } from "hardhat/config";

const amoyRpcUrl = process.env.AMOY_RPC_URL ?? "https://polygon-amoy-bor-rpc.publicnode.com";

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
        settings: {
          optimizer: { enabled: true, runs: 200 },
          viaIR: true,
        },
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: { enabled: true, runs: 500 },
          viaIR: true,
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    amoy: {
      type: "http",
      chainType: "l1",
      chainId: 80002,
      url: amoyRpcUrl,
      accounts: [configVariable("DEPLOYER_PRIVATE_KEY")],
      // Amoy currently requires a slightly higher intrinsic limit than the
      // 21,000 gas returned for a plain native-token transfer.
      gasMultiplier: 1.2,
      // Polygon Amoy rejects the low EIP-1559 priority fee that some RPC
      // estimators return. Use a legacy gas price above Amoy's 25 gwei floor
      // so Ignition deployments are accepted consistently.
      gasPrice: 50_000_000_000n,
    },
  },
});
