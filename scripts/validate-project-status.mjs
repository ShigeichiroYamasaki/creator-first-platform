import { readdir, readFile } from 'node:fs/promises'
import { isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const defaultRoot = fileURLToPath(new URL('../', import.meta.url))

function pathArgument(arguments_, option, fallback, base = defaultRoot) {
  const optionIndex = arguments_.indexOf(option)
  if (optionIndex === -1) return fallback

  const value = arguments_[optionIndex + 1]
  if (!value || value.startsWith('--')) {
    console.error(`Project status validation failed: ${option} requires a path`)
    process.exit(2)
  }

  return isAbsolute(value) ? value : resolve(base, value)
}

async function filesMatching(directory, suffix) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await filesMatching(path, suffix))
    if (entry.isFile() && entry.name.endsWith(suffix)) files.push(path)
  }

  return files.sort()
}

function metadata(source, ...labels) {
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const value = source.match(new RegExp(`^\\*\\*${escaped}:\\*\\*\\s+(.+?)\\s*$`, 'm'))?.[1]
    if (value) return value
  }
  return undefined
}

function tableRow(source, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = source.match(new RegExp(`^\\|\\s*${escaped}\\s*\\|\\s*([^|]+?)\\s*\\|\\s*([^|]+?)\\s*\\|`, 'm'))
  return match ? { status: match[1].trim(), evidence: match[2].trim() } : undefined
}

function isoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return undefined
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) return undefined
  return date
}

const arguments_ = process.argv.slice(2)
const root = pathArgument(arguments_, '--project-root', defaultRoot)
const statusPath = pathArgument(arguments_, '--status-file', join(root, 'docs/status.md'), root)
const adrDirectory = pathArgument(arguments_, '--adr-dir', join(root, 'docs/adr'), root)
const protocolDirectory = pathArgument(arguments_, '--protocol-dir', join(root, 'protocol'), root)
const deploymentManifestPath = pathArgument(arguments_, '--deployment-manifest', join(root, 'docs/public/testnet/deployment.json'), root)

const errors = []
const statusSource = await readFile(statusPath, 'utf8')
const adrFiles = (await filesMatching(adrDirectory, '.md'))
  .filter((file) => /ADR-\d{4}-.+\.md$/.test(file) && !/ \d+\.md$/.test(file))
const specificationFiles = (await filesMatching(protocolDirectory, '-spec.md'))
  .filter((file) => !file.includes(`${join(protocolDirectory, 'templates')}/`))
let deploymentManifest
try {
  deploymentManifest = JSON.parse(await readFile(deploymentManifestPath, 'utf8'))
} catch (error) {
  if (error.code !== 'ENOENT') {
    errors.push(`${deploymentManifestPath}: invalid deployment manifest (${error.message})`)
  }
}

const basisDate = statusSource.match(/> \*\*基準日:\s*(\d{4}-\d{2}-\d{2})\*\*/)?.[1]
const parsedBasisDate = isoDate(basisDate)
if (!parsedBasisDate) {
  errors.push('docs/status.md: missing or invalid YYYY-MM-DD basis date')
}

const adrStatuses = new Set()
const sourceDates = []
for (const file of adrFiles) {
  const source = await readFile(file, 'utf8')
  const status = metadata(source, 'Status', '状態')
  const date = metadata(source, 'Date', '日付')
  const lastUpdated = metadata(source, 'Last Updated', '最終更新日')
  if (!status) errors.push(`${file}: missing Status metadata`)
  else adrStatuses.add(status)
  if (!isoDate(date)) errors.push(`${file}: missing or invalid Date metadata`)
  if (!isoDate(lastUpdated)) {
    errors.push(`${file}: missing or invalid Last Updated metadata`)
  } else {
    sourceDates.push({ date: lastUpdated, file })
    if (isoDate(date) && isoDate(lastUpdated) < isoDate(date)) {
      errors.push(`${file}: Last Updated ${lastUpdated} predates Date ${date}`)
    }
  }
}

const specificationStatuses = new Set()
const specificationVersions = new Set()
for (const file of specificationFiles) {
  const source = await readFile(file, 'utf8')
  const status = metadata(source, 'Status')
  const version = metadata(source, 'Version')
  const lastUpdated = metadata(source, 'Last Updated')
  if (!status) errors.push(`${file}: missing Status metadata`)
  else specificationStatuses.add(status)
  if (!version) errors.push(`${file}: missing Version metadata`)
  else specificationVersions.add(version)
  if (!isoDate(lastUpdated)) errors.push(`${file}: missing or invalid Last Updated metadata`)
  else sourceDates.push({ date: lastUpdated, file })
}

if (parsedBasisDate) {
  for (const { date, file } of sourceDates) {
    if (isoDate(date) > parsedBasisDate) {
      errors.push(`docs/status.md: basis date ${basisDate} predates ${date} in ${file}`)
    }
  }
}

const adrRow = tableRow(statusSource, 'ADR')
if (!adrRow) {
  errors.push('docs/status.md: missing ADR maturity row')
} else {
  if (adrStatuses.size !== 1 || !adrStatuses.has(adrRow.status)) {
    errors.push(`docs/status.md: ADR status ${adrRow.status} does not match source statuses ${[...adrStatuses].join(', ') || '(none)'}`)
  }
  if (!new RegExp(`(?:^|\\D)${adrFiles.length}件(?:\\D|$)`).test(adrRow.evidence)) {
    errors.push(`docs/status.md: ADR evidence must report ${adrFiles.length}件`)
  }
}

const protocolRow = tableRow(statusSource, 'Protocol') ?? tableRow(statusSource, 'プロトコル')
if (!protocolRow) {
  errors.push('docs/status.md: missing Protocol maturity row')
} else {
  const expectedStatuses = [...specificationStatuses]
  const expectedVersions = [...specificationVersions]
  if (expectedStatuses.length !== 1 || expectedVersions.length !== 1) {
    errors.push('protocol specifications must share one Status and Version for the maturity summary')
  } else {
    const expectedStatus = `${expectedStatuses[0]} ${expectedVersions[0]}`
    const localizedStatus = `${expectedStatuses[0] === 'Draft' ? '草案' : expectedStatuses[0]} ${expectedVersions[0]}`
    if (![expectedStatus, localizedStatus].includes(protocolRow.status)) {
      errors.push(`docs/status.md: Protocol status ${protocolRow.status} does not match ${expectedStatus}`)
    }
  }
  if (!new RegExp(`(?:^|\\D)${specificationFiles.length}仕様(?:\\D|$)`).test(protocolRow.evidence)) {
    errors.push(`docs/status.md: Protocol evidence must report ${specificationFiles.length}仕様`)
  }
}

const governanceContractsPublished = Boolean(
  deploymentManifest?.contracts?.governor && deploymentManifest?.contracts?.governedPolicy
)
if (governanceContractsPublished) {
  const governanceRow = tableRow(statusSource, 'DAOガバナンス')
  if (!governanceRow) {
    errors.push('docs/status.md: missing DAOガバナンス maturity row for published governance contracts')
  } else {
    if (governanceRow.status.includes('公開デプロイ前')) {
      errors.push('docs/status.md: DAOガバナンス must not say 公開デプロイ前 when governance contracts are published')
    }
    if (!governanceRow.status.includes('Sepolia') || !governanceRow.status.includes('デプロイ済み')) {
      errors.push('docs/status.md: DAOガバナンス must report Sepolia deployment when governance contracts are published')
    }
    if (!governanceRow.evidence.includes('二院制') || !governanceRow.evidence.includes('デモポリシー')) {
      errors.push('docs/status.md: DAOガバナンス evidence must identify the published 二院制ガバナー and デモポリシー')
    }
  }
}

if (errors.length) {
  console.error(`Project status validation failed with ${errors.length} error(s):`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`Project status validation passed: basis ${basisDate}, ${adrFiles.length} ADR(s), ${specificationFiles.length} protocol specification(s).`)
