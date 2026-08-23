import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { getAddress, keccak256, toBytes, zeroAddress } from "viem";

describe("Creator-first testnet creator registry", async () => {
  const { viem } = await network.create();
  const [admin, creator, other] = await viem.getWalletClients();

  async function deployFixture() {
    return viem.deployContract("CreatorFirstCreatorRegistry", [admin.account.address]);
  }

  it("registers one pseudonymous creator commitment per wallet", async () => {
    const registry = await deployFixture();
    const profileCommitment = keccak256(toBytes("profile:salt:demo-artist"));

    await registry.write.registerCreator([profileCommitment, creator.account.address], {
      account: creator.account,
    });

    assert.equal(await registry.read.creatorIdByAccount([creator.account.address]), 1n);
    assert.equal(await registry.read.creatorIdByProfileCommitment([profileCommitment]), 1n);
    assert.equal(await registry.read.isRegistered([creator.account.address]), true);
    const record = await registry.read.creators([1n]);
    assert.equal(record[0], getAddress(creator.account.address));
    assert.equal(record[1], getAddress(creator.account.address));
    assert.equal(record[2], profileCommitment);
    assert.equal(record[5], true);

    await assert.rejects(
      registry.write.registerCreator([keccak256(toBytes("other-profile")), creator.account.address], {
        account: creator.account,
      }),
    );
    await assert.rejects(
      registry.write.registerCreator([profileCommitment, other.account.address], {
        account: other.account,
      }),
    );
    await assert.rejects(
      registry.write.registerCreator([keccak256(toBytes("zero-payout")), zeroAddress], {
        account: other.account,
      }),
    );
  });

  it("declares and withdraws an unverified release commitment", async () => {
    const registry = await deployFixture();
    const profileCommitment = keccak256(toBytes("profile:creator"));
    const metadataCommitment = keccak256(toBytes("metadata:synthetic-release"));
    const rightsCommitment = keccak256(toBytes("rights:self-declared-unverified:v1"));
    await registry.write.registerCreator([profileCommitment, creator.account.address], {
      account: creator.account,
    });

    await registry.write.declareRelease([metadataCommitment, rightsCommitment], {
      account: creator.account,
    });
    const release = await registry.read.releases([1n]);
    assert.equal(release[0], 1n);
    assert.equal(release[1], metadataCommitment);
    assert.equal(release[2], rightsCommitment);
    assert.equal(release[4], 1);

    await assert.rejects(registry.write.withdrawRelease([1n], { account: other.account }));
    await registry.write.withdrawRelease([1n], { account: creator.account });
    assert.equal((await registry.read.releases([1n]))[4], 2);
    await assert.rejects(registry.write.withdrawRelease([1n], { account: creator.account }));
  });

  it("supports creator-controlled profile, payout and active-state changes", async () => {
    const registry = await deployFixture();
    const firstCommitment = keccak256(toBytes("profile:first"));
    const secondCommitment = keccak256(toBytes("profile:second"));
    await registry.write.registerCreator([firstCommitment, creator.account.address], {
      account: creator.account,
    });

    await registry.write.updateProfileCommitment([secondCommitment], { account: creator.account });
    await registry.write.updatePayoutAddress([other.account.address], { account: creator.account });
    await registry.write.setActive([false], { account: creator.account });

    const record = await registry.read.creators([1n]);
    assert.equal(record[1], getAddress(other.account.address));
    assert.equal(record[2], secondCommitment);
    assert.equal(record[5], false);
    await assert.rejects(
      registry.write.declareRelease([
        keccak256(toBytes("metadata")),
        keccak256(toBytes("rights")),
      ], { account: creator.account }),
    );
  });
});
