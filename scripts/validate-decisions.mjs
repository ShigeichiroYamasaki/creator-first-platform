import { readdir, readFile } from 'node:fs/promises'
import { isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'

const defaultRoot = fileURLToPath(new URL('../', import.meta.url))

function pathArgument(arguments_, option, fallback, base = defaultRoot) {
  const index = arguments_.indexOf(option)
  if (index === -1) return fallback
  const value = arguments_[index + 1]
  if (!value || value.startsWith('--')) {
    console.error(`Decision validation failed: ${option} requires a path`)
    process.exit(2)
  }
  return isAbsolute(value) ? value : resolve(base, value)
}

async function specificationFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    if (entry.name === 'templates') continue
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await specificationFiles(path))
    if (entry.isFile() && entry.name.endsWith('-spec.md')) files.push(path)
  }
  return files
}

function loadYaml(source, displayPath, errors) {
  try {
    return parse(source)
  } catch (error) {
    errors.push(`${displayPath}: invalid YAML: ${error.message}`)
    return {}
  }
}

const arguments_ = process.argv.slice(2)
const root = pathArgument(arguments_, '--project-root', defaultRoot)
const protocolDirectory = pathArgument(arguments_, '--protocol-dir', join(root, 'protocol'), root)
const registerPath = pathArgument(arguments_, '--register', join(root, 'decisions/decision-register.yaml'), root)
const assumptionsPath = pathArgument(arguments_, '--assumptions', join(root, 'decisions/mock-assumptions.yaml'), root)
const errors = []
const specifications = new Map()
const questions = new Map()
const questionPattern = /^- \*\*(OQ-[A-Z0-9-]+-[0-9]{3}):\*\* \*\*Decision owner:\*\* ([^;]+); \*\*Blocks:\*\* ([^;]+); \*\*Question:\*\* (.+\?)$/gm

for (const file of await specificationFiles(protocolDirectory)) {
  const source = await readFile(file, 'utf8')
  const displayPath = relative(root, file)
  const id = source.match(/^\*\*Specification ID:\*\*\s+([A-Z0-9-]+)/m)?.[1]
  const version = source.match(/^\*\*Version:\*\*\s+(\d+\.\d+\.\d+)\s*$/m)?.[1]
  if (!id || !version) {
    errors.push(`${displayPath}: missing Specification ID or Version`)
    continue
  }
  specifications.set(id, { path: displayPath, version })
  for (const match of source.matchAll(questionPattern)) {
    const [, questionId, ownerRole, blocks, question] = match
    questions.set(questionId, { specificationId: id, ownerRole, blocks, question })
  }
}

const register = loadYaml(await readFile(registerPath, 'utf8'), relative(root, registerPath), errors)
const assumptions = loadYaml(await readFile(assumptionsPath, 'utf8'), relative(root, assumptionsPath), errors)

if (register.schema_version !== '0.1.0') errors.push('decision-register.yaml: schema_version must be 0.1.0')
if (register.status !== 'DRAFT') errors.push('decision-register.yaml: status must remain DRAFT during IMP-001')
if (!Array.isArray(register.source_specifications)) errors.push('decision-register.yaml: source_specifications must be an array')

const registeredSpecifications = new Set()
for (const entry of register.source_specifications ?? []) {
  if (!entry || typeof entry !== 'object') {
    errors.push('decision-register.yaml: each source_specifications entry must be an object')
    continue
  }
  if (registeredSpecifications.has(entry.id)) {
    errors.push(`decision-register.yaml: duplicate source specification ${entry.id}`)
    continue
  }
  registeredSpecifications.add(entry.id)
  const actual = specifications.get(entry.id)
  if (!actual) {
    errors.push(`decision-register.yaml: unknown source specification ${entry.id}`)
    continue
  }
  if (entry.path !== actual.path) {
    errors.push(`decision-register.yaml: ${entry.id} path must be ${actual.path}`)
  }
  if (entry.version !== actual.version) {
    errors.push(`decision-register.yaml: ${entry.id} version must be ${actual.version}`)
  }
}

for (const id of specifications.keys()) {
  if (!registeredSpecifications.has(id)) {
    errors.push(`decision-register.yaml: missing source specification ${id}`)
  }
}

const defaults = register.question_defaults ?? {}
for (const [field, expected] of Object.entries({
  assignment: 'UNASSIGNED',
  state: 'OPEN',
  implementation: 'BLOCKED'
})) {
  if (defaults[field] !== expected) {
    errors.push(`decision-register.yaml: question_defaults.${field} must be ${expected}`)
  }
}
if (defaults.decision_record !== null) {
  errors.push('decision-register.yaml: question_defaults.decision_record must be null')
}

const overrides = register.overrides ?? {}
if (!overrides || Array.isArray(overrides) || typeof overrides !== 'object') {
  errors.push('decision-register.yaml: overrides must be an object')
}

const decisionStates = new Set(['OPEN', 'DEFERRED', 'DECIDED', 'WITHDRAWN'])
const implementationStates = new Set(['BLOCKED', 'ALLOWED'])
for (const [questionId, override] of Object.entries(overrides)) {
  if (!questions.has(questionId)) {
    errors.push(`decision-register.yaml: override references unknown ${questionId}`)
    continue
  }
  if (!override || Array.isArray(override) || typeof override !== 'object') {
    errors.push(`decision-register.yaml: ${questionId} override must be an object`)
    continue
  }
  const state = override.state ?? defaults.state
  const implementation = override.implementation ?? defaults.implementation
  const assignment = override.assignment ?? defaults.assignment
  const decisionRecord = override.decision_record ?? defaults.decision_record
  if (!decisionStates.has(state)) errors.push(`decision-register.yaml: ${questionId} has invalid state ${state}`)
  if (!implementationStates.has(implementation)) errors.push(`decision-register.yaml: ${questionId} has invalid implementation ${implementation}`)
  if (['OPEN', 'DEFERRED'].includes(state) && (implementation !== 'BLOCKED' || decisionRecord !== null)) {
    errors.push(`decision-register.yaml: unresolved ${questionId} must remain BLOCKED without a decision record`)
  }
  if (state === 'DECIDED') {
    if (assignment === 'UNASSIGNED') errors.push(`decision-register.yaml: decided ${questionId} requires a public assignment`)
    if (typeof decisionRecord !== 'string' || !decisionRecord.trim()) errors.push(`decision-register.yaml: decided ${questionId} requires decision_record`)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(override.decided_at ?? '')) errors.push(`decision-register.yaml: decided ${questionId} requires decided_at YYYY-MM-DD`)
  }
  if (state === 'WITHDRAWN' && (implementation !== 'BLOCKED' || typeof decisionRecord !== 'string' || !decisionRecord.trim())) {
    errors.push(`decision-register.yaml: withdrawn ${questionId} requires a decision record and must remain BLOCKED`)
  }
}

if (assumptions.schema_version !== '0.1.0') errors.push('mock-assumptions.yaml: schema_version must be 0.1.0')
if (assumptions.status !== 'DRAFT') errors.push('mock-assumptions.yaml: status must remain DRAFT during IMP-001')
if (!Array.isArray(assumptions.assumptions)) errors.push('mock-assumptions.yaml: assumptions must be an array')

const assumptionIds = new Set()
for (const assumption of assumptions.assumptions ?? []) {
  const id = assumption?.id
  if (!/^MOCK-ASSUMPTION-[0-9]{3}$/.test(id ?? '')) {
    errors.push(`mock-assumptions.yaml: invalid assumption ID ${id ?? '(missing)'}`)
    continue
  }
  if (assumptionIds.has(id)) errors.push(`mock-assumptions.yaml: duplicate assumption ID ${id}`)
  assumptionIds.add(id)
  if (!['ACTIVE', 'RETIRED'].includes(assumption.state)) errors.push(`mock-assumptions.yaml: ${id} state must be ACTIVE or RETIRED`)
  if (!Array.isArray(assumption.scope) || assumption.scope.length === 0 || assumption.scope.some((value) => !/^IMP-[0-9]{3}$/.test(value))) {
    errors.push(`mock-assumptions.yaml: ${id} requires IMP scope`)
  }
  if (!Array.isArray(assumption.source_questions) || assumption.source_questions.length === 0) {
    errors.push(`mock-assumptions.yaml: ${id} requires source_questions`)
  } else {
    for (const questionId of assumption.source_questions) {
      if (!questions.has(questionId)) errors.push(`mock-assumptions.yaml: ${id} references unknown ${questionId}`)
    }
  }
  for (const field of ['value', 'expires_when']) {
    if (typeof assumption[field] !== 'string' || !assumption[field].trim()) errors.push(`mock-assumptions.yaml: ${id} requires ${field}`)
  }
  if (!Array.isArray(assumption.prohibited_uses) || assumption.prohibited_uses.length === 0) {
    errors.push(`mock-assumptions.yaml: ${id} requires prohibited_uses`)
  }
}

if (errors.length) {
  console.error('Decision validation failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`Decision validation passed: ${specifications.size} source specification(s), ${questions.size} tracked Open Question(s), ${Object.keys(overrides).length} explicit override(s), ${assumptionIds.size} Mock assumption(s).`)
