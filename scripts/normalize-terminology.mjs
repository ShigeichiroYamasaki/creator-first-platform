import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const docsRoot = new URL('../docs/', import.meta.url);
const excludedDirectories = new Set(['.vitepress', 'en']);
const excludedFiles = new Set(['terminology.md']);

const phraseReplacements = [
  ['ガバナンス議員hip SBT', 'ガバナンス議員資格SBT'],
  ['ユーザ院議会 Eligibility', 'ユーザ院議会参加資格'],
  ['音楽クリエーター Registry', '音楽クリエーター登録台帳'],
  ['音楽クリエーター BFF', '音楽クリエーターBFF'],
  ['音楽クリエーター API', '音楽クリエーターAPI'],
  ['音楽クリエーター Commitment', '音楽クリエーターコミットメント'],
  ['音楽クリエーター Dashboard', '音楽クリエーターダッシュボード'],
  ['音楽クリエーター ID', '音楽クリエーターID'],
  ['音楽クリエーター Discovery', '音楽クリエーター発見'],
  ['音楽クリエーター Diversity', '音楽クリエーターの多様性'],
  ['音楽クリエーター Eligibility', '音楽クリエーター適格性'],
  ['音楽クリエーター Identity', '音楽クリエーター本人性'],
  ['音楽クリエーター Portal', '音楽クリエーターポータル'],
  ['音楽クリエーター Wallet', '音楽クリエーターウォレット'],
  ['音楽クリエーター Release', '音楽クリエーターリリース'],
  ['音楽クリエーター Applications', '音楽クリエーターアプリ'],
  ['音楽クリエーター Application', '音楽クリエーターアプリ'],
  ['音楽クリエーター Apps', '音楽クリエーターアプリ'],
  ['音楽クリエーター Balance', '音楽クリエーター残高'],
  ['音楽クリエーター Contracts', '音楽クリエーター契約'],
  ['音楽クリエーター Impact', '音楽クリエーターへの影響'],
  ['音楽クリエーター Metrics', '音楽クリエーター指標'],
  ['音楽クリエーター Revenue', '音楽クリエーター収益'],
  ['音楽クリエーター Share', '音楽クリエーター比率'],
  ['音楽クリエーター Workspace', '音楽クリエーター作業画面'],
  ['音楽クリエーター Project', '音楽クリエータープロジェクト'],
  ['音楽クリエーター Experience', '音楽クリエーター体験'],
  ['音楽クリエーター Independence', '音楽クリエーターの独立性'],
  ['音楽クリエーター Opportunity', '音楽クリエーターの機会'],
  ['音楽クリエーター Note', '音楽クリエーター注記'],
  ['音楽クリエーター Update', '音楽クリエーター更新'],
  ['音楽クリエーター view', '音楽クリエーター向け表示'],
  ['音楽クリエーター profile', '音楽クリエータープロフィール'],
  ['音楽クリエーター explanation', '音楽クリエーター向け説明'],
  ['音楽クリエーター commitment', '音楽クリエーターコミットメント'],
  ['音楽クリエーター Transparency', '音楽クリエーター向け透明性'],
  ['音楽クリエーター Slice', '音楽クリエーター部分実装'],
  ['音楽クリエーター Set', '音楽クリエーター集合'],
  ['音楽クリエーター Role', '音楽クリエーター役割'],
  ['音楽クリエーター Response', '音楽クリエーター応答'],
  ['音楽クリエーター Representative', '音楽クリエーター代表'],
  ['音楽クリエーター Relations', '音楽クリエーター関係'],
  ['音楽クリエーター Payout', '音楽クリエーター支払'],
  ['音楽クリエーター Network', '音楽クリエーターネットワーク'],
  ['音楽クリエーター Entity', '音楽クリエーター主体'],
  ['音楽クリエーター Demo', '音楽クリエーターデモ'],
  ['音楽クリエーター Data', '音楽クリエーターデータ'],
  ['Global 音楽クリエーター Network', '国際音楽クリエーターネットワーク'],
  ['Private 音楽クリエーター Data', '非公開音楽クリエーターデータ'],
  ['音楽クリエーター listened to', '聴取された音楽クリエーター'],
  ['音楽クリエーター selected by user', 'ユーザが選択した音楽クリエーター'],
  ['ユーザ Governance', 'ユーザガバナンス'],
  ['ユーザ ID', 'ユーザID'],
  ['ユーザ Profile', 'ユーザプロフィール'],
  ['ユーザ Activity', 'ユーザ活動'],
  ['ユーザ Economic', 'ユーザの経済的'],
  ['ユーザ Eligibility', 'ユーザ適格性'],
  ['ユーザ Impact', 'ユーザへの影響'],
  ['ユーザ Payment', 'ユーザ支払'],
  ['ユーザ Preference', 'ユーザ選好'],
  ['ユーザ Sovereignty', 'ユーザ主権'],
  ['ユーザ Credential', 'ユーザ資格証明'],
  ['ユーザ Library', 'ユーザライブラリ'],
  ['ユーザ Listeners', 'ユーザリスナー'],
  ['ユーザ Session', 'ユーザセッション'],
  ['ユーザ Action', 'ユーザ操作'],
  ['ユーザ Aggregation', 'ユーザ集約'],
  ['ユーザ Applications', 'ユーザアプリ'],
  ['ユーザ Application', 'ユーザアプリ'],
  ['ユーザ Choice', 'ユーザ選択'],
  ['ユーザ Consent', 'ユーザ同意'],
  ['ユーザ Contracts', 'ユーザ契約'],
  ['ユーザ Contribution', 'ユーザ貢献'],
  ['ユーザ Control', 'ユーザ制御'],
  ['ユーザ Definitions', 'ユーザ定義'],
  ['ユーザ Dispute', 'ユーザ紛争'],
  ['ユーザ Diversity', 'ユーザの多様性'],
  ['ユーザ Ecosystem', 'ユーザエコシステム'],
  ['ユーザ Growth', 'ユーザ成長'],
  ['ユーザ Identity', 'ユーザ本人性'],
  ['ユーザ Intent', 'ユーザ意思'],
  ['ユーザ Interface', 'ユーザインターフェース'],
  ['ユーザ Participation', 'ユーザ参加'],
  ['ユーザ Reach', 'ユーザ到達範囲'],
  ['ユーザ Registration', 'ユーザ登録'],
  ['ユーザ Representatives', 'ユーザ代表'],
  ['ユーザ Retention', 'ユーザ継続率'],
  ['ユーザ Satisfaction', 'ユーザ満足度'],
  ['ユーザ Set', 'ユーザ集合'],
  ['ユーザ Tracking', 'ユーザ追跡'],
  ['ユーザ Transparency', 'ユーザ透明性'],
  ['ユーザ Viewing', 'ユーザ閲覧'],
  ['ユーザ Will', 'ユーザ意思'],
  ['ユーザ Code', 'ユーザコード'],
  ['ユーザ Listening', 'ユーザ聴取'],
  ['ユーザ pays', 'ユーザが支払う'],
  ['ユーザ payment', 'ユーザ支払'],
  ['ユーザ consent', 'ユーザ同意'],
  ['ユーザ as Governance Source', 'ガバナンスの源泉としてのユーザ'],
  ['ユーザ as', 'ユーザを'],
  ['Test 音楽クリエーター', 'テスト音楽クリエーター'],
  ['Test ユーザ', 'テストユーザ'],
  ['Public Testnet Journey', '公開テストネット利用フロー'],
  ['New 音楽クリエーター', '新人音楽クリエーター'],
].sort(([left], [right]) => right.length - left.length);

async function markdownFiles(directoryUrl) {
  const entries = await readdir(directoryUrl, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory() && !excludedDirectories.has(entry.name)) {
      files.push(...await markdownFiles(new URL(`${entry.name}/`, directoryUrl)));
    } else if (entry.isFile() && entry.name.endsWith('.md') && !excludedFiles.has(entry.name)) {
      files.push(new URL(entry.name, directoryUrl));
    }
  }

  return files;
}

function normalizeText(text) {
  const housePlaceholder = '\u0000CREATOR_HOUSE\u0000';
  let normalized = text
    .replaceAll('音楽クリエータ院議会', housePlaceholder)
    .replaceAll('音楽クリエイター', '音楽クリエーター')
    .replace(/(?<!音楽)クリエイター/g, '音楽クリエーター')
    .replace(/(?<!音楽)クリエータ(?!ー)/g, '音楽クリエーター')
    .replace(/ユーザー|利用者/g, 'ユーザ')
    .replaceAll('音楽音楽クリエーター', '音楽クリエーター')
    .replaceAll(housePlaceholder, '音楽クリエータ院議会');

  for (const [source, replacement] of phraseReplacements) {
    normalized = normalized.replaceAll(source, replacement);
  }

  return normalized
    .replace(/音楽クリエーター ([ABCXYZ])/g, '音楽クリエーター$1')
    .replace(/ユーザ ([ABCXYZ])/g, 'ユーザ$1');
}

function normalizeLine(line) {
  let output = '';
  let cursor = 0;

  for (const match of line.matchAll(/`[^`]*`/g)) {
    output += normalizeText(line.slice(cursor, match.index));
    output += match[0];
    cursor = match.index + match[0].length;
  }

  return output + normalizeText(line.slice(cursor));
}

function normalizeMarkdown(markdown) {
  let inFence = false;
  let normalizeFence = true;

  return markdown.split('\n').map((line) => {
    const fence = line.match(/^\s*```\s*([^\s]*)/);
    if (fence) {
      if (!inFence) {
        inFence = true;
        normalizeFence = ['', 'mermaid', 'text'].includes(fence[1]);
      } else {
        inFence = false;
        normalizeFence = true;
      }
      return line;
    }

    return !inFence || normalizeFence ? normalizeLine(line) : line;
  }).join('\n');
}

let changedFiles = 0;
for (const fileUrl of await markdownFiles(docsRoot)) {
  const input = await readFile(fileUrl, 'utf8');
  const output = normalizeMarkdown(input);
  if (output !== input) {
    await writeFile(fileUrl, output);
    changedFiles += 1;
  }
}

console.log(`Normalized terminology in ${changedFiles} file(s).`);
