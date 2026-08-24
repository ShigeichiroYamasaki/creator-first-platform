import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { encodeFunctionData, keccak256, toBytes } from "viem";

describe("Creator-first testnet bicameral governance", async () => {
  const { viem, networkHelpers } = await network.create();
  const publicClient = await viem.getPublicClient();
  const [admin, creatorA, creatorB, userA, userB, outsider] = await viem.getWalletClients();

  const hash = (value: string) => keccak256(toBytes(value));

  async function deployFixture(creatorQuorum = 2, userQuorum = 2, changeClass = 1) {
    const chainId = await publicClient.getChainId();
    const governor = await viem.deployContract("CreatorFirstBicameralGovernor", [
      admin.account.address,
      admin.account.address,
      admin.account.address,
      admin.account.address,
      BigInt(chainId),
      60n,
      120n,
      180n,
      3600n,
    ]);
    const policy = await viem.deployContract("CreatorFirstGovernedPolicy", [
      governor.address,
      30,
      100,
    ]);
    const now = await networkHelpers.time.latest();
    const sessionStartsAt = BigInt(now + 20);
    const sessionEndsAt = sessionStartsAt + 1000n;
    await governor.write.createSession([
      hash("governance-rule:v1"),
      sessionStartsAt,
      sessionEndsAt,
      10,
      creatorQuorum,
      userQuorum,
    ]);
    for (const [member, house] of [
      [creatorA, 1],
      [creatorB, 1],
      [userA, 2],
      [userB, 2],
    ] as const) {
      await governor.write.registerMember([1n, member.account.address, house]);
    }
    const callData = encodeFunctionData({
      abi: policy.abi,
      functionName: "setDemoPolicy",
      args: [45, 250],
    });
    const votingStartsAt = sessionStartsAt;
    const votingEndsAt = votingStartsAt + 100n;
    await governor.write.registerProposal([
      1n,
      hash("CFP-TEST-0001:revision:1"),
      hash("SPEC-GOVERNANCE-001:0.1.0"),
      hash("manifest:CFP-TEST-0001:revision:1"),
      changeClass,
      policy.address,
      0n,
      keccak256(callData),
      votingStartsAt,
      votingEndsAt,
    ]);
    return { governor, policy, callData, votingStartsAt, votingEndsAt, sessionEndsAt };
  }

  async function castPassingBallots(
    governor: Awaited<ReturnType<typeof viem.deployContract>>,
    proposalId = 1n,
  ) {
    await governor.write.castVote([proposalId, 2], { account: creatorA.account });
    await governor.write.castVote([proposalId, 1], { account: creatorB.account });
    await governor.write.castVote([proposalId, 2], { account: userA.account });
    await governor.write.castVote([proposalId, 1], { account: userB.account });
  }

  it("keeps Houses separate and prevents economic or outsider voting", async () => {
    const { governor, votingStartsAt, votingEndsAt } = await deployFixture();
    await networkHelpers.time.increaseTo(votingStartsAt);
    await governor.write.castVote([1n, 3], { account: creatorA.account });
    await governor.write.castVote([1n, 3], { account: creatorB.account });
    await governor.write.castVote([1n, -1], { account: userA.account });
    await governor.write.castVote([1n, -1], { account: userB.account });
    await assert.rejects(governor.write.castVote([1n, 1], { account: outsider.account }));

    await networkHelpers.time.increaseTo(votingEndsAt);
    await governor.write.finalizeProposal([1n]);

    const proposal = await governor.read.proposals([1n]);
    assert.equal(proposal[16], true, "creator House should approve");
    assert.equal(proposal[17], false, "user House rejection cannot be offset");
    assert.equal(await governor.read.proposalState([1n]), 4);
    await assert.rejects(governor.write.recordReview([1n, hash("review:1")]));
  });

  it("refunds replaced quadratic cost while enforcing one equal session budget", async () => {
    const { governor, policy, votingStartsAt, votingEndsAt, sessionEndsAt } = await deployFixture(1, 1);
    const secondCallData = encodeFunctionData({
      abi: policy.abi,
      functionName: "setDemoPolicy",
      args: [60, 500],
    });
    await governor.write.registerProposal([
      1n,
      hash("CFP-TEST-0002:revision:1"),
      hash("SPEC-GOVERNANCE-001:0.1.0"),
      hash("manifest:CFP-TEST-0002:revision:1"),
      1,
      policy.address,
      0n,
      keccak256(secondCallData),
      votingStartsAt,
      sessionEndsAt - 1n,
    ]);
    await networkHelpers.time.increaseTo(votingStartsAt);

    await governor.write.castVote([1n, 3], { account: creatorA.account });
    assert.equal(await governor.read.remainingVoiceCredits([1n, creatorA.account.address]), 1);
    await governor.write.castVote([1n, 2], { account: creatorA.account });
    assert.equal(await governor.read.remainingVoiceCredits([1n, creatorA.account.address]), 6);
    await assert.rejects(governor.write.castVote([2n, 3], { account: creatorA.account }));
    await governor.write.castVote([2n, 2], { account: creatorA.account });
    assert.equal(await governor.read.remainingVoiceCredits([1n, creatorA.account.address]), 2);
    assert.equal((await governor.read.ballots([1n, creatorA.account.address]))[0], 2);
    assert.equal((await governor.read.ballots([2n, creatorA.account.address]))[1], 4);
    assert.ok(votingEndsAt < sessionEndsAt);
  });

  it("executes only the exact jointly approved and reviewed manifest after timelock", async () => {
    const { governor, policy, callData, votingStartsAt, votingEndsAt } = await deployFixture();
    await networkHelpers.time.increaseTo(votingStartsAt);
    await castPassingBallots(governor);
    await networkHelpers.time.increaseTo(votingEndsAt);
    await governor.write.finalizeProposal([1n]);
    assert.equal(await governor.read.proposalState([1n]), 5);
    await assert.rejects(policy.write.setDemoPolicy([45, 250], { account: outsider.account }));

    await governor.write.recordReview([1n, hash("legal-security-review:passed")]);
    await governor.write.queueProposal([1n]);
    assert.equal(await governor.read.proposalState([1n]), 7);
    await assert.rejects(governor.write.executeProposal([1n, callData]));

    const queued = await governor.read.proposals([1n]);
    await networkHelpers.time.increaseTo(queued[9]);
    const wrongCallData = encodeFunctionData({
      abi: policy.abi,
      functionName: "setDemoPolicy",
      args: [44, 250],
    });
    await assert.rejects(governor.write.executeProposal([1n, wrongCallData]));
    await governor.write.executeProposal([1n, callData]);

    assert.equal(await policy.read.earlySupporterWindowDays(), 45);
    assert.equal(await policy.read.maxEarlySupporters(), 250);
    assert.equal(await policy.read.version(), 2n);
    assert.equal(await governor.read.proposalState([1n]), 8);
  });

  it("requires direct-community evidence before reviewing a constitutional change", async () => {
    const { governor, votingStartsAt, votingEndsAt } = await deployFixture(2, 2, 3);
    await networkHelpers.time.increaseTo(votingStartsAt);
    await castPassingBallots(governor);
    await networkHelpers.time.increaseTo(votingEndsAt);
    await governor.write.finalizeProposal([1n]);

    await assert.rejects(governor.write.recordReview([1n, hash("constitutional-review")]))
    const evidence = hash("creator-and-user-community-referenda:passed")
    await governor.write.recordConstitutionalEvidence([1n, evidence])
    await governor.write.recordReview([1n, hash("constitutional-review")])

    assert.equal(await governor.read.constitutionalEvidenceHash([1n]), evidence)
    assert.equal(await governor.read.reviewEvidenceHash([1n]), hash("constitutional-review"))
    assert.equal(await governor.read.proposalState([1n]), 6)
  });

  it("allows the guardian to cancel but never replace a queued operation", async () => {
    const { governor, callData, votingStartsAt, votingEndsAt } = await deployFixture();
    await networkHelpers.time.increaseTo(votingStartsAt);
    await castPassingBallots(governor);
    await networkHelpers.time.increaseTo(votingEndsAt);
    await governor.write.finalizeProposal([1n]);
    await governor.write.recordReview([1n, hash("review:passed")]);
    await governor.write.queueProposal([1n]);
    await governor.write.cancelQueuedProposal([1n, hash("incident:testnet-001")]);

    assert.equal(await governor.read.proposalState([1n]), 9);
    await assert.rejects(governor.write.executeProposal([1n, callData]));
  });
});
