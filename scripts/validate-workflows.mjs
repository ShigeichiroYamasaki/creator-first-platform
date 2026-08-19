import { readdir, readFile } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const defaultRoot = fileURLToPath(new URL('../', import.meta.url))

function option(name, fallback) {
  const index = process.argv.indexOf(name)
  if (index === -1) return fallback
  if (!process.argv[index + 1]) {
    console.error(`Workflow validation failed:\n- ${name} requires a path`)
    process.exit(1)
  }
  return resolve(process.argv[index + 1])
}

const root = option('--project-root', defaultRoot)
const workflowDirectory = option('--workflow-dir', join(root, '.github/workflows'))
const files = (await readdir(workflowDirectory))
  .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
  .map((name) => join(workflowDirectory, name))

const errors = []
let actionReferenceCount = 0
let deploymentGateCount = 0

for (const file of files) {
  const source = await readFile(file, 'utf8')
  const lines = source.split('\n')
  const displayPath = relative(root, file)

  for (const [index, line] of lines.entries()) {
    const action = line.match(/^\s*uses:\s+([^\s#]+)@([^\s#]+)/)
    if (!action) continue

    actionReferenceCount += 1
    const [, repository, reference] = action
    if (!/^[0-9a-f]{40}$/.test(reference)) {
      errors.push(`${displayPath}:${index + 1}: ${repository} must use a full 40-character commit SHA`)
    }

    if (repository === 'actions/checkout') {
      const followingStep = lines.slice(index + 1, index + 6).join('\n')
      if (!/persist-credentials:\s*false/.test(followingStep)) {
        errors.push(`${displayPath}:${index + 1}: checkout must set persist-credentials: false`)
      }
    }
  }
}

const deployWorkflowPath = join(workflowDirectory, 'deploy-pages.yml')
const deployWorkflow = await readFile(deployWorkflowPath, 'utf8')
const deploymentGates = [
  ['deploy only after changes reach main', /push:\s*\n\s+branches:\s*\n\s+- main/],
  ['retain manual recovery dispatch', /\n\s+workflow_dispatch:/],
  ['deny permissions by default', /\npermissions:\s*\{\}/],
  ['run the complete validation command before upload', /run:\s*npm run validate/],
  ['upload the VitePress build directory', /path:\s*docs\/\.vitepress\/dist/],
  ['make deploy depend on build', /\n\s+needs:\s*build/],
  ['deploy through the github-pages environment', /\n\s+name:\s*github-pages/],
  ['grant pages write only to the deploy job', /\n\s+pages:\s*write/],
  ['grant OIDC token write only to the deploy job', /\n\s+id-token:\s*write/],
  ['publish the deployment action page URL', /url:\s*\$\{\{\s*steps\.deployment\.outputs\.page_url\s*\}\}/],
  ['expose the deployed page URL to verification', /page_url:\s*\$\{\{\s*steps\.deployment\.outputs\.page_url\s*\}\}/],
  ['make publication verification depend on deploy', /\n\s{2}verify:\n\s{4}needs:\s*deploy/],
  ['verify the published URL against the workflow commit', /run:\s*node scripts\/verify-deployment\.mjs --base-url "\$\{\{\s*needs\.deploy\.outputs\.page_url\s*\}\}" --expected-sha "\$\{\{\s*github\.sha\s*\}\}"/]
]

for (const [description, pattern] of deploymentGates) {
  deploymentGateCount += 1
  if (!pattern.test(deployWorkflow)) {
    errors.push(`.github/workflows/deploy-pages.yml: deployment workflow must ${description}`)
  }
}

const validationWorkflowPath = join(workflowDirectory, 'validate-docs.yml')
const validationWorkflow = await readFile(validationWorkflowPath, 'utf8')
const pullRequestGates = [
  ['run for pull requests', /\n\s+pull_request:/],
  ['run the same complete validation command', /run:\s*npm run validate/]
]

for (const [description, pattern] of pullRequestGates) {
  deploymentGateCount += 1
  if (!pattern.test(validationWorkflow)) {
    errors.push(`.github/workflows/validate-docs.yml: validation workflow must ${description}`)
  }
}

if (errors.length) {
  console.error('Workflow validation failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`Workflow validation passed: ${files.length} workflow(s), ${actionReferenceCount} pinned action reference(s), ${deploymentGateCount} publication gate(s).`)
