import { readdir, readFile } from 'node:fs/promises'
import { isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseDocument } from 'yaml'

const defaultRoot = fileURLToPath(new URL('../', import.meta.url))

function pathArgument(arguments_, option, fallback, base = defaultRoot) {
  const optionIndex = arguments_.indexOf(option)
  if (optionIndex === -1) return fallback
  const value = arguments_[optionIndex + 1]
  if (!value || value.startsWith('--')) {
    console.error(`Community file validation failed: ${option} requires a path`)
    process.exit(2)
  }
  return isAbsolute(value) ? value : resolve(base, value)
}

function parseYaml(source, displayPath, errors) {
  const document = parseDocument(source)
  for (const error of document.errors) errors.push(`${displayPath}: ${error.message}`)
  return document.errors.length ? undefined : document.toJS()
}

const arguments_ = process.argv.slice(2)
const root = pathArgument(arguments_, '--project-root', defaultRoot)
const templateDirectory = pathArgument(
  arguments_,
  '--template-dir',
  join(root, '.github/ISSUE_TEMPLATE'),
  root
)
const errors = []
const entries = await readdir(templateDirectory, { withFileTypes: true })
const formFiles = entries
  .filter((entry) => entry.isFile() && entry.name.endsWith('.yml') && entry.name !== 'config.yml')
  .map((entry) => entry.name)
  .sort()

if (formFiles.length === 0) errors.push('.github/ISSUE_TEMPLATE: defines no Issue Forms')

const requiredProtocolDecisionIds = [
  'open-question-id',
  'source-specification',
  'decision-context',
  'options',
  'evidence',
  'affected-parties',
  'decision-owner',
  'required-reviews',
  'impact',
  'acceptance',
  'records-to-update',
  'confirmations'
]
const requiredImplementationIds = [
  'work-package-id',
  'specification-baseline',
  'decision-baseline',
  'scope',
  'out-of-scope',
  'artifacts',
  'dependencies',
  'tests',
  'security-privacy',
  'completion-evidence',
  'rollback',
  'implementation-confirmations'
]

for (const fileName of formFiles) {
  const displayPath = `.github/ISSUE_TEMPLATE/${fileName}`
  const form = parseYaml(await readFile(join(templateDirectory, fileName), 'utf8'), displayPath, errors)
  if (!form) continue
  if (typeof form.name !== 'string' || !form.name.trim()) errors.push(`${displayPath}: missing name`)
  if (typeof form.description !== 'string' || !form.description.trim()) errors.push(`${displayPath}: missing description`)
  if (!Array.isArray(form.body) || form.body.length === 0) {
    errors.push(`${displayPath}: body must be a non-empty array`)
    continue
  }

  const fields = new Map()
  for (const element of form.body) {
    if (!element || typeof element !== 'object') {
      errors.push(`${displayPath}: body contains a non-object element`)
      continue
    }
    if (element.type === 'markdown') continue
    if (typeof element.id !== 'string' || !element.id.trim()) {
      errors.push(`${displayPath}: non-markdown field is missing id`)
      continue
    }
    if (fields.has(element.id)) errors.push(`${displayPath}: duplicate field id ${element.id}`)
    else fields.set(element.id, element)
    if (typeof element.attributes?.label !== 'string' || !element.attributes.label.trim()) {
      errors.push(`${displayPath}: ${element.id} is missing attributes.label`)
    }
  }

  if (fileName === 'protocol-decision.yml') {
    for (const id of requiredProtocolDecisionIds) {
      const field = fields.get(id)
      if (!field) errors.push(`${displayPath}: missing required decision field ${id}`)
      else if (id !== 'confirmations' && field.validations?.required !== true) {
        errors.push(`${displayPath}: ${id} must be required`)
      }
    }

    const confirmations = fields.get('confirmations')
    const options = confirmations?.attributes?.options
    if (!Array.isArray(options) || options.length < 3) {
      errors.push(`${displayPath}: confirmations must define at least three options`)
    } else if (options.some((option) => option?.required !== true)) {
      errors.push(`${displayPath}: every confirmation option must be required`)
    }
  }

  if (fileName === 'implementation-work-package.yml') {
    for (const id of requiredImplementationIds) {
      const field = fields.get(id)
      if (!field) errors.push(`${displayPath}: missing required implementation field ${id}`)
      else if (id !== 'implementation-confirmations' && field.validations?.required !== true) {
        errors.push(`${displayPath}: ${id} must be required`)
      }
    }

    const confirmations = fields.get('implementation-confirmations')
    const options = confirmations?.attributes?.options
    if (!Array.isArray(options) || options.length < 4) {
      errors.push(`${displayPath}: implementation confirmations must define at least four options`)
    } else if (options.some((option) => option?.required !== true)) {
      errors.push(`${displayPath}: every implementation confirmation option must be required`)
    }
  }
}

const configPath = join(templateDirectory, 'config.yml')
const config = parseYaml(await readFile(configPath, 'utf8'), '.github/ISSUE_TEMPLATE/config.yml', errors)
const securityContact = config?.contact_links?.find((contact) =>
  contact?.url === 'https://github.com/ShigeichiroYamasaki/creator-first-platform/security/policy'
)
if (!securityContact) errors.push('.github/ISSUE_TEMPLATE/config.yml: missing Security Policy contact link')

if (errors.length) {
  console.error(`Community file validation failed with ${errors.length} error(s):`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`Community file validation passed: ${formFiles.length} Issue Form(s), ${requiredProtocolDecisionIds.length} Protocol Decision field(s), ${requiredImplementationIds.length} Implementation field(s).`)
