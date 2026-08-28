import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { getAddress, keccak256, parseEther, toBytes, zeroAddress } from "viem";

describe("Creator-first testnet POL distributor", async () => {
  const { viem, networkHelpers } = await network.create();
  const [admin, participant, other, outsider] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();
  const hash = (value: string) => keccak256(toBytes(value));

  async function deployFixture(funding = "2") {
    const distributor = await viem.deployContract("CreatorFirstTestnetPolDistributor", [
      admin.account.address,
      admin.account.address,
      admin.account.address,
    ]);
    await admin.sendTransaction({ to: distributor.address, value: parseEther(funding) });
    await networkHelpers.setBalance(participant.account.address, 0n);
    return distributor;
  }

  it("registers an approved participant and supplies only the minimum initial balance", async () => {
    const distributor = await deployFixture();
    const participantId = hash("participant:001");

    await distributor.write.registerAndTopUp([
      participantId,
      participant.account.address,
      hash("operation:initial:001"),
    ]);

    assert.equal(await publicClient.getBalance({ address: participant.account.address }), parseEther("0.02"));
    const record = await distributor.read.participants([participantId]);
    assert.equal(record[0], getAddress(participant.account.address));
    assert.equal(record[1], parseEther("0.02"));
    assert.equal(record[4], true);
    assert.equal(await distributor.read.participantIdByWallet([participant.account.address]), participantId);
  });

  it("replenishes to a bounded target after cooldown and rejects replay", async () => {
    const distributor = await deployFixture();
    const participantId = hash("participant:002");
    const initialOperation = hash("operation:initial:002");
    const refillOperation = hash("operation:refill:002");
    await distributor.write.registerAndTopUp([participantId, participant.account.address, initialOperation]);
    await networkHelpers.setBalance(participant.account.address, parseEther("0.005"));

    await assert.rejects(
      distributor.write.topUp([participantId, participant.account.address, parseEther("0.05"), refillOperation]),
    );
    await networkHelpers.time.increase(601);
    assert.equal(
      await distributor.read.previewTopUp([participantId, participant.account.address, parseEther("0.05")]),
      parseEther("0.045"),
    );
    await distributor.write.topUp([participantId, participant.account.address, parseEther("0.05"), refillOperation]);
    assert.equal(await publicClient.getBalance({ address: participant.account.address }), parseEther("0.05"));
    await networkHelpers.setBalance(participant.account.address, 0n);
    await networkHelpers.time.increase(601);
    await assert.rejects(
      distributor.write.topUp([participantId, participant.account.address, parseEther("0.05"), refillOperation]),
    );
  });

  it("prevents duplicate person or wallet registration and unauthorized calls", async () => {
    const distributor = await deployFixture();
    const participantId = hash("participant:003");
    await distributor.write.registerAndTopUp([
      participantId,
      participant.account.address,
      hash("operation:initial:003"),
    ]);

    await assert.rejects(
      distributor.write.registerAndTopUp([participantId, other.account.address, hash("operation:duplicate-person")]),
    );
    await assert.rejects(
      distributor.write.registerAndTopUp([hash("participant:other"), participant.account.address, hash("operation:duplicate-wallet")]),
    );
    await assert.rejects(
      distributor.write.topUp([
        participantId,
        participant.account.address,
        parseEther("0.05"),
        hash("operation:unauthorized"),
      ], { account: outsider.account }),
    );
    await assert.rejects(
      viem.deployContract("CreatorFirstTestnetPolDistributor", [
        zeroAddress,
        admin.account.address,
        admin.account.address,
      ]),
    );
  });

  it("registers without distributing when the approved wallet already has enough Test POL", async () => {
    const distributor = await deployFixture();
    const participantId = hash("participant:already-funded");
    const operationId = hash("operation:already-funded");
    await networkHelpers.setBalance(participant.account.address, parseEther("0.03"));

    await distributor.write.registerAndTopUp([participantId, participant.account.address, operationId]);

    assert.equal((await distributor.read.participants([participantId]))[1], 0n);
    assert.equal(await distributor.read.usedOperationIds([operationId]), true);
    assert.equal(await publicClient.getBalance({ address: participant.account.address }), parseEther("0.03"));
  });

  it("enforces target, lifetime, pause, and emergency-withdrawal safeguards", async () => {
    const distributor = await deployFixture();
    const participantId = hash("participant:004");
    await distributor.write.registerAndTopUp([
      participantId,
      participant.account.address,
      hash("operation:initial:004"),
    ]);
    await networkHelpers.setBalance(participant.account.address, 0n);
    await networkHelpers.time.increase(601);

    await assert.rejects(
      distributor.write.topUp([
        participantId,
        participant.account.address,
        parseEther("0.051"),
        hash("operation:over-target"),
      ]),
    );

    for (let index = 0; index < 10; index += 1) {
      await networkHelpers.setBalance(participant.account.address, 0n);
      await networkHelpers.time.increase(601);
      await distributor.write.topUp([
        participantId,
        participant.account.address,
        parseEther("0.05"),
        hash(`operation:capped:${index}`),
      ]);
    }
    assert.equal((await distributor.read.participants([participantId]))[1], parseEther("0.5"));
    await networkHelpers.setBalance(participant.account.address, 0n);
    await networkHelpers.time.increase(601);
    await assert.rejects(
      distributor.write.topUp([
        participantId,
        participant.account.address,
        parseEther("0.05"),
        hash("operation:over-lifetime"),
      ]),
    );

    await distributor.write.pause();
    await assert.rejects(
      distributor.write.registerAndTopUp([
        hash("participant:paused"),
        other.account.address,
        hash("operation:paused"),
      ]),
    );
    const balanceBefore = await publicClient.getBalance({ address: distributor.address });
    await distributor.write.emergencyWithdraw([admin.account.address, balanceBefore]);
    assert.equal(await publicClient.getBalance({ address: distributor.address }), 0n);
  });
});
