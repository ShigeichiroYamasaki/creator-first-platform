import { readdir, readFile, stat } from 'node:fs/promises'
import { isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const defaultRoot = fileURLToPath(new URL('../', import.meta.url))

function pathArgument(arguments_, option, fallback, base = defaultRoot) {
  const optionIndex = arguments_.indexOf(option)
  if (optionIndex === -1) return fallback

  const value = arguments_[optionIndex + 1]
  if (!value || value.startsWith('--')) {
    console.error(`Protocol validation failed: ${option} requires a path`)
    process.exit(2)
  }

  return isAbsolute(value) ? value : resolve(base, value)
}

const arguments_ = process.argv.slice(2)
const root = pathArgument(arguments_, '--project-root', defaultRoot)
const protocolDirectory = pathArgument(
  arguments_,
  '--protocol-dir',
  join(root, 'protocol'),
  root
)

async function markdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    if (entry.name === 'templates') continue

    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await markdownFiles(path))
    if (entry.isFile() && entry.name.endsWith('.md')) files.push(path)
  }

  return files
}

function section(source, heading, nextHeadings) {
  const start = source.indexOf(heading)
  if (start === -1) return ''

  const candidates = nextHeadings
    .map((next) => source.indexOf(next, start + heading.length))
    .filter((index) => index !== -1)

  return source.slice(start, candidates.length ? Math.min(...candidates) : undefined)
}

function expandTestReferences(source) {
  const references = new Set()
  const pattern = /REQ-([A-Z0-9-]+)-([0-9]{3})(?:[–-]([0-9]{3}))?/g

  for (const match of source.matchAll(pattern)) {
    const [, domain, firstText, lastText = firstText] = match
    const first = Number(firstText)
    const last = Number(lastText)

    if (last < first || last - first > 999) continue
    for (let value = first; value <= last; value += 1) {
      references.add(`REQ-${domain}-${String(value).padStart(3, '0')}`)
    }
  }

  return references
}

const files = await markdownFiles(protocolDirectory)
const seenRequirements = new Map()
const seenSpecifications = new Map()
const seenGlobalInvariants = new Map()
const seenSpecificationInvariants = new Map()
const seenOpenQuestions = new Map()
const specificationChecks = []
const repositoryReferences = []
const errors = []
let normativeRequirementCount = 0

for (const file of files) {
  const source = await readFile(file, 'utf8')
  const displayPath = relative(root, file)
  const isSpecificationFile = file.endsWith('-spec.md')

  for (const match of source.matchAll(/`((?:docs|protocol)\/[A-Za-z0-9._/-]+\.md)`/g)) {
    repositoryReferences.push({ displayPath, reference: match[1] })
  }

  const globalInvariants = [...source.matchAll(/^- \*\*(INV-[A-Z0-9-]+-[0-9]{3})\*\*\s*$/gm)]
  for (const match of globalInvariants) {
    const invariant = match[1]
    if (file !== join(protocolDirectory, 'invariants.md')) {
      errors.push(`${displayPath}: global invariant ${invariant} must be defined in invariants.md`)
    } else if (seenGlobalInvariants.has(invariant)) {
      errors.push(`${displayPath}: duplicate global invariant ID ${invariant}`)
    } else {
      seenGlobalInvariants.set(invariant, displayPath)
    }
  }

  const specification = source.match(/^\*\*Specification ID:\*\*\s+([A-Z0-9-]+)/m)?.[1]
  if (isSpecificationFile && !specification) {
    errors.push(`${displayPath}: specification file has no valid Specification ID`)
  }

  if (isSpecificationFile) {
    const requiredMetadata = [
      ['Status', /^\*\*Status:\*\*\s+\S+/m],
      ['Protocol Domain', /^\*\*Protocol Domain:\*\*\s+\S+/m]
    ]

    for (const [label, pattern] of requiredMetadata) {
      if (!pattern.test(source)) errors.push(`${displayPath}: missing ${label} metadata`)
    }

    if (!/^\*\*Version:\*\*\s+\d+\.\d+\.\d+\s*$/m.test(source)) {
      errors.push(`${displayPath}: Version must use MAJOR.MINOR.PATCH`)
    }
    if (!/^\*\*Last Updated:\*\*\s+\d{4}-\d{2}-\d{2}\s*$/m.test(source)) {
      errors.push(`${displayPath}: Last Updated must use YYYY-MM-DD`)
    }

    const relatedDocuments = section(source, '## Related Documents\n', ['## Goal\n'])
    if (!relatedDocuments) {
      errors.push(`${displayPath}: missing Related Documents section`)
    } else if (!/`(?:docs|protocol)\/[A-Za-z0-9._/-]+\.md`/.test(relatedDocuments)) {
      errors.push(`${displayPath}: Related Documents references no repository documents`)
    }
  }

  if (specification) {
    if (seenSpecifications.has(specification)) {
      errors.push(`${displayPath}: duplicate specification ID ${specification} (also in ${seenSpecifications.get(specification)})`)
    } else {
      seenSpecifications.set(specification, displayPath)
    }
  }

  const requirements = [...source.matchAll(/^- \*\*(REQ-[A-Z0-9-]+-[0-9]{3}):\*\*/gm)]
  if (specification && requirements.length === 0) {
    errors.push(`${displayPath}: specification defines no requirements`)
  }
  for (const match of requirements) {
    const requirement = match[1]
    if (seenRequirements.has(requirement)) {
      errors.push(`${displayPath}: duplicate requirement ID ${requirement} (also in ${seenRequirements.get(requirement)})`)
    } else {
      seenRequirements.set(requirement, displayPath)
    }
  }

  if (!specification) continue

  const mustSource = section(source, '### MUST\n', ['### MUST NOT\n', '### SHOULD\n', '## Invariants\n'])
  const mustNotSource = section(source, '### MUST NOT\n', ['### SHOULD\n', '### SHOULD NOT\n', '### MAY\n', '## Invariants\n'])
  const normative = [...mustSource, ...mustNotSource].join('').match(/REQ-[A-Z0-9-]+-[0-9]{3}/g) ?? []
  const tests = section(source, '## Test Requirements\n', ['## Acceptance Criteria\n', '## Open Questions\n'])
  const tested = expandTestReferences(tests)
  const invariantsSource = section(source, '## Invariants\n', ['## State Transitions\n', '## Interfaces\n'])
  const referencedInvariants = new Set(
    [...invariantsSource.matchAll(/`(INV-[A-Z0-9-]+-[0-9]{3})`/g)].map((match) => match[1])
  )
  const specificationInvariants = [...invariantsSource.matchAll(/^- \*\*(SPEC-INV-[A-Z0-9-]+-[0-9]{3}):\*\*/gm)]
  const openQuestionsSource = section(source, '## Open Questions\n', [])
  const openQuestionLines = openQuestionsSource.match(/^- .+$/gm) ?? []
  const openQuestionPattern = /^- \*\*(OQ-[A-Z0-9-]+-[0-9]{3}):\*\* \*\*Decision owner:\*\* ([^;]+); \*\*Blocks:\*\* ([^;]+); \*\*Question:\*\* (.+\?)$/

  if (!tests) errors.push(`${displayPath}: missing Test Requirements section`)
  if (tested.size === 0) errors.push(`${displayPath}: Test Requirements references no requirement IDs`)
  if (referencedInvariants.size === 0) errors.push(`${displayPath}: Invariants references no global invariant IDs`)
  if (specificationInvariants.length === 0) errors.push(`${displayPath}: defines no specification invariant IDs`)
  if (!openQuestionsSource) errors.push(`${displayPath}: missing Open Questions section`)
  if (openQuestionLines.length === 0) errors.push(`${displayPath}: Open Questions defines no tracked questions`)

  for (const line of openQuestionLines) {
    const match = line.match(openQuestionPattern)
    if (!match) {
      errors.push(`${displayPath}: malformed Open Question; expected stable ID, Decision owner, Blocks and Question`)
      continue
    }

    const [, question] = match
    if (seenOpenQuestions.has(question)) {
      errors.push(`${displayPath}: duplicate Open Question ID ${question} (also in ${seenOpenQuestions.get(question)})`)
    } else {
      seenOpenQuestions.set(question, displayPath)
    }
  }

  for (const match of specificationInvariants) {
    const invariant = match[1]
    if (seenSpecificationInvariants.has(invariant)) {
      errors.push(`${displayPath}: duplicate specification invariant ID ${invariant} (also in ${seenSpecificationInvariants.get(invariant)})`)
    } else {
      seenSpecificationInvariants.set(invariant, displayPath)
    }
  }

  specificationChecks.push({ displayPath, requirements, tested, referencedInvariants })

  normativeRequirementCount += normative.length
  for (const requirement of normative) {
    if (!tested.has(requirement)) {
      errors.push(`${displayPath}: ${requirement} has no Test Requirements reference`)
    }
  }
}

if (seenGlobalInvariants.size === 0) errors.push('invariants.md: defines no global invariant IDs')

for (const { displayPath, reference } of repositoryReferences) {
  if (reference.split('/').includes('..')) {
    errors.push(`${displayPath}: repository document reference escapes the project root: ${reference}`)
    continue
  }

  try {
    const referenceStat = await stat(resolve(root, reference))
    if (!referenceStat.isFile()) errors.push(`${displayPath}: repository document reference is not a file: ${reference}`)
  } catch {
    errors.push(`${displayPath}: repository document reference does not exist: ${reference}`)
  }
}

for (const { displayPath, requirements, tested, referencedInvariants } of specificationChecks) {
  const localRequirements = new Set(requirements.map((match) => match[1]))

  for (const requirement of tested) {
    if (!seenRequirements.has(requirement)) {
      errors.push(`${displayPath}: Test Requirements references unknown ${requirement}`)
    } else if (!localRequirements.has(requirement)) {
      errors.push(`${displayPath}: Test Requirements references ${requirement} from ${seenRequirements.get(requirement)}`)
    }
  }

  for (const invariant of referencedInvariants) {
    if (!seenGlobalInvariants.has(invariant)) {
      errors.push(`${displayPath}: Invariants references unknown ${invariant}`)
    }
  }
}

if (errors.length) {
  console.error('Protocol validation failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`Protocol validation passed: ${seenSpecifications.size} specification(s), ${seenRequirements.size} unique requirement(s), ${normativeRequirementCount} normative test mapping(s), ${seenGlobalInvariants.size} global invariant(s), ${seenSpecificationInvariants.size} specification invariant(s), ${seenOpenQuestions.size} tracked Open Question(s), ${repositoryReferences.length} repository document reference(s).`)
