import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { keccak256, parseEther, toBytes } from "viem";

describe("Creator-first testnet settlement", async () => {
  const { viem } = await network.create();
  const [admin, subscriber, creator] = await viem.getWalletClients();

  async function deployFixture() {
    const token = await viem.deployContract("MockJPYC", [
      admin.account.address,
      parseEther("1000000"),
    ]);
    const treasury = await viem.deployContract("CreatorFirstTreasury", [
      token.address,
      admin.account.address,
      admin.account.address,
    ]);
    const subscription = await viem.deployContract("CreatorFirstSubscription", [
      token.address,
      treasury.address,
      admin.account.address,
      admin.account.address,
      parseEther("1000"),
      30n * 24n * 60n * 60n,
    ]);
    await token.write.faucet([subscriber.account.address, parseEther("2000")]);
    await token.write.approve([subscription.address, parseEther("2000")], {
      account: subscriber.account,
    });
    return { token, treasury, subscription };
  }

  it("activates only after exact tJPYC transfer and rejects payment-reference replay", async () => {
    const { token, treasury, subscription } = await deployFixture();
    const paymentRef = keccak256(toBytes("payment-001"));

    await subscription.write.subscribe([paymentRef, 1n], {
      account: subscriber.account,
    });

    assert.equal(await token.read.balanceOf([treasury.address]), parseEther("1000"));
    assert.equal(await subscription.read.isActive([subscriber.account.address]), true);
    await assert.rejects(
      subscription.write.subscribe([paymentRef, 1n], { account: subscriber.account }),
    );
  });

  it("allows one fixed self-service test token claim per address", async () => {
    const { token } = await deployFixture();
    const initialBalance = await token.read.balanceOf([subscriber.account.address]);

    await token.write.claim({ account: creator.account });

    assert.equal(await token.read.balanceOf([creator.account.address]), parseEther("2000"));
    assert.equal(await token.read.hasClaimed([creator.account.address]), true);
    assert.equal(await token.read.balanceOf([subscriber.account.address]), initialBalance);
    await assert.rejects(token.write.claim({ account: creator.account }));
  });

  it("makes categorized treasury disbursements with an idempotent reference", async () => {
    const { token, treasury, subscription } = await deployFixture();
    const paymentRef = keccak256(toBytes("payment-002"));
    const disbursementRef = keccak256(toBytes("creator-payout-001"));
    await subscription.write.subscribe([paymentRef, 1n], {
      account: subscriber.account,
    });

    await treasury.write.disburse([
      disbursementRef,
      0,
      creator.account.address,
      parseEther("700"),
    ]);
    assert.equal(await token.read.balanceOf([creator.account.address]), parseEther("700"));
    assert.equal(await treasury.read.assetBalance(), parseEther("300"));
    await assert.rejects(
      treasury.write.disburse([
        disbursementRef,
        0,
        creator.account.address,
        parseEther("1"),
      ]),
    );
  });
});
