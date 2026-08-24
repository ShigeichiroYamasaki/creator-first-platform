import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const validator = fileURLToPath(new URL('./validate-workflows.mjs', import.meta.url))
const checkoutSha = 'fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09'
const setupNodeSha = '249970729cb0ef3589644e2896645e5dc5ba9c38'
const uploadSha = '56afc609e74202658d3ffba0e8f6dda462b719fa'
const deploySha = 'd6db90164ac5ed86f2b6aed7e0febac5b3c0c03e'

function deployWorkflow() {
  return `name: Deploy
on:
  push:
    branches:
      - main
  workflow_dispatch:
permissions: {}
jobs:
  build:
    permissions:
      contents: read
    steps:
      - name: Checkout
        uses: actions/checkout@${checkoutSha}
        with:
          persist-credentials: false
      - name: Setup Node
        uses: actions/setup-node@${setupNodeSha}
      - run: npm run validate
      - name: Upload
        uses: actions/upload-pages-artifact@${uploadSha}
        with:
          path: docs/.vitepress/dist
  deploy:
    outputs:
      page_url: \${{ steps.deployment.outputs.page_url }}
    needs: build
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    permissions:
      pages: write
      id-token: write
    steps:
      - id: deployment
        uses: actions/deploy-pages@${deploySha}
  verify:
    needs: deploy
    permissions:
      contents: read
    steps:
      - name: Checkout
        uses: actions/checkout@${checkoutSha}
        with:
          persist-credentials: false
      - name: Setup Node
        uses: actions/setup-node@${setupNodeSha}
      - run: node scripts/verify-deployment.mjs --base-url "\${{ needs.deploy.outputs.page_url }}" --expected-sha "\${{ github.sha }}"
`
}

function validationWorkflow() {
  return `name: Validate
on:
  pull_request:
  workflow_dispatch:
permissions:
  contents: read
jobs:
  build:
    steps:
      - name: Checkout
        uses: actions/checkout@${checkoutSha}
        with:
          persist-credentials: false
      - run: npm run validate
`
}

function dependabotConfiguration() {
  return `version: 2
updates:
  - package-ecosystem: npm
    directory: /
    rebase-strategy: disabled
    schedule:
      interval: weekly
    ignore:
      - dependency-name: "markdown-it-mathjax3"
        update-types:
          - "version-update:semver-major"
`
}

async function runValidator(transform = (files) => files) {
  const directory = await mkdtemp(join(tmpdir(), 'creator-first-workflows-'))
  const workflowDirectory = join(directory, '.github/workflows')

  try {
    await mkdir(workflowDirectory, { recursive: true })
    const files = transform({
      'deploy-pages.yml': deployWorkflow(),
      'validate-docs.yml': validationWorkflow()
    })
    for (const [name, source] of Object.entries(files)) {
      await writeFile(join(workflowDirectory, name), source, 'utf8')
    }
    const dependabotPath = join(directory, '.github/dependabot.yml')
    await writeFile(dependabotPath, dependabotConfiguration(), 'utf8')

    return spawnSync(process.execPath, [
      validator,
      '--project-root', directory,
      '--workflow-dir', workflowDirectory,
      '--dependabot-file', dependabotPath
    ], { encoding: 'utf8' })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

test('accepts pinned actions and all publication gates', async () => {
  const result = await runValidator()

  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /2 workflow\(s\), 7 pinned action reference\(s\), 15 publication gate\(s\), 2 dependency update gate\(s\)/)
})

test('rejects an action tag instead of a full commit SHA', async () => {
  const result = await runValidator((files) => ({
    ...files,
    'deploy-pages.yml': files['deploy-pages.yml'].replace(checkoutSha, 'v5')
  }))

  assert.equal(result.status, 1)
  assert.match(result.stderr, /actions\/checkout must use a full 40-character commit SHA/)
})

test('rejects checkout that persists credentials', async () => {
  const result = await runValidator((files) => ({
    ...files,
    'validate-docs.yml': files['validate-docs.yml'].replace('persist-credentials: false', 'persist-credentials: true')
  }))

  assert.equal(result.status, 1)
  assert.match(result.stderr, /checkout must set persist-credentials: false/)
})

test('rejects deployment without the complete validation command', async () => {
  const result = await runValidator((files) => ({
    ...files,
    'deploy-pages.yml': files['deploy-pages.yml'].replace('npm run validate', 'npm run docs:build')
  }))

  assert.equal(result.status, 1)
  assert.match(result.stderr, /deployment workflow must run the complete validation command before upload/)
})

test('rejects deployment without Pages write permission', async () => {
  const result = await runValidator((files) => ({
    ...files,
    'deploy-pages.yml': files['deploy-pages.yml'].replace('pages: write', 'pages: read')
  }))

  assert.equal(result.status, 1)
  assert.match(result.stderr, /deployment workflow must grant pages write only to the deploy job/)
})

test('rejects validation workflow without pull request trigger', async () => {
  const result = await runValidator((files) => ({
    ...files,
    'validate-docs.yml': files['validate-docs.yml'].replace('  pull_request:\n', '')
  }))

  assert.equal(result.status, 1)
  assert.match(result.stderr, /validation workflow must run for pull requests/)
})

test('rejects Dependabot npm updates with automatic rebasing enabled', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'creator-first-workflows-'))
  const workflowDirectory = join(directory, '.github/workflows')
  try {
    await mkdir(workflowDirectory, { recursive: true })
    await writeFile(join(workflowDirectory, 'deploy-pages.yml'), deployWorkflow(), 'utf8')
    await writeFile(join(workflowDirectory, 'validate-docs.yml'), validationWorkflow(), 'utf8')
    const dependabotPath = join(directory, '.github/dependabot.yml')
    await writeFile(dependabotPath, dependabotConfiguration().replace('rebase-strategy: disabled', 'rebase-strategy: auto'), 'utf8')
    const result = spawnSync(process.execPath, [validator, '--project-root', directory, '--workflow-dir', workflowDirectory, '--dependabot-file', dependabotPath], { encoding: 'utf8' })
    assert.equal(result.status, 1)
    assert.match(result.stderr, /must disable automatic rebases for npm update PRs/)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('rejects Dependabot configuration that allows markdown-it-mathjax3 major updates', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'creator-first-workflows-'))
  const workflowDirectory = join(directory, '.github/workflows')
  try {
    await mkdir(workflowDirectory, { recursive: true })
    await writeFile(join(workflowDirectory, 'deploy-pages.yml'), deployWorkflow(), 'utf8')
    await writeFile(join(workflowDirectory, 'validate-docs.yml'), validationWorkflow(), 'utf8')
    const dependabotPath = join(directory, '.github/dependabot.yml')
    await writeFile(dependabotPath, dependabotConfiguration().replace('"version-update:semver-major"', '"version-update:semver-minor"'), 'utf8')
    const result = spawnSync(process.execPath, [validator, '--project-root', directory, '--workflow-dir', workflowDirectory, '--dependabot-file', dependabotPath], { encoding: 'utf8' })
    assert.equal(result.status, 1)
    assert.match(result.stderr, /must defer markdown-it-mathjax3 major updates/)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
