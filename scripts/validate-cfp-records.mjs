import { access, readdir, readFile } from 'node:fs/promises'
import { isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseDocument } from 'yaml'

const defaultRoot = fileURLToPath(new URL('../', import.meta.url))
const hashPattern = /^0x[0-9a-f]{64}$/
const commitPattern = /^[0-9a-f]{40}$/
const cfpPattern = /^CFP-\d{4}$/
const allowedStatuses = new Set([
  'draft',
  'member_review',
  'confirmed',
  'hash_bound',
  'superseded',
  'test_fixture',
  'open',
  'resolved',
  'deferred'
])
const allowedDocumentTypes = new Set([
  'evidence_index',
  'issue',
  'house_minutes',
  'house_decision',
  'review',
  'correction',
  'implementation_evidence',
  'execution_evidence'
])
const requiredTemplates = [
  'house-minutes.template.md',
  'issue.template.md',
  'evidence-index.template.md',
  'correction.template.md',
  'house-decision.template.md'
]

function pathArgument(arguments_, option, fallback, base = defaultRoot) {
  const optionIndex = arguments_.indexOf(option)
  if (optionIndex === -1) return fallback
  const value = arguments_[optionIndex + 1]
  if (!value || value.startsWith('--')) {
    console.error(`CFP record validation failed: ${option} requires a path`)
    process.exit(2)
  }
  return isAbsolute(value) ? value : resolve(base, value)
}

async function markdownFiles(directory) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await markdownFiles(path))
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(path)
  }
  return files.sort()
}

function parseFrontmatter(source, displayPath, errors) {
  const lines = source.split(/\r?\n/)
  if (lines[0] !== '---') {
    errors.push(`${displayPath}: missing YAML frontmatter`)
    return {}
  }
  const end = lines.indexOf('---', 1)
  if (end === -1) {
    errors.push(`${displayPath}: unterminated YAML frontmatter`)
    return {}
  }
  const document = parseDocument(lines.slice(1, end).join('\n'))
  for (const error of document.errors) errors.push(`${displayPath}: ${error.message}`)
  return document.errors.length ? {} : document.toJS()
}

function requireFields(record, fields, displayPath, errors) {
  for (const field of fields) {
    if (record[field] === undefined || record[field] === null || record[field] === '') {
      errors.push(`${displayPath}: missing required field ${field}`)
    }
  }
}

function requireHeadings(source, headings, displayPath, errors) {
  for (const heading of headings) {
    if (!source.includes(`## ${heading}`)) errors.push(`${displayPath}: missing required heading ${heading}`)
  }
}

function isFinalStatus(status) {
  return status === 'confirmed' || status === 'hash_bound'
}

function requireFinalHash(value, field, displayPath, errors) {
  if (!hashPattern.test(String(value ?? ''))) errors.push(`${displayPath}: ${field} must be a 32-byte lowercase 0x hash`)
}

const arguments_ = process.argv.slice(2)
const root = pathArgument(arguments_, '--project-root', defaultRoot)
const recordsDirectory = pathArgument(arguments_, '--records-dir', join(root, 'docs/proposals/records'), root)
const templatesDirectory = pathArgument(
  arguments_,
  '--templates-dir',
  join(root, '.github/CFP_RECORD_TEMPLATES'),
  root
)
const gateIndex = arguments_.indexOf('--gate')
const gateSelector = gateIndex === -1 ? undefined : arguments_[gateIndex + 1]
if (gateIndex !== -1 && (!gateSelector || gateSelector.startsWith('--'))) {
  console.error('CFP record validation failed: --gate requires CFP-NNNN@revision')
  process.exit(2)
}

const errors = []
for (const template of requiredTemplates) {
  const path = join(templatesDirectory, template)
  try {
    const source = await readFile(path, 'utf8')
    if (!source.includes('record_schema: cfp-record/v1')) {
      errors.push(`.github/CFP_RECORD_TEMPLATES/${template}: missing record_schema`)
    }
  } catch {
    errors.push(`.github/CFP_RECORD_TEMPLATES/${template}: missing required template`)
  }
}

const records = []
const documentIds = new Map()
for (const path of await markdownFiles(recordsDirectory)) {
  const displayPath = relative(root, path)
  const recordPath = relative(recordsDirectory, path)
  const pathMatch = recordPath.match(/^(CFP-\d{4})\/revision-(\d{4})\/(.+)\.md$/)
  if (!pathMatch) {
    errors.push(`${displayPath}: path must match CFP-NNNN/revision-NNNN/...md`)
    continue
  }
  const source = await readFile(path, 'utf8')
  const record = parseFrontmatter(source, displayPath, errors)
  requireFields(record, [
    'record_schema',
    'document_id',
    'document_type',
    'cfp_id',
    'cfp_revision',
    'status',
    'created_at',
    'privacy_class'
  ], displayPath, errors)

  if (record.record_schema !== 'cfp-record/v1') errors.push(`${displayPath}: unsupported record_schema`)
  if (!allowedDocumentTypes.has(record.document_type)) errors.push(`${displayPath}: invalid document_type ${record.document_type}`)
  if (!cfpPattern.test(String(record.cfp_id ?? ''))) errors.push(`${displayPath}: invalid cfp_id`)
  if (record.cfp_id !== pathMatch[1]) errors.push(`${displayPath}: cfp_id does not match directory`)
  if (Number(record.cfp_revision) !== Number(pathMatch[2])) errors.push(`${displayPath}: cfp_revision does not match directory`)
  if (!allowedStatuses.has(record.status)) errors.push(`${displayPath}: invalid status ${record.status}`)
  if (!['public', 'public_summary', 'restricted'].includes(record.privacy_class)) {
    errors.push(`${displayPath}: invalid privacy_class ${record.privacy_class}`)
  }
  if (record.status === 'test_fixture' && record.record_profile !== 'testnet_fixture') {
    errors.push(`${displayPath}: test_fixture must declare record_profile: testnet_fixture`)
  }

  if (documentIds.has(record.document_id)) {
    errors.push(`${displayPath}: duplicate document_id ${record.document_id} also used by ${documentIds.get(record.document_id)}`)
  } else if (record.document_id) {
    documentIds.set(record.document_id, displayPath)
  }

  if (record.document_type === 'house_minutes') {
    requireFields(record, [
      'cfp_revision_hash', 'house', 'session_id', 'meeting_id', 'held_at', 'chair_id', 'recorder_id',
      'membership_snapshot_hash', 'agenda_hash', 'evidence_index_path', 'source_commit', 'confirmers'
    ], displayPath, errors)
    if (!['creator_house', 'user_house', 'joint_session'].includes(record.house)) {
      errors.push(`${displayPath}: invalid house ${record.house}`)
    }
    if (!Array.isArray(record.confirmers)) errors.push(`${displayPath}: confirmers must be an array`)
    requireHeadings(source, [
      '会議情報', '出席・定足数', '利益相反', '使用資料', '審議した論点', '憲章・法務上の確認',
      '修正案', '議論の要約', '少数意見', '議決', '継続対応', '議事録の確認'
    ], displayPath, errors)
    if (isFinalStatus(record.status)) {
      requireFinalHash(record.cfp_revision_hash, 'cfp_revision_hash', displayPath, errors)
      requireFinalHash(record.membership_snapshot_hash, 'membership_snapshot_hash', displayPath, errors)
      requireFinalHash(record.agenda_hash, 'agenda_hash', displayPath, errors)
      if (!commitPattern.test(String(record.source_commit ?? ''))) errors.push(`${displayPath}: source_commit must be a 40-character lowercase commit`)
      if (!record.confirmed_at) errors.push(`${displayPath}: final minutes require confirmed_at`)
      if (!Array.isArray(record.confirmers) || record.confirmers.length < 2) errors.push(`${displayPath}: final minutes require at least two confirmers`)
    }
  }

  if (record.document_type === 'issue') {
    requireFields(record, ['issue_id', 'category', 'blocking', 'raised_by', 'owner'], displayPath, errors)
    if (record.issue_id !== record.document_id) errors.push(`${displayPath}: issue_id must equal document_id`)
    if (typeof record.blocking !== 'boolean') errors.push(`${displayPath}: blocking must be boolean`)
    if (!['charter', 'legal', 'rights', 'privacy', 'security', 'technical', 'economic', 'governance', 'operations'].includes(record.category)) {
      errors.push(`${displayPath}: invalid issue category ${record.category}`)
    }
    requireHeadings(source, [
      '問い', '発生理由', '関係する資料', '選択肢', '各院の意見', '解決条件', '決定', '少数意見', '関連する修正Revision'
    ], displayPath, errors)
    if (record.status === 'resolved') {
      if (!record.resolved_at) errors.push(`${displayPath}: resolved issue requires resolved_at`)
      requireFinalHash(record.resolution_hash, 'resolution_hash', displayPath, errors)
    }
  }

  if (record.document_type === 'evidence_index') {
    requireFields(record, ['bundle_root', 'source_commit', 'evidence_items'], displayPath, errors)
    if (!Array.isArray(record.evidence_items) || record.evidence_items.length === 0) {
      errors.push(`${displayPath}: evidence_items must be a non-empty array`)
    } else {
      for (const [index, item] of record.evidence_items.entries()) {
        for (const field of ['evidence_id', 'document_path', 'content_hash', 'classification', 'status']) {
          if (!item?.[field]) errors.push(`${displayPath}: evidence_items[${index}] missing ${field}`)
        }
        if (item?.document_path) {
          try { await access(resolve(root, item.document_path)) } catch { errors.push(`${displayPath}: missing evidence document ${item.document_path}`) }
        }
      }
    }
    requireHeadings(source, ['対象', '公開証拠', '制限証拠', '証拠束の確定'], displayPath, errors)
  }

  if (record.document_type === 'house_decision') {
    requireFields(record, [
      'cfp_revision_hash', 'house', 'session_id', 'membership_snapshot_hash', 'minutes_document_id',
      'quorum_met', 'result', 'result_evidence_hash', 'source_commit'
    ], displayPath, errors)
    if (!['creator_house', 'user_house'].includes(record.house)) errors.push(`${displayPath}: invalid decision house`)
    if (typeof record.quorum_met !== 'boolean') errors.push(`${displayPath}: quorum_met must be boolean`)
    if (!['pending', 'approved', 'rejected'].includes(record.result)) errors.push(`${displayPath}: invalid decision result`)
    if (isFinalStatus(record.status)) {
      requireFinalHash(record.cfp_revision_hash, 'cfp_revision_hash', displayPath, errors)
      requireFinalHash(record.membership_snapshot_hash, 'membership_snapshot_hash', displayPath, errors)
      requireFinalHash(record.result_evidence_hash, 'result_evidence_hash', displayPath, errors)
      if (!commitPattern.test(String(record.source_commit ?? ''))) errors.push(`${displayPath}: source_commit must be a 40-character lowercase commit`)
    }
    requireHeadings(source, ['投票対象', '定足数', '集計結果', '付帯決議・少数意見'], displayPath, errors)
  }

  if (record.document_type === 'correction') {
    requireFields(record, [
      'corrects_document_id', 'corrects_document_hash', 'reason', 'approved_by', 'approved_at'
    ], displayPath, errors)
    requireFinalHash(record.corrects_document_hash, 'corrects_document_hash', displayPath, errors)
    if (!Array.isArray(record.approved_by) || record.approved_by.length < 2) {
      errors.push(`${displayPath}: correction requires at least two approvers`)
    }
    requireHeadings(source, ['訂正対象', '訂正内容', '訂正理由', '承認'], displayPath, errors)
  }

  records.push({ ...record, path: displayPath })
}

if (records.length === 0) errors.push('docs/proposals/records: defines no CFP records')

if (gateSelector) {
  const gateMatch = gateSelector.match(/^(CFP-\d{4})@([1-9]\d*)$/)
  if (!gateMatch) {
    errors.push(`invalid gate selector ${gateSelector}; expected CFP-NNNN@revision`)
  } else {
    const [, gateCfp, gateRevision] = gateMatch
    const selected = records.filter((record) => record.cfp_id === gateCfp && Number(record.cfp_revision) === Number(gateRevision))
    if (selected.length === 0) errors.push(`${gateSelector}: no records found`)
    const blockers = selected.filter((record) => record.document_type === 'issue' && record.blocking === true && ['open', 'deferred'].includes(record.status))
    for (const blocker of blockers) errors.push(`${gateSelector}: unresolved blocking issue ${blocker.issue_id}`)

    for (const house of ['creator_house', 'user_house']) {
      const minutes = selected.find((record) => record.document_type === 'house_minutes' && record.house === house && isFinalStatus(record.status) && record.record_profile !== 'testnet_fixture')
      if (!minutes) errors.push(`${gateSelector}: missing final production minutes for ${house}`)
      const decision = selected.find((record) =>
        record.document_type === 'house_decision' && record.house === house && isFinalStatus(record.status)
        && record.record_profile !== 'testnet_fixture' && record.quorum_met === true && record.result === 'approved'
      )
      if (!decision) errors.push(`${gateSelector}: missing approved final production decision for ${house}`)
    }

    const evidence = selected.find((record) => record.document_type === 'evidence_index' && record.status === 'hash_bound' && record.record_profile !== 'testnet_fixture')
    if (!evidence) errors.push(`${gateSelector}: missing hash_bound production evidence index`)
    else {
      requireFinalHash(evidence.bundle_root, 'bundle_root', evidence.path, errors)
      if (!commitPattern.test(String(evidence.source_commit ?? ''))) errors.push(`${evidence.path}: source_commit must be a 40-character lowercase commit`)
      for (const item of evidence.evidence_items ?? []) {
        if (item.status !== 'verified') errors.push(`${evidence.path}: evidence ${item.evidence_id} is not verified`)
        requireFinalHash(item.content_hash, `evidence ${item.evidence_id} content_hash`, evidence.path, errors)
      }
    }
  }
}

if (errors.length) {
  console.error(`CFP record validation failed with ${errors.length} error(s):`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

const counts = new Map()
for (const record of records) counts.set(record.document_type, (counts.get(record.document_type) ?? 0) + 1)
console.log(`CFP record validation passed: ${records.length} record(s), ${documentIds.size} unique document ID(s), ${[...counts.entries()].map(([type, count]) => `${count} ${type}`).join(', ')}${gateSelector ? `, gate ${gateSelector}` : ''}.`)
