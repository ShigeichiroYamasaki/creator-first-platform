import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { getAddress, keccak256, parseEther, toBytes, zeroHash } from "viem";

describe("Creator-first testnet claimed-invitation registration", async () => {
  const { viem, networkHelpers } = await network.create();
  const [admin, approver, participant, other] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  const opaque = (value: string) => keccak256(toBytes(`opaque:${value}:salt`));

  async function fixture() {
    const distributor = await viem.deployContract("CreatorFirstTestnetPolDistributor", [
      admin.account.address,
      admin.account.address,
      admin.account.address,
    ], { value: parseEther("1") });
    const registry = await viem.deployContract("CreatorFirstTestnetParticipantRegistry", [
      admin.account.address,
      approver.account.address,
      distributor.address,
    ]);
    const registrarRole = await distributor.read.REGISTRAR_ROLE();
    await distributor.write.grantRole([registrarRole, registry.address], { account: admin.account });
    return { distributor, registry };
  }

  it("approves a claimed invitation, funds it and lets the bound user wallet register itself", async () => {
    const { registry } = await fixture();
    const participantId = opaque("user-001");
    const expiry = BigInt(await networkHelpers.time.latest()) + 3_600n;
    await networkHelpers.setBalance(participant.account.address, 0n);

    await registry.write.approveClaimedInvitation([
      participantId,
      participant.account.address,
      1,
      expiry,
    ], { account: approver.account });
    assert.equal(await registry.read.isClaimApproved([participant.account.address, 1]), true);
    assert.equal(await registry.read.isRegistered([participant.account.address, 1]), false);

    await registry.write.fundInitial([participantId, opaque("funding-001")], { account: approver.account });
    assert.equal(await publicClient.getBalance({ address: participant.account.address }), parseEther("0.02"));

    const consent = opaque("user-consent-v1");
    await registry.write.registerSelf([1, consent], { account: participant.account });
    assert.equal(await registry.read.isRegistered([participant.account.address, 1]), true);
    assert.equal(await registry.read.consentVersions([participantId, 1]), consent);
    const record = await registry.read.participants([participantId]);
    assert.equal(record[0], getAddress(participant.account.address));
    assert.equal(record[1], 1);
    assert.equal(record[2], 1);
    assert.equal(record[6], true);
  });

  it("supports independent user and creator self-registration for one approved wallet", async () => {
    const { registry } = await fixture();
    const participantId = opaque("dual-role");
    const expiry = BigInt(await networkHelpers.time.latest()) + 3_600n;
    await registry.write.approveClaimedInvitation([participantId, participant.account.address, 3, expiry], {
      account: approver.account,
    });

    await registry.write.registerSelf([1, opaque("user-consent")], { account: participant.account });
    await registry.write.registerSelf([2, opaque("creator-consent")], { account: participant.account });
    assert.equal(await registry.read.isRegistered([participant.account.address, 1]), true);
    assert.equal(await registry.read.isRegistered([participant.account.address, 2]), true);
    assert.equal((await registry.read.participants([participantId]))[2], 3);
  });

  it("rejects unapproved roles, wallets, duplicates, expiry and funding replay", async () => {
    const { registry } = await fixture();
    const participantId = opaque("restricted");
    const expiry = BigInt(await networkHelpers.time.latest()) + 100n;
    await registry.write.approveClaimedInvitation([participantId, participant.account.address, 1, expiry], {
      account: approver.account,
    });

    await assert.rejects(registry.write.registerSelf([1, opaque("outsider")], { account: other.account }));
    await assert.rejects(registry.write.registerSelf([2, opaque("wrong-role")], { account: participant.account }));
    await assert.rejects(registry.write.registerSelf([1, zeroHash], { account: participant.account }));
    await assert.rejects(registry.write.approveClaimedInvitation([
      opaque("duplicate-wallet"), participant.account.address, 1, expiry,
    ], { account: approver.account }));
    await assert.rejects(registry.write.approveClaimedInvitation([
      participantId, other.account.address, 1, expiry,
    ], { account: approver.account }));

    await registry.write.fundInitial([participantId, opaque("fund-once")], { account: approver.account });
    await assert.rejects(registry.write.fundInitial([participantId, opaque("fund-twice")], {
      account: approver.account,
    }));

    const expiringId = opaque("expired");
    await registry.write.approveClaimedInvitation([expiringId, other.account.address, 2, expiry], {
      account: approver.account,
    });
    await networkHelpers.time.increase(101);
    await assert.rejects(registry.write.registerSelf([2, opaque("late")], { account: other.account }));
  });

  it("lets the approver suspend all registered roles without deleting evidence", async () => {
    const { registry } = await fixture();
    const participantId = opaque("suspend");
    const expiry = BigInt(await networkHelpers.time.latest()) + 3_600n;
    await registry.write.approveClaimedInvitation([participantId, participant.account.address, 1, expiry], {
      account: approver.account,
    });
    await registry.write.registerSelf([1, opaque("consent")], { account: participant.account });
    await registry.write.setParticipantActive([participantId, false], { account: approver.account });
    assert.equal(await registry.read.isRegistered([participant.account.address, 1]), false);
    assert.equal((await registry.read.participants([participantId]))[2], 1);
  });
});
