import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { keccak256, toBytes } from "viem";

describe("Creator-first verifiable sortition", async () => {
  const { viem, networkHelpers } = await network.create();
  const publicClient = await viem.getPublicClient();
  const [admin, creator, user, outsider] = await viem.getWalletClients();
  const hash = (value: string) => keccak256(toBytes(value));

  async function fixture(sharedIdentity = false) {
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
    const sortition = await viem.deployContract("CreatorFirstVerifiableSortition", [
      admin.account.address,
      admin.account.address,
      admin.account.address,
      governor.address,
    ]);
    await governor.write.grantRole([await governor.read.REGISTRAR_ROLE(), sortition.address]);
    const creatorIdentity = hash("governance-identity:creator");
    const userIdentity = sharedIdentity ? creatorIdentity : hash("governance-identity:user");
    const creatorLeaf = await sortition.read.eligibilityLeaf([0, creatorIdentity, creator.account.address]);
    const userLeaf = await sortition.read.eligibilityLeaf([0, userIdentity, user.account.address]);
    const now = await networkHelpers.time.latest();
    const closesAt = BigInt(now + 100);
    const claimDeadline = BigInt(now + 300);
    await governor.write.createSession([
      hash("production-session-rule:v1"),
      BigInt(now + 400),
      BigInt(now + 4_000),
      10,
      1,
      1,
    ]);
    await sortition.write.createRound([
      1n,
      hash("eligibility-snapshot:1"),
      hash("vrf-request:1"),
      closesAt,
      claimDeadline,
      creatorLeaf,
      1,
      1,
      0,
      userLeaf,
      1,
      1,
      0,
    ]);
    return { governor, sortition, creatorIdentity, userIdentity, closesAt, claimDeadline };
  }

  it("freezes eligibility before accepting randomness and selects each House independently", async () => {
    const { governor, sortition, creatorIdentity, userIdentity, closesAt } = await fixture();
    await assert.rejects(sortition.write.fulfillRandomness([hash("vrf-request:1"), 123n]));
    await networkHelpers.time.increaseTo(closesAt);
    await sortition.write.fulfillRandomness([hash("vrf-request:1"), 123n]);
    await sortition.write.finalizeNextSelection([1n, 1]);
    await sortition.write.finalizeNextSelection([1n, 2]);
    assert.equal(await sortition.read.selectedIndexPlusOne([1n, 1, 0]), 1);
    assert.equal(await sortition.read.selectedIndexPlusOne([1n, 2, 0]), 1);

    await sortition.write.claimSeat([1n, 1, 0, creatorIdentity, creator.account.address, []], {
      account: creator.account,
    });
    await sortition.write.claimSeat([1n, 2, 0, userIdentity, user.account.address, []], {
      account: user.account,
    });
    assert.equal(await governor.read.memberHouse([1n, creator.account.address]), 1);
    assert.equal(await governor.read.memberHouse([1n, user.account.address]), 2);
  });

  it("rejects a wrong wallet proof and reuse of one governance identity across Houses", async () => {
    const { sortition, creatorIdentity, userIdentity, closesAt } = await fixture(true);
    await networkHelpers.time.increaseTo(closesAt);
    await sortition.write.fulfillRandomness([hash("vrf-request:1"), 456n]);
    await sortition.write.finalizeNextSelection([1n, 1]);
    await sortition.write.finalizeNextSelection([1n, 2]);
    await assert.rejects(
      sortition.write.claimSeat([1n, 1, 0, creatorIdentity, creator.account.address, []], {
        account: outsider.account,
      }),
    );
    await sortition.write.claimSeat([1n, 1, 0, creatorIdentity, creator.account.address, []], {
      account: creator.account,
    });
    await assert.rejects(
      sortition.write.claimSeat([1n, 2, 0, userIdentity, user.account.address, []], {
        account: user.account,
      }),
    );
  });

  it("rejects randomness from an unauthorized provider", async () => {
    const { sortition, closesAt } = await fixture();
    await networkHelpers.time.increaseTo(closesAt);
    await assert.rejects(
      sortition.write.fulfillRandomness([hash("vrf-request:1"), 789n], { account: outsider.account }),
    );
  });

  it("rejects randomness that arrives after the seat-claim window", async () => {
    const { sortition, claimDeadline } = await fixture();
    await networkHelpers.time.increaseTo(claimDeadline);
    await assert.rejects(sortition.write.fulfillRandomness([hash("vrf-request:1"), 790n]));
  });

  it("draws unique ordered candidates and activates alternates sequentially", async () => {
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
    const sortition = await viem.deployContract("CreatorFirstVerifiableSortition", [
      admin.account.address,
      admin.account.address,
      admin.account.address,
      governor.address,
    ]);
    await governor.write.grantRole([await governor.read.REGISTRAR_ROLE(), sortition.address]);
    const now = await networkHelpers.time.latest();
    const closesAt = BigInt(now + 100);
    const claimDeadline = BigInt(now + 300);
    await governor.write.createSession([
      hash("production-session-rule:ordered-alternates"),
      BigInt(now + 500),
      BigInt(now + 4_000),
      10,
      1,
      1,
    ]);
    await sortition.write.createRound([
      1n,
      hash("eligibility-snapshot:ordered-alternates"),
      hash("vrf-request:ordered-alternates"),
      closesAt,
      claimDeadline,
      hash("creator-indexed-root"),
      3,
      1,
      2,
      hash("user-indexed-root"),
      3,
      1,
      2,
    ]);
    await networkHelpers.time.increaseTo(closesAt);
    await sortition.write.fulfillRandomness([hash("vrf-request:ordered-alternates"), 791n]);
    await sortition.write.finalizeNextSelection([1n, 1]);
    await sortition.write.finalizeNextSelection([1n, 1]);
    await sortition.write.finalizeNextSelection([1n, 1]);
    const selected = await Promise.all([
      sortition.read.selectedIndexPlusOne([1n, 1, 0]),
      sortition.read.selectedIndexPlusOne([1n, 1, 1]),
      sortition.read.selectedIndexPlusOne([1n, 1, 2]),
    ]);
    assert.equal(new Set(selected.map(Number)).size, 3);

    await networkHelpers.time.increaseTo(claimDeadline + 1n);
    await sortition.write.activateNextAlternate([1n, 1, hash("vacancy-evidence:rank-0")]);
    let config = await sortition.read.houseConfigs([1n, 1]);
    assert.equal(config[5], 2);
    await sortition.write.activateNextAlternate([1n, 1, hash("vacancy-evidence:rank-1")]);
    config = await sortition.read.houseConfigs([1n, 1]);
    assert.equal(config[5], 3);
    await assert.rejects(
      sortition.write.activateNextAlternate([1n, 1, hash("vacancy-evidence:exhausted")]),
    );
  });
});
