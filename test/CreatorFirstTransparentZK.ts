import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { encodeAbiParameters, keccak256, stringToHex } from "viem";

describe("Creator-first testnet transparent ZK boundary", async () => {
  const { viem } = await network.create();
  const [admin, submitter, outsider] = await viem.getWalletClients();
  const profileId = keccak256(stringToHex("cfp.testnet.transparent-zk.mock.v1"));
  const programHash = keccak256(stringToHex("cfp.testnet.usage-snapshot.mock-program.v1"));
  const mockDomain = keccak256(stringToHex("CFP_TRANSPARENT_ZK_TESTNET_MOCK_V1"));

  async function deployFixture() {
    const verifier = await viem.deployContract("CreatorFirstTransparentZKMockVerifier");
    const registry = await viem.deployContract("CreatorFirstTransparentZKRegistry", [
      admin.account.address,
      admin.account.address,
      admin.account.address,
    ]);
    await registry.write.registerMockProfile([profileId, verifier.address, programHash], {
      account: admin.account,
    });
    return { verifier, registry };
  }

  function mockProof(publicInputsHash: `0x${string}`) {
    const digest = keccak256(encodeAbiParameters(
      [{ type: "bytes32" }, { type: "bytes32" }, { type: "bytes32" }],
      [mockDomain, programHash, publicInputsHash],
    ));
    return encodeAbiParameters([{ type: "bytes32" }], [digest]);
  }

  it("records a chain-bound receipt for the explicit testnet mock profile", async () => {
    const { registry } = await deployFixture();
    const externalStatementId = keccak256(stringToHex("usage-period:2026-08-demo"));
    const publicInputsHash = keccak256(stringToHex("synthetic-aggregate:42"));

    await registry.write.verifyAndRecord([
      profileId,
      externalStatementId,
      publicInputsHash,
      mockProof(publicInputsHash),
    ], { account: submitter.account });

    const receiptId = keccak256(encodeAbiParameters(
      [
        { type: "uint256" },
        { type: "address" },
        { type: "bytes32" },
        { type: "bytes32" },
        { type: "bytes32" },
      ],
      [31337n, registry.address, profileId, externalStatementId, publicInputsHash],
    ));
    const receipt = await registry.read.receipts([receiptId]);
    assert.equal(receipt[0], profileId);
    assert.equal(receipt[1], publicInputsHash);
    assert.equal(receipt[3].toLowerCase(), submitter.account.address.toLowerCase());
    assert.ok(receipt[4] > 0n);
  });

  it("rejects an invalid mock proof and receipt replay", async () => {
    const { registry } = await deployFixture();
    const externalStatementId = keccak256(stringToHex("statement:one"));
    const publicInputsHash = keccak256(stringToHex("public-inputs:one"));

    await assert.rejects(registry.write.verifyAndRecord([
      profileId,
      externalStatementId,
      publicInputsHash,
      encodeAbiParameters([{ type: "bytes32" }], [keccak256(stringToHex("invalid"))]),
    ], { account: submitter.account }));

    const proof = mockProof(publicInputsHash);
    await registry.write.verifyAndRecord([
      profileId,
      externalStatementId,
      publicInputsHash,
      proof,
    ], { account: submitter.account });
    await assert.rejects(registry.write.verifyAndRecord([
      profileId,
      externalStatementId,
      publicInputsHash,
      proof,
    ], { account: submitter.account }));
  });

  it("separates profile policy and pause authority from proof submission", async () => {
    const { verifier, registry } = await deployFixture();
    const secondProfile = keccak256(stringToHex("cfp.testnet.transparent-zk.mock.v2"));
    const secondProgram = keccak256(stringToHex("program:v2"));

    await assert.rejects(registry.write.registerMockProfile([
      secondProfile,
      verifier.address,
      secondProgram,
    ], { account: outsider.account }));
    await registry.write.deprecateProfile([profileId], { account: admin.account });
    await assert.rejects(registry.write.verifyAndRecord([
      profileId,
      keccak256(stringToHex("statement:deprecated")),
      keccak256(stringToHex("inputs:deprecated")),
      "0x",
    ], { account: submitter.account }));

    await registry.write.pause({ account: admin.account });
    await registry.write.registerMockProfile([
      secondProfile,
      verifier.address,
      secondProgram,
    ], { account: admin.account });
    await assert.rejects(registry.write.verifyAndRecord([
      secondProfile,
      keccak256(stringToHex("statement:paused")),
      keccak256(stringToHex("inputs:paused")),
      "0x",
    ], { account: submitter.account }));
  });
});
