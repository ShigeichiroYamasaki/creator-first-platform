import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { keccak256, toBytes } from "viem";

describe("Creator-first testnet legislator registration", async () => {
  const { viem, networkHelpers } = await network.create();
  const publicClient = await viem.getPublicClient();
  const [admin, creator, user, outsider] = await viem.getWalletClients();

  async function fixture() {
    const mockJpyc = await viem.deployContract("MockJPYC", [admin.account.address, 1_000_000n]);
    const treasury = await viem.deployContract("CreatorFirstTreasury", [
      mockJpyc.address,
      admin.account.address,
      admin.account.address,
    ]);
    const subscription = await viem.deployContract("CreatorFirstSubscription", [
      mockJpyc.address,
      treasury.address,
      admin.account.address,
      admin.account.address,
      100n,
      3_600n,
    ]);
    const creatorRegistry = await viem.deployContract("CreatorFirstCreatorRegistry", [admin.account.address]);
    const governor = await viem.deployContract("CreatorFirstBicameralGovernor", [
      admin.account.address,
      admin.account.address,
      admin.account.address,
      admin.account.address,
      BigInt(await publicClient.getChainId()),
      60n,
      120n,
      180n,
      3_600n,
    ]);
    const adapter = await viem.deployContract("CreatorFirstTestnetLegislatorRegistrationAdapter", [
      governor.address,
      subscription.address,
      creatorRegistry.address,
    ]);
    const registrarRole = await governor.read.REGISTRAR_ROLE();
    await governor.write.grantRole([registrarRole, adapter.address]);
    const now = await networkHelpers.time.latest();
    await governor.write.createSession([
      keccak256(toBytes("testnet-session-rule:v1")),
      BigInt(now + 300),
      BigInt(now + 3_600),
      10,
      1,
      1,
    ]);
    return { mockJpyc, subscription, creatorRegistry, governor, adapter };
  }

  it("registers an active subscriber only in the User House", async () => {
    const { mockJpyc, subscription, governor, adapter } = await fixture();
    await mockJpyc.write.transfer([user.account.address, 100n]);
    await mockJpyc.write.approve([subscription.address, 100n], { account: user.account });
    await subscription.write.subscribe([keccak256(toBytes("payment:user:1")), 1n], { account: user.account });

    await adapter.write.registerAsUser([1n], { account: user.account });
    assert.equal(await governor.read.memberHouse([1n, user.account.address]), 2);
    await assert.rejects(adapter.write.registerAsCreator([1n], { account: user.account }));
  });

  it("registers an active test creator only in the Creator House", async () => {
    const { creatorRegistry, governor, adapter } = await fixture();
    await creatorRegistry.write.registerCreator([
      keccak256(toBytes("creator-profile:1")),
      creator.account.address,
    ], { account: creator.account });

    await adapter.write.registerAsCreator([1n], { account: creator.account });
    assert.equal(await governor.read.memberHouse([1n, creator.account.address]), 1);
    await assert.rejects(adapter.write.registerAsUser([1n], { account: creator.account }));
  });

  it("rejects an ineligible wallet and registration after the session starts", async () => {
    const { mockJpyc, subscription, adapter } = await fixture();
    await assert.rejects(adapter.write.registerAsUser([1n], { account: outsider.account }));
    await mockJpyc.write.transfer([user.account.address, 100n]);
    await mockJpyc.write.approve([subscription.address, 100n], { account: user.account });
    await subscription.write.subscribe([keccak256(toBytes("payment:user:late")), 1n], { account: user.account });
    await networkHelpers.time.increase(301);
    await assert.rejects(adapter.write.registerAsUser([1n], { account: user.account }));
  });
});
