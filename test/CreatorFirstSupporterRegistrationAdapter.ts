import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { encodeFunctionData, keccak256, toBytes } from "viem";

describe("CreatorFirstSupporterRegistrationAdapter", async () => {
  const { viem } = await network.create();
  const publicClient = await viem.getPublicClient();
  const [admin, holder, attacker] = await viem.getWalletClients();

  async function deployFixture() {
    const implementation = await viem.deployContract("SupporterSBTUpgradeable");
    const initializationData = encodeFunctionData({
      abi: implementation.abi,
      functionName: "initialize",
      args: [
        admin.account.address,
        admin.account.address,
        admin.account.address,
        admin.account.address,
        admin.account.address,
        "ipfs://supporter",
        "ipfs://early",
      ],
    });
    const proxy = await viem.deployContract("SupporterSBTProxy", [implementation.address, initializationData]);
    const sbt = await viem.getContractAt("SupporterSBTUpgradeable", proxy.address);
    const adapter = await viem.deployContract("CreatorFirstSupporterRegistrationAdapter", [proxy.address]);
    await sbt.write.grantRole([await sbt.read.RELAYER_ROLE(), adapter.address]);
    return { sbt, proxy, adapter };
  }

  async function signIntent(
    verifyingContract: `0x${string}`,
    signer: typeof holder,
    creatorId: `0x${string}`,
    nonce: bigint,
    deadline: bigint,
    consentVersion: `0x${string}`,
  ) {
    return signer.signTypedData({
      account: signer.account,
      domain: {
        name: "Creator First Supporter SBT",
        version: "1",
        chainId: await publicClient.getChainId(),
        verifyingContract,
      },
      types: {
        SupportIntent: [
          { name: "creatorId", type: "bytes32" },
          { name: "holder", type: "address" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
          { name: "consentVersion", type: "bytes32" },
        ],
      },
      primaryType: "SupportIntent",
      message: { creatorId, holder: signer.account.address, nonce, deadline, consentVersion },
    });
  }

  it("lets the signed holder mint through the public adapter", async () => {
    const { sbt, proxy, adapter } = await deployFixture();
    const creatorId = keccak256(toBytes("creator:synthetic-demo-artist"));
    const consentVersion = keccak256(toBytes("supporter-demo-consent-v1"));
    const now = (await publicClient.getBlock()).timestamp;
    await sbt.write.setEarlyPolicy([creatorId, now + 3600n, 100, true]);
    const signature = await signIntent(proxy.address, holder, creatorId, 0n, now + 600n, consentVersion);

    await adapter.write.registerSelf([creatorId, 0n, now + 600n, consentVersion, signature], {
      account: holder.account,
    });

    assert.equal(await sbt.read.activeTokenOf([creatorId, holder.account.address]), 1n);
    assert.equal(await sbt.read.getSupporterTier([creatorId, holder.account.address]), 2);
    assert.equal((await sbt.read.ownerOf([1n])).toLowerCase(), holder.account.address.toLowerCase());
  });

  it("cannot forward another holder's signature or an excessively long authorization", async () => {
    const { proxy, adapter } = await deployFixture();
    const creatorId = keccak256(toBytes("creator:synthetic-demo-artist"));
    const consentVersion = keccak256(toBytes("supporter-demo-consent-v1"));
    const now = (await publicClient.getBlock()).timestamp;
    const signature = await signIntent(proxy.address, holder, creatorId, 0n, now + 600n, consentVersion);

    await assert.rejects(
      adapter.write.registerSelf([creatorId, 0n, now + 600n, consentVersion, signature], {
        account: attacker.account,
      }),
    );
    await assert.rejects(
      adapter.write.registerSelf([creatorId, 0n, now + 901n, consentVersion, signature], {
        account: holder.account,
      }),
    );
  });
});
