import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { encodeFunctionData, keccak256, toBytes } from "viem";

describe("SupporterSBTUpgradeable", async () => {
  const { viem } = await network.create();
  const publicClient = await viem.getPublicClient();
  const [admin, holder, anotherHolder] = await viem.getWalletClients();

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
    const proxy = await viem.deployContract("SupporterSBTProxy", [
      implementation.address,
      initializationData,
    ]);
    const sbt = await viem.getContractAt("SupporterSBTUpgradeable", proxy.address);
    return { sbt, proxy };
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
      message: {
        creatorId,
        holder: signer.account.address,
        nonce,
        deadline,
        consentVersion,
      },
    });
  }

  it("contract-selects Early tier, exposes ERC-5192 locking, and rejects transfer", async () => {
    const { sbt, proxy } = await deployFixture();
    const creatorId = keccak256(toBytes("creator:alice"));
    const consentVersion = keccak256(toBytes("consent:v1"));
    const block = await publicClient.getBlock();
    const deadline = block.timestamp + 3600n;
    await sbt.write.setEarlyPolicy([creatorId, deadline, 1, true]);
    const signature = await signIntent(
      proxy.address,
      holder,
      creatorId,
      0n,
      deadline,
      consentVersion,
    );

    await sbt.write.registerSupporterWithSignature([
      creatorId,
      holder.account.address,
      0n,
      deadline,
      consentVersion,
      signature,
    ]);

    assert.equal(await sbt.read.getSupporterTier([creatorId, holder.account.address]), 2);
    assert.equal(await sbt.read.locked([1n]), true);
    assert.equal(await sbt.read.tokenURI([1n]), "ipfs://early");
    await assert.rejects(
      sbt.write.transferFrom(
        [holder.account.address, anotherHolder.account.address, 1n],
        { account: holder.account },
      ),
    );
    await assert.rejects(
      sbt.write.registerSupporterWithSignature([
        creatorId,
        holder.account.address,
        0n,
        deadline,
        consentVersion,
        signature,
      ]),
    );
  });

  it("falls back to general Supporter after the Early cap and preserves issued tier", async () => {
    const { sbt, proxy } = await deployFixture();
    const creatorId = keccak256(toBytes("creator:bob"));
    const consentVersion = keccak256(toBytes("consent:v1"));
    const block = await publicClient.getBlock();
    const deadline = block.timestamp + 3600n;
    await sbt.write.setEarlyPolicy([creatorId, deadline, 1, true]);

    for (const signer of [holder, anotherHolder]) {
      const signature = await signIntent(
        proxy.address,
        signer as typeof holder,
        creatorId,
        0n,
        deadline,
        consentVersion,
      );
      await sbt.write.registerSupporterWithSignature([
        creatorId,
        signer.account.address,
        0n,
        deadline,
        consentVersion,
        signature,
      ]);
    }

    assert.equal(await sbt.read.getSupporterTier([creatorId, holder.account.address]), 2);
    assert.equal(await sbt.read.getSupporterTier([creatorId, anotherHolder.account.address]), 1);
    assert.equal(await sbt.read.tokenURI([1n]), "ipfs://early");
    assert.equal(await sbt.read.tokenURI([2n]), "ipfs://supporter");
  });
});
