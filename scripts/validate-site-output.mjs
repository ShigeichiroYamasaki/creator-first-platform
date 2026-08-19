import { readdir, readFile, stat } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

const root = fileURLToPath(new URL('../', import.meta.url))
const outputDirectoryArgument = process.argv.indexOf('--output-dir')
const outputDirectory = outputDirectoryArgument === -1
  ? fileURLToPath(new URL('../docs/.vitepress/dist/', import.meta.url))
  : resolve(process.argv[outputDirectoryArgument + 1] ?? '')

if (outputDirectoryArgument !== -1 && !process.argv[outputDirectoryArgument + 1]) {
  console.error('Site output validation failed:\n- --output-dir requires a directory path')
  process.exit(1)
}
const publicOrigin = 'https://shigeichiroyamasaki.github.io/creator-first-platform/'
const socialImageUrl = `${publicOrigin}creator-first-platform-symbol.png`
const requiredProtocolRoutes = [
  'protocol/foundation/overview',
  'protocol/foundation/conventions',
  'protocol/foundation/glossary',
  'protocol/foundation/invariants',
  'protocol/open-questions',
  'protocol/vertical-slice',
  'protocol/implementation-plan',
  'protocol/specs/account-lifecycle',
  'protocol/specs/wallet-linking',
  'protocol/specs/subscription-settlement',
  'protocol/specs/settlement-asset-registry',
  'protocol/specs/rights-registry',
  'protocol/specs/playback-verification',
  'protocol/specs/creator-distribution'
]
const requiredHomeLabels = [
  '>本文へ移動</a>',
  'aria-label="サイト内を検索"',
  '>検索</span>'
]
const forbiddenHomeLabels = [
  '>Skip to content</a>',
  'aria-label="Search"',
  '>Search</span>'
]

async function siteFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await siteFiles(path))
    if (entry.isFile()) files.push(path)
  }

  return files
}

function matches(source, pattern) {
  return [...source.matchAll(pattern)].map((match) => match[1])
}

function decodeHtmlAttribute(value) {
  return value.replaceAll('&amp;', '&')
}

function outputUrlPath(file) {
  const path = relative(outputDirectory, file).replaceAll('\\', '/')
  if (path === 'index.html') return '/creator-first-platform/'
  if (path.endsWith('/index.html')) {
    return `/creator-first-platform/${path.slice(0, -'index.html'.length)}`
  }
  if (path.endsWith('.html')) return `/creator-first-platform/${path.slice(0, -'.html'.length)}`
  return `/creator-first-platform/${path}`
}

const generatedFiles = await siteFiles(outputDirectory)
const generatedPaths = new Set(generatedFiles.map((file) => outputUrlPath(file)))
const files = generatedFiles.filter((file) => file.endsWith('.html'))
const errors = []
const indexableUrls = new Map()
const indexableTitles = new Map()
const indexableDescriptions = new Map()
const htmlByUrlPath = new Map()
const internalReferences = []
let noindexCount = 0
let diagramCount = 0
let internalReferenceCount = 0
let externalReferenceCount = 0

for (const file of files) {
  const source = await readFile(file, 'utf8')
  const displayPath = relative(root, file)
  const canonical = matches(source, /<link rel="canonical" href="([^"]+)">/g)
  const openGraphUrl = matches(source, /<meta property="og:url" content="([^"]+)">/g)
  const description = matches(source, /<meta name="description" content="([^"]+)">/g)
  const robots = matches(source, /<meta name="robots" content="([^"]+)">/g)
  const isNoindex = robots.some((content) => content.split(/[\s,]+/).includes('noindex'))
  const diagrams = [...source.matchAll(/<figure class="mermaid-diagram">([\s\S]*?)<\/figure>/g)]
  const urlPath = outputUrlPath(file)
  const isNotFoundPage = displayPath.endsWith('/404.html')
  const idValues = matches(source, /\sid="([^"]+)"/g).map(decodeHtmlAttribute)
  const ids = new Set(idValues)
  const titles = matches(source, /<title>([^<]+)<\/title>/g)
  const levelOneHeadings = [...source.matchAll(/<h1(?:\s|>)/g)]
  const images = [...source.matchAll(/<img\b[^>]*>/g)].map((match) => match[0])
  const openGraphImages = matches(source, /<meta property="og:image" content="([^"]+)">/g)
  const twitterImages = matches(source, /<meta name="twitter:image" content="([^"]+)">/g)
  const structuredData = matches(source, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)
  const anchors = [...source.matchAll(/<a\b[^>]*>/g)].map((match) => match[0])

  htmlByUrlPath.set(urlPath, { displayPath, ids })
  for (const match of source.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    internalReferences.push({ displayPath, sourceUrlPath: urlPath, value: decodeHtmlAttribute(match[1]) })
  }

  diagramCount += diagrams.length
  for (const [index, diagram] of diagrams.entries()) {
    if (!/<details class="mermaid-diagram__source">/.test(diagram[1])) {
      errors.push(`${displayPath}: Mermaid diagram ${index + 1} has no static text alternative`)
    }
    if (!/<summary>[^<]+のテキスト表現を表示<\/summary>/.test(diagram[1])) {
      errors.push(`${displayPath}: Mermaid diagram ${index + 1} has no meaningful summary`)
    }
    if (!/<pre><code>\s*\S/.test(diagram[1])) {
      errors.push(`${displayPath}: Mermaid diagram ${index + 1} has an empty text alternative`)
    }
  }

  if (!source.includes('<html lang="ja-JP"')) {
    errors.push(`${displayPath}: document language is not ja-JP`)
  }
  if (titles.length !== 1 || !titles[0].trim()) {
    errors.push(`${displayPath}: expected exactly one non-empty title`)
  }
  if (openGraphImages.length !== 1 || openGraphImages[0] !== socialImageUrl) {
    errors.push(`${displayPath}: expected exactly one canonical og:image`)
  }
  if (twitterImages.length !== 1 || twitterImages[0] !== socialImageUrl) {
    errors.push(`${displayPath}: expected exactly one canonical twitter:image`)
  }
  if (!source.includes('<meta property="og:image:alt" content="Creator First Platformのシンボル">')) {
    errors.push(`${displayPath}: missing og:image:alt`)
  }
  if (
    !source.includes('<meta property="og:image:type" content="image/png">') ||
    !source.includes('<meta property="og:image:width" content="1254">') ||
    !source.includes('<meta property="og:image:height" content="1254">')
  ) {
    errors.push(`${displayPath}: missing or incorrect og:image type or dimensions`)
  }
  if (!source.includes('<meta name="twitter:image:alt" content="Creator First Platformのシンボル">')) {
    errors.push(`${displayPath}: missing twitter:image:alt`)
  }
  if (structuredData.length !== 1) {
    errors.push(`${displayPath}: expected exactly one JSON-LD block`)
  } else {
    try {
      const website = JSON.parse(structuredData[0])
      if (
        website['@context'] !== 'https://schema.org' ||
        website['@type'] !== 'WebSite' ||
        website.url !== publicOrigin ||
        website.inLanguage !== 'ja-JP' ||
        website.image !== socialImageUrl
      ) {
        errors.push(`${displayPath}: JSON-LD WebSite metadata is incomplete or inconsistent`)
      }
    } catch {
      errors.push(`${displayPath}: JSON-LD is not valid JSON`)
    }
  }
  if (!isNotFoundPage && levelOneHeadings.length !== 1) {
    errors.push(`${displayPath}: expected exactly one h1, found ${levelOneHeadings.length}`)
  }
  if (idValues.length !== ids.size) {
    const seen = new Set()
    const duplicates = new Set(idValues.filter((id) => seen.has(id) || !seen.add(id)))
    errors.push(`${displayPath}: duplicate id attribute(s): ${[...duplicates].join(', ')}`)
  }
  for (const image of images) {
    if (!/\salt(?:=|\s|>)/.test(image)) {
      errors.push(`${displayPath}: image is missing an alt attribute: ${image.slice(0, 120)}`)
    }
  }
  for (const anchor of anchors) {
    const href = anchor.match(/\shref="([^"]+)"/)?.[1]
    if (!href) continue

    let url
    try {
      url = new URL(decodeHtmlAttribute(href), new URL(urlPath, publicOrigin).href)
    } catch {
      continue
    }
    if (url.origin === new URL(publicOrigin).origin) continue
    if (!['http:', 'https:'].includes(url.protocol)) continue

    externalReferenceCount += 1
    if (url.protocol !== 'https:') {
      errors.push(`${displayPath}: external link must use HTTPS: ${href}`)
    }
    if (url.username || url.password) {
      errors.push(`${displayPath}: external link must not contain credentials: ${href}`)
    }
    if (/\starget="_blank"/.test(anchor)) {
      const rel = anchor.match(/\srel="([^"]+)"/)?.[1]?.split(/\s+/) ?? []
      if (!rel.includes('noopener') && !rel.includes('noreferrer')) {
        errors.push(`${displayPath}: target=_blank external link lacks noopener or noreferrer: ${href}`)
      }
    }
  }
  if (!isNotFoundPage && (!source.includes('href="#VPContent"') || !ids.has('VPContent'))) {
    errors.push(`${displayPath}: skip link and #VPContent target are not both present`)
  }

  if (!source.includes('<link rel="sitemap" type="application/xml" href="/creator-first-platform/sitemap.xml">')) {
    errors.push(`${displayPath}: missing sitemap discovery link`)
  }
  if (description.length !== 1 || !description[0].trim()) {
    errors.push(`${displayPath}: expected exactly one non-empty description`)
  }

  if (isNoindex) {
    noindexCount += 1
    continue
  }

  if (titles.length === 1) {
    if (indexableTitles.has(titles[0])) {
      errors.push(`${displayPath}: duplicate page title (also in ${indexableTitles.get(titles[0])})`)
    } else {
      indexableTitles.set(titles[0], displayPath)
    }
  }
  if (description.length === 1) {
    if (description[0].length < 30 || description[0].length > 160) {
      errors.push(`${displayPath}: description length is ${description[0].length}; expected 30-160 characters`)
    }
    if (indexableDescriptions.has(description[0])) {
      errors.push(`${displayPath}: duplicate description (also in ${indexableDescriptions.get(description[0])})`)
    } else {
      indexableDescriptions.set(description[0], displayPath)
    }
  }

  if (canonical.length !== 1) {
    errors.push(`${displayPath}: expected exactly one canonical URL`)
    continue
  }
  if (!canonical[0].startsWith(publicOrigin)) {
    errors.push(`${displayPath}: canonical URL is outside the public site`)
  }
  if (openGraphUrl.length !== 1 || openGraphUrl[0] !== canonical[0]) {
    errors.push(`${displayPath}: og:url does not match canonical URL`)
  }
  if (indexableUrls.has(canonical[0])) {
    errors.push(`${displayPath}: duplicate canonical URL (also in ${indexableUrls.get(canonical[0])})`)
  } else {
    indexableUrls.set(canonical[0], displayPath)
  }
}

for (const reference of internalReferences) {
  let url
  try {
    url = new URL(reference.value, new URL(reference.sourceUrlPath, publicOrigin).href)
  } catch {
    errors.push(`${reference.displayPath}: invalid URL ${reference.value}`)
    continue
  }

  if (url.origin !== new URL(publicOrigin).origin) continue
  if (!url.pathname.startsWith('/creator-first-platform/')) {
    errors.push(`${reference.displayPath}: same-origin URL escapes the site base: ${reference.value}`)
    continue
  }

  internalReferenceCount += 1
  const target = htmlByUrlPath.get(url.pathname)
  if (!target && !generatedPaths.has(url.pathname)) {
    errors.push(`${reference.displayPath}: unresolved internal reference ${reference.value}`)
    continue
  }

  if (url.hash && target) {
    let id
    try {
      id = decodeURIComponent(url.hash.slice(1))
    } catch {
      errors.push(`${reference.displayPath}: malformed URL fragment ${reference.value}`)
      continue
    }
    if (id && !target.ids.has(id)) {
      errors.push(`${reference.displayPath}: missing fragment #${id} in ${target.displayPath}`)
    }
  }
}

const sitemapSource = await readFile(join(outputDirectory, 'sitemap.xml'), 'utf8')
const sitemapUrls = new Set(matches(sitemapSource, /<loc>(.*?)<\/loc>/g))
const homeSource = await readFile(join(outputDirectory, 'index.html'), 'utf8')
let buildInfo

try {
  buildInfo = JSON.parse(await readFile(join(outputDirectory, 'build-info.json'), 'utf8'))
  if (
    buildInfo.schemaVersion !== 1 ||
    buildInfo.repository !== 'shigeichiroyamasaki/creator-first-platform' ||
    buildInfo.base !== '/creator-first-platform/' ||
    (buildInfo.commit !== 'local' && !/^[0-9a-f]{40}$/.test(buildInfo.commit))
  ) {
    errors.push('build-info.json: metadata is incomplete or inconsistent')
  }
} catch {
  errors.push('build-info.json: missing or invalid JSON')
}

for (const label of requiredHomeLabels) {
  if (!homeSource.includes(label)) errors.push(`index.html: missing localized UI fragment ${label}`)
}
for (const label of forbiddenHomeLabels) {
  if (homeSource.includes(label)) errors.push(`index.html: untranslated UI fragment ${label}`)
}

for (const [url, displayPath] of indexableUrls) {
  if (!sitemapUrls.has(url)) errors.push(`${displayPath}: canonical URL is missing from sitemap`)
}
for (const url of sitemapUrls) {
  if (!indexableUrls.has(url)) errors.push(`sitemap.xml: non-indexable or unknown URL ${url}`)
}
for (const route of requiredProtocolRoutes) {
  const url = new URL(route, publicOrigin).href
  if (!indexableUrls.has(url)) errors.push(`required Protocol page is not indexable: ${url}`)
}

const assetDirectory = join(outputDirectory, 'assets')
const appAssets = (await readdir(assetDirectory)).filter((name) => /^app\.[^.]+\.js$/.test(name))
const javascriptAssets = generatedFiles.filter((file) => file.startsWith(assetDirectory) && file.endsWith('.js'))
const searchAssets = javascriptAssets.filter((file) => /@localSearchIndex[^/]*\.[^.]+\.js$/.test(file))
const otherJavascriptAssets = javascriptAssets.filter((file) => !searchAssets.includes(file))
const htmlAssetSizes = await Promise.all(files.map(async (file) => ({ file, bytes: (await stat(file)).size })))
const javascriptAssetSizes = await Promise.all(
  otherJavascriptAssets.map(async (file) => ({ file, bytes: (await stat(file)).size }))
)
let appAssetBytes = 0
let searchAssetBytes = 0
let searchAssetGzipBytes = 0

if (appAssets.length !== 1) {
  errors.push(`assets: expected exactly one app entry chunk, found ${appAssets.length}`)
} else {
  appAssetBytes = (await stat(join(assetDirectory, appAssets[0]))).size
  if (appAssetBytes > 50_000) {
    errors.push(`assets/${appAssets[0]}: shared app entry is ${appAssetBytes} bytes (limit: 50000)`)
  }
}

if (searchAssets.length !== 1) {
  errors.push(`assets: expected exactly one local search index chunk, found ${searchAssets.length}`)
} else {
  const searchAsset = await readFile(searchAssets[0])
  searchAssetBytes = searchAsset.byteLength
  searchAssetGzipBytes = gzipSync(searchAsset, { level: 9 }).byteLength
  if (searchAssetBytes > 1_500_000) {
    errors.push(`${relative(outputDirectory, searchAssets[0])}: raw search index is ${searchAssetBytes} bytes (limit: 1500000)`)
  }
  if (searchAssetGzipBytes > 300_000) {
    errors.push(`${relative(outputDirectory, searchAssets[0])}: gzip search index is ${searchAssetGzipBytes} bytes (limit: 300000)`)
  }
}

for (const { file, bytes } of javascriptAssetSizes) {
  if (bytes > 800_000) {
    errors.push(`${relative(outputDirectory, file)}: JavaScript chunk is ${bytes} bytes (limit: 800000)`)
  }
}
for (const { file, bytes } of htmlAssetSizes) {
  if (bytes > 800_000) {
    errors.push(`${relative(outputDirectory, file)}: HTML document is ${bytes} bytes (limit: 800000)`)
  }
}

if (errors.length) {
  console.error('Site output validation failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`Site output validation passed: ${indexableUrls.size} indexable page(s), ${noindexCount} noindex page(s), ${sitemapUrls.size} sitemap URL(s), ${diagramCount} Mermaid text alternative(s), ${internalReferenceCount} internal reference(s), ${externalReferenceCount} external link(s), ${appAssetBytes} byte shared app entry, ${searchAssetBytes} byte raw / ${searchAssetGzipBytes} byte gzip search index.`)
