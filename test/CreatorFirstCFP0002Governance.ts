import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { encodeFunctionData, keccak256, toBytes } from "viem";

describe("CFP-0002 constitutional review, bicameral approval and governed deployment", async () => {
  const { viem, networkHelpers } = await network.create();
  const publicClient = await viem.getPublicClient();
  const [admin, creatorApplicant, creatorA, creatorB, userA, userB, outsider] =
    await viem.getWalletClients();
  const hash = (value: string) => keccak256(toBytes(value));

  async function sourceHash(relativePath: string) {
    const source = await readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
    return keccak256(toBytes(source));
  }

  async function policyArtifactHash() {
    const source = await readFile(
      new URL(
        "../artifacts/contracts/testnet/CreatorFirstCFP0002DeploymentFactory.sol/CreatorFirstCFP0002EarlySupporterPolicy.json",
        import.meta.url,
      ),
      "utf8",
    );
    const artifact = JSON.parse(source) as { bytecode: `0x${string}` };
    return keccak256(artifact.bytecode);
  }

  async function deployBase() {
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
    const registry = await viem.deployContract("CreatorFirstCreatorRegistry", [admin.account.address]);
    await registry.write.registerCreator(
      [hash("cfp-0002:creator-profile"), creatorApplicant.account.address],
      { account: creatorApplicant.account },
    );
    const creator = await registry.read.creators([1n]);
    const creatorRegisteredAt = creator[3];
    const creatorScopeId = hash("creator-scope:cfp-0002");
    const adapter = await viem.deployContract("CreatorFirstCreatorRegistrationAdapter", [
      admin.account.address,
      registry.address,
    ]);
    await adapter.write.linkCreatorScope([creatorScopeId, 1n]);
    const factory = await viem.deployContract("CreatorFirstCFP0002DeploymentFactory", [governor.address]);

    const now = await networkHelpers.time.latest();
    const votingStartsAt = BigInt(now + 30);
    const votingEndsAt = votingStartsAt + 120n;
    const sessionEndsAt = votingEndsAt + 120n;
    await governor.write.createSession([
      hash("cfp-0002:governance-rule:v1"),
      votingStartsAt,
      sessionEndsAt,
      10,
      2,
      2,
    ]);
    for (const [member, house] of [
      [creatorA, 1],
      [creatorB, 1],
      [userA, 2],
      [userB, 2],
    ] as const) {
      await governor.write.registerMember([1n, member.account.address, house]);
    }

    const cfpHash = await sourceHash("docs/proposals/CFP-0002-early-supporter-one-year-rule.md");
    const specificationHash = await sourceHash("protocol/account/early-supporter-credential-spec.md");
    const deploymentSalt = hash("CFP-0002:revision:1:policy:v1");
    const callData = encodeFunctionData({
      abi: factory.abi,
      functionName: "deployPolicy",
      args: [deploymentSalt, adapter.address, cfpHash, specificationHash],
    });
    const manifestHash = keccak256(
      toBytes(`CFP-0002:${chainId}:${factory.address}:${keccak256(callData)}`),
    );
    await governor.write.registerProposal([
      1n,
      cfpHash,
      specificationHash,
      manifestHash,
      2,
      factory.address,
      0n,
      keccak256(callData),
      votingStartsAt,
      votingEndsAt,
    ]);

    return {
      governor,
      registry,
      adapter,
      factory,
      cfpHash,
      specificationHash,
      deploymentSalt,
      callData,
      creatorScopeId,
      creatorRegisteredAt,
      votingStartsAt,
      votingEndsAt,
    };
  }

  async function recordPassingReviewAndDeliberation(
    governor: Awaited<ReturnType<typeof viem.deployContract>>,
  ) {
    const charterEvidenceHash = await sourceHash(
      "docs/proposals/reviews/CFP-0002-charter-review.md",
    );
    const legalEvidenceHash = await sourceHash(
      "docs/proposals/reviews/CFP-0002-legal-review.md",
    );
    const creatorDeliberationHash = await sourceHash(
      "docs/proposals/records/CFP-0002/revision-0001/creator-house/minutes-001.md",
    );
    const userDeliberationHash = await sourceHash(
      "docs/proposals/records/CFP-0002/revision-0001/user-house/minutes-001.md",
    );
    await governor.write.recordPreVoteReview([
      1n,
      charterEvidenceHash,
      legalEvidenceHash,
      hash("CFP-0002:assessment:v1"),
      true,
    ]);
    await governor.write.recordHouseDeliberation([
      1n,
      1,
      creatorDeliberationHash,
    ]);
    await governor.write.recordHouseDeliberation([
      1n,
      2,
      userDeliberationHash,
    ]);
  }

  async function castPassingBallots(
    governor: Awaited<ReturnType<typeof viem.deployContract>>,
  ) {
    await governor.write.castVote([1n, 2], { account: creatorA.account });
    await governor.write.castVote([1n, 1], { account: creatorB.account });
    await governor.write.castVote([1n, 2], { account: userA.account });
    await governor.write.castVote([1n, 1], { account: userB.account });
  }

  it("blocks deliberation and voting when the legal/charter assessment does not pass", async () => {
    const { governor, votingStartsAt } = await deployBase();
    await governor.write.recordPreVoteReview([
      1n,
      hash("charter-review:recorded"),
      hash("legal-review:blocking-issue"),
      hash("assessment:reasoned-return-required"),
      false,
    ]);
    await assert.rejects(
      governor.write.recordHouseDeliberation([1n, 1, hash("creator-house:premature")]),
    );
    await networkHelpers.time.increaseTo(votingStartsAt);
    await assert.rejects(governor.write.castVote([1n, 1], { account: creatorA.account }));
  });

  it("requires both House deliberation records before legislators can vote", async () => {
    const { governor, votingStartsAt } = await deployBase();
    await governor.write.recordPreVoteReview([
      1n,
      hash("charter-review:passed"),
      hash("legal-review:passed"),
      hash("assessment:passed"),
      true,
    ]);
    await governor.write.recordHouseDeliberation([1n, 1, hash("creator-house:complete")]);
    await networkHelpers.time.increaseTo(votingStartsAt);
    await assert.rejects(governor.write.castVote([1n, 1], { account: creatorA.account }));
  });

  it("blocks implementation review and deployment when contract tests fail", async () => {
    const { governor, callData, votingStartsAt, votingEndsAt } = await deployBase();
    await recordPassingReviewAndDeliberation(governor);
    await networkHelpers.time.increaseTo(votingStartsAt);
    await castPassingBallots(governor);
    await networkHelpers.time.increaseTo(votingEndsAt);
    await governor.write.finalizeProposal([1n]);

    await governor.write.recordContractTestEvidence([
      1n,
      hash("CFP-0002:tested-source"),
      hash("CFP-0002:tested-artifact"),
      hash("CFP-0002:test-suite"),
      hash("CFP-0002:test-report:failed"),
      keccak256(callData),
      false,
    ]);
    await assert.rejects(
      governor.write.recordReview([1n, hash("CFP-0002:implementation-review")]),
    );
    await assert.rejects(governor.write.queueProposal([1n]));
  });

  it("deploys the exact CFP-0002 policy only after bicameral approval, review and timelock", async () => {
    const {
      governor,
      adapter,
      factory,
      cfpHash,
      specificationHash,
      deploymentSalt,
      callData,
      creatorScopeId,
      creatorRegisteredAt,
      votingStartsAt,
      votingEndsAt,
    } = await deployBase();
    await recordPassingReviewAndDeliberation(governor);
    await assert.rejects(
      factory.write.deployPolicy(
        [deploymentSalt, adapter.address, cfpHash, specificationHash],
        { account: outsider.account },
      ),
    );
    const predicted = await factory.read.predictPolicyAddress([
      deploymentSalt,
      adapter.address,
      cfpHash,
      specificationHash,
    ]);
    assert.ok(!(await publicClient.getBytecode({ address: predicted })));

    await networkHelpers.time.increaseTo(votingStartsAt);
    await castPassingBallots(governor);
    await networkHelpers.time.increaseTo(votingEndsAt);
    await governor.write.finalizeProposal([1n]);
    const proposal = await governor.read.proposals([1n]);
    assert.equal(proposal[16], true);
    assert.equal(proposal[17], true);
    assert.equal(await governor.read.proposalState([1n]), 5);

    await assert.rejects(
      governor.write.recordReview([1n, hash("CFP-0002:implementation-security-review:passed")]),
    );
    await assert.rejects(
      governor.write.recordContractTestEvidence([
        1n,
        await sourceHash("contracts/testnet/CreatorFirstCFP0002DeploymentFactory.sol"),
        await policyArtifactHash(),
        await sourceHash("test/CreatorFirstCFP0002Governance.ts"),
        await sourceHash("docs/proposals/reviews/CFP-0002-contract-test-evidence.md"),
        hash("different-calldata"),
        true,
      ]),
    );
    await governor.write.recordContractTestEvidence([
      1n,
      await sourceHash("contracts/testnet/CreatorFirstCFP0002DeploymentFactory.sol"),
      await policyArtifactHash(),
      await sourceHash("test/CreatorFirstCFP0002Governance.ts"),
      await sourceHash("docs/proposals/reviews/CFP-0002-contract-test-evidence.md"),
      keccak256(callData),
      true,
    ]);
    await governor.write.recordReview([1n, hash("CFP-0002:implementation-security-review:passed")]);
    await governor.write.queueProposal([1n]);
    await assert.rejects(governor.write.executeProposal([1n, callData]));
    assert.ok(!(await publicClient.getBytecode({ address: predicted })));

    const queuedProposal = await governor.read.proposals([1n]);
    await networkHelpers.time.increaseTo(queuedProposal[9]);
    const wrongCallData = encodeFunctionData({
      abi: factory.abi,
      functionName: "deployPolicy",
      args: [hash("wrong-salt"), adapter.address, cfpHash, specificationHash],
    });
    await assert.rejects(governor.write.executeProposal([1n, wrongCallData]));
    await governor.write.executeProposal([1n, callData]);

    assert.equal(await factory.read.deployments([deploymentSalt]), predicted);
    assert.ok(await publicClient.getBytecode({ address: predicted }));
    const policy = await viem.getContractAt("CreatorFirstCFP0002EarlySupporterPolicy", predicted);
    assert.equal(await policy.read.WINDOW_SECONDS(), 31_536_000n);
    assert.equal(await policy.read.cfpContentHash(), cfpHash);
    assert.equal(await policy.read.specificationHash(), specificationHash);
    assert.equal(await policy.read.qualifiesAt([creatorScopeId, creatorRegisteredAt]), true);
    assert.equal(
      await policy.read.qualifiesAt([creatorScopeId, creatorRegisteredAt + 31_535_999n]),
      true,
    );
    assert.equal(
      await policy.read.qualifiesAt([creatorScopeId, creatorRegisteredAt + 31_536_000n]),
      false,
    );
    assert.equal(await governor.read.proposalState([1n]), 8);
  });
});
