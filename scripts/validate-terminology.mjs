import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const repositoryRoot = new URL('../', import.meta.url);
const documentationRoots = [
  'docs/whitepaper',
  'docs/adr',
  'docs/protocol',
  'docs/governance',
  'docs/proposals',
  'docs/demo',
];
const standaloneDocuments = ['docs/index.md', 'docs/status.md'];
const excludedDirectories = new Set(['en']);
const forbiddenPatterns = [
  { label: 'Creator House', pattern: /\bCreator House\b/g },
  { label: 'User House', pattern: /\bUser House\b/g },
  { label: 'Creator', pattern: /\bCreator\b/g },
  { label: 'User', pattern: /\bUser\b/g },
  { label: 'クリエイター', pattern: /クリエイター/g },
  { label: 'ユーザー', pattern: /ユーザー/g },
  { label: '利用者', pattern: /利用者/g },
];

async function markdownFiles(relativeDirectory) {
  const directoryUrl = new URL(`${relativeDirectory}/`, repositoryRoot);
  const entries = await readdir(directoryUrl, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = path.posix.join(relativeDirectory, entry.name);
    if (entry.isDirectory() && !excludedDirectories.has(entry.name)) {
      files.push(...await markdownFiles(relativePath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(relativePath);
    }
  }

  return files;
}

function visibleDocumentation(markdown) {
  let inFence = false;
  let keepFence = false;

  return markdown.split('\n').map((line) => {
    const fence = line.match(/^\s*```\s*([^\s]*)/);
    if (fence) {
      if (!inFence) {
        inFence = true;
        keepFence = ['', 'mermaid', 'text'].includes(fence[1]);
      } else {
        inFence = false;
        keepFence = false;
      }
      return '';
    }

    if (inFence && !keepFence) return '';

    return line
      .replace(/`[^`]*`/g, '')
      .replaceAll('Creator First Platform', '')
      .replaceAll('Remote-User', '');
  }).join('\n');
}

const files = [
  ...standaloneDocuments,
  ...(await Promise.all(documentationRoots.map(markdownFiles))).flat(),
];
const failures = [];

for (const relativePath of files.sort()) {
  const markdown = await readFile(new URL(relativePath, repositoryRoot), 'utf8');
  const visible = visibleDocumentation(markdown);
  const lines = visible.split('\n');

  for (const [index, line] of lines.entries()) {
    for (const { label, pattern } of forbiddenPatterns) {
      pattern.lastIndex = 0;
      if (pattern.test(line)) {
        failures.push(`${relativePath}:${index + 1}: use the canonical Japanese term instead of ${label}`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error(`Terminology validation failed:\n- ${failures.join('\n- ')}`);
  process.exitCode = 1;
} else {
  console.log(`Terminology validation passed for ${files.length} document(s).`);
}
