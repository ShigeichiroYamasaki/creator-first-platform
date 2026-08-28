import { defineConfig } from 'vitepress'

const repository = 'shigeichiroyamasaki/creator-first-platform'
const githubCommit = process.env.GITHUB_SHA
const buildCommit = githubCommit && /^[0-9a-f]{40}$/.test(githubCommit)
  ? githubCommit
  : 'local'

const englishTheme = {
  nav: [
    { text: 'Home', link: '/en/' },
    { text: 'Whitepaper', link: '/en/whitepaper/' },
    { text: 'Protocol', link: '/en/protocol/' },
    { text: 'Testnet demo', link: '/en/demo/' },
    { text: 'GitHub', link: 'https://github.com/ShigeichiroYamasaki/creator-first-platform' }
  ],
  sidebar: {
    '/en/demo/': [
      {
        text: 'Testnet demo',
        items: [
          { text: 'Overview', link: '/en/demo/' },
          { text: 'Amoy Test POL funding request', link: '/en/demo/amoy-pol-funding-request' },
          { text: 'MetaMask and Amoy guide (Japanese)', link: '/demo/metamask-amoy-setup' },
          { text: 'User services (Japanese UI)', link: '/demo/user-services' },
          { text: 'Creator services (Japanese UI)', link: '/demo/creator-services' },
          { text: 'Governance demo (Japanese UI)', link: '/demo/governance' },
          { text: 'Published contracts', link: '/demo/testnet-contracts' }
        ]
      }
    ],
    '/en/whitepaper/': [
      {
        text: 'Whitepaper',
        items: [
          { text: 'Overview', link: '/en/whitepaper/' },
          { text: '01 Vision', link: '/en/whitepaper/01-vision' },
          { text: '02 Market and problem', link: '/en/whitepaper/02-market' },
          { text: '03 Rights and money', link: '/en/whitepaper/03-rights-and-money' },
          { text: '04 Platform architecture', link: '/en/whitepaper/04-platform-architecture' },
          { text: '05 Creator onboarding', link: '/en/whitepaper/05-creator-onboarding' },
          { text: '06 Economic model', link: '/en/whitepaper/06-economics' },
          { text: '07 Governance', link: '/en/whitepaper/07-governance' },
          { text: '08 Discovery and community', link: '/en/whitepaper/08-discovery-community' },
          { text: '09 Technology', link: '/en/whitepaper/09-technology' },
          { text: '10 Security', link: '/en/whitepaper/10-security' },
          { text: '11 Legal, STO and tax', link: '/en/whitepaper/11-legal-sto-tax' },
          { text: '12 Infrastructure and cost', link: '/en/whitepaper/12-infrastructure-cost' },
          { text: '13 Roadmap', link: '/en/whitepaper/13-roadmap' }
        ]
      }
    ],
    '/en/protocol/': [
      {
        text: 'Protocol specifications',
        items: [
          { text: 'Overview', link: '/en/protocol/' },
          { text: 'Account lifecycle', link: '/en/protocol/specs/account-lifecycle' },
          { text: 'Wallet linking', link: '/en/protocol/specs/wallet-linking' },
          { text: 'Supporter credential', link: '/en/protocol/specs/early-supporter-credential' },
          { text: 'Subscription settlement', link: '/en/protocol/specs/subscription-settlement' },
          { text: 'Settlement asset registry', link: '/en/protocol/specs/settlement-asset-registry' },
          { text: 'Rights registry', link: '/en/protocol/specs/rights-registry' },
          { text: 'Playback authorization', link: '/en/protocol/specs/playback-authorization' },
          { text: 'Player client', link: '/en/protocol/specs/player-client' },
          { text: 'Playback verification', link: '/en/protocol/specs/playback-verification' },
          { text: 'Creator distribution', link: '/en/protocol/specs/creator-distribution' },
          { text: 'Governance change', link: '/en/protocol/specs/governance-change' },
          { text: 'Transparent ZK verification', link: '/en/protocol/specs/transparent-zk-verification' },
          { text: 'Production lifecycle', link: '/en/protocol/specs/production-service-lifecycle' }
        ]
      }
    ]
  },
  notFound: {
    title: 'Page not found',
    quote: 'The URL may have changed or the page may not be published yet.',
    linkLabel: 'Return to the Creator First Platform home page',
    linkText: 'Return home'
  },
  footer: {
    message: 'A verifiable music platform for independent music creators and users',
    copyright: 'Creator First Platform'
  },
  editLink: {
    pattern: 'https://github.com/ShigeichiroYamasaki/creator-first-platform/edit/main/docs/:path',
    text: 'Edit this page on GitHub'
  },
  lastUpdated: { text: 'Last updated' },
  outline: { level: [2, 3] as [number, number], label: 'On this page' },
  docFooter: { prev: 'Previous page', next: 'Next page' },
  returnToTopLabel: 'Return to top',
  sidebarMenuLabel: 'Menu',
  darkModeSwitchLabel: 'Theme',
  lightModeSwitchTitle: 'Switch to light theme',
  darkModeSwitchTitle: 'Switch to dark theme',
  langMenuLabel: 'Change language',
  skipToContentLabel: 'Skip to content',
  search: { provider: 'local' as const }
}

export default defineConfig({
    locales: {
      root: {
        label: '日本語',
        lang: 'ja-JP',
        link: '/',
        title: 'Creator First Platform',
        description: '音楽クリエーターとユーザが共同統治する、音楽クリエーター中心の音楽配信プラットフォーム構想'
      },
      en: {
        label: 'English',
        lang: 'en-US',
        link: '/en/',
        title: 'Creator First Platform',
        description: 'A creator-first music platform governed jointly by independent music creators and users',
        themeConfig: englishTheme
      }
    },

    base: '/creator-first-platform/',
    srcExclude: ['**/* 2.md'],
    vite: {
      server: {
        proxy: {
          '/api': 'http://127.0.0.1:8787'
        }
      },
      plugins: [
        {
          name: 'creator-first-build-info',
          apply: 'build',
          generateBundle() {
            this.emitFile({
              type: 'asset',
              fileName: 'build-info.json',
              source: `${JSON.stringify({
                schemaVersion: 1,
                repository,
                commit: buildCommit,
                base: '/creator-first-platform/'
              }, null, 2)}\n`
            })
          }
        }
      ],
      build: {
        // Lazy search, Mermaid, and long-form page chunks have explicit budgets
        // in scripts/validate-site-output.mjs.
        chunkSizeWarningLimit: 1000
      }
    },
    lastUpdated: true,
    sitemap: {
      hostname: 'https://shigeichiroyamasaki.github.io/creator-first-platform/',
      transformItems(items) {
        return items.filter(({ url }) =>
          !url.endsWith('whitepaper/06-economics-mathjax') &&
          !url.includes('admin/') &&
          !url.endsWith('demo/participant-registration')
        )
      }
    },
    transformHead({ pageData, title, description }) {
      const route = pageData.relativePath
        .replace(/(^|\/)index\.md$/, '$1')
        .replace(/\.md$/, '')
      const canonicalUrl = new URL(
        pageData.frontmatter.canonical ?? route,
        'https://shigeichiroyamasaki.github.io/creator-first-platform/'
      ).href

      const isEnglish = pageData.relativePath.startsWith('en/')
      const language = isEnglish ? 'en-US' : 'ja-JP'
      const openGraphLocale = isEnglish ? 'en_US' : 'ja_JP'
      const imageAlt = isEnglish
        ? 'Creator First Platform symbol'
        : 'Creator First Platformのシンボル'
      const websiteDescription = isEnglish
        ? 'A creator-first music platform governed jointly by independent music creators and users'
        : '音楽クリエーターとユーザが共同統治する、音楽クリエーター中心の音楽配信プラットフォーム構想'

      const head = [
        ['link', { rel: 'canonical', href: canonicalUrl }],
        ['meta', { property: 'og:title', content: title }],
        ['meta', { property: 'og:description', content: description }],
        ['meta', { property: 'og:url', content: canonicalUrl }],
        ['meta', { property: 'og:locale', content: openGraphLocale }],
        ['meta', { property: 'og:image:alt', content: imageAlt }],
        ['meta', { name: 'twitter:card', content: 'summary' }],
        ['meta', { name: 'twitter:title', content: title }],
        ['meta', { name: 'twitter:description', content: description }],
        ['meta', { name: 'twitter:image:alt', content: imageAlt }],
        [
          'script',
          { type: 'application/ld+json' },
          JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'Creator First Platform',
            url: 'https://shigeichiroyamasaki.github.io/creator-first-platform/',
            description: websiteDescription,
            inLanguage: language,
            image: 'https://shigeichiroyamasaki.github.io/creator-first-platform/creator-first-platform-symbol.png',
            sameAs: 'https://github.com/ShigeichiroYamasaki/creator-first-platform'
          })
        ]
      ]

      if (pageData.isNotFound) {
        head.push(['meta', { name: 'robots', content: 'noindex' }])
        return head
      }

      if (pageData.frontmatter.robots) {
        head.push(['meta', { name: 'robots', content: pageData.frontmatter.robots }])
      }

      return head
    },

    head: [
      ['meta', { name: 'theme-color', content: '#3451b2' }],
      ['meta', { property: 'og:type', content: 'website' }],
      ['meta', { property: 'og:site_name', content: 'Creator First Platform' }],
      [
        'meta',
        {
          property: 'og:image',
          content: 'https://shigeichiroyamasaki.github.io/creator-first-platform/creator-first-platform-symbol.png'
        }
      ],
      ['meta', { property: 'og:image:type', content: 'image/png' }],
      ['meta', { property: 'og:image:width', content: '1254' }],
      ['meta', { property: 'og:image:height', content: '1254' }],
      [
        'meta',
        {
          name: 'twitter:image',
          content: 'https://shigeichiroyamasaki.github.io/creator-first-platform/creator-first-platform-symbol.png'
        }
      ],
      [
        'link',
        {
          rel: 'sitemap',
          type: 'application/xml',
          href: '/creator-first-platform/sitemap.xml'
        }
      ],
      ['link', { rel: 'icon', href: '/creator-first-platform/creator-first-platform-symbol.png' }]
    ],

    cleanUrls: true,
    markdown: {
      math: true,
      config(markdown) {
        const defaultFence = markdown.renderer.rules.fence

        markdown.renderer.rules.fence = (tokens, index, options, environment, self) => {
          const token = tokens[index]
          const language = token.info.trim()

          if (language === 'mermaid' || language === 'mmd') {
            const directive = token.content.trim().split(/\s+/)[0]
            const isEnglish = environment.relativePath?.startsWith('en/')
            const labels: Record<string, string> = isEnglish
              ? {
                  flowchart: 'Flowchart',
                  graph: 'Flowchart',
                  sequenceDiagram: 'Sequence diagram'
                }
              : {
                  flowchart: 'フローチャート',
                  graph: 'フローチャート',
                  sequenceDiagram: 'シーケンス図'
                }
            const label = labels[directive] ?? (isEnglish ? 'Mermaid diagram' : 'Mermaid図')
            const encodedGraph = encodeURIComponent(token.content)
            const escapedSource = markdown.utils.escapeHtml(token.content)

            return [
              '<figure class="mermaid-diagram">',
              `<ClientOnly><MermaidDiagram id="mermaid-${index}" graph="${encodedGraph}" label="${label}" /></ClientOnly>`,
              '<details class="mermaid-diagram__source">',
              `<summary>${isEnglish ? `Show ${label.toLowerCase()} as text` : `${label}のテキスト表現を表示`}</summary>`,
              `<pre v-pre><code>${escapedSource}</code></pre>`,
              '</details>',
              '</figure>'
            ].join('')
          }

          return defaultFence(tokens, index, options, environment, self)
        }
      }
    },
    themeConfig: {
      siteTitle: 'Creator First Platform',
      logo: '/creator-first-platform-symbol.png',
      externalLinkIcon: true,
      i18nRouting: false,

      notFound: {
        title: 'ページが見つかりません',
        quote: 'URLが変更されたか、ページがまだ公開されていない可能性があります。',
        linkLabel: 'Creator First Platformのホームへ戻る',
        linkText: 'ホームへ戻る'
      },

      nav: [
        { text: 'ホーム', link: '/' },
        { text: 'テストネットデモ', link: '/demo/' },
        { text: '現在の状況', link: '/status' },
        { text: '用語表', link: '/terminology' },
        { text: 'ホワイトペーパー', link: '/whitepaper/' },
        { text: 'ガバナンス', link: '/governance/' },
        { text: 'プロトコル', link: '/protocol/' },
        { text: 'CFP', link: '/proposals/' },
        { text: 'ADR 一覧', link: '/adr/' }
      ],

      sidebar: {
        '/demo/': [
          {
            text: 'デモ',
            items: [
              { text: 'テストネットデモ入口', link: '/demo/' },
              { text: 'MetaMask・Amoy接続手順', link: '/demo/metamask-amoy-setup' },
              { text: 'ユーザ向けサービス', link: '/demo/user-services' },
              { text: 'テストユーザ登録デモ', link: '/demo/test-user-registration' },
              { text: 'ユーザ向け利用デモ', link: '/demo/user-service' },
              { text: '音楽クリエーター向けサービス', link: '/demo/creator-services' },
              { text: 'テスト音楽クリエーター登録デモ', link: '/demo/creator-registration' },
              { text: '音楽クリエーター作業画面デモ', link: '/demo/creator-workspace' },
              { text: '資金フロー可視化デモ', link: '/demo/treasury-dashboard' },
              { text: 'テストネット版ガバナンス', link: '/demo/governance' },
              { text: '音楽クリエータ院議会', link: '/demo/creator-house' },
              { text: 'ユーザ院議会', link: '/demo/user-house' },
              { text: 'Polygon Amoyスマートコントラクト', link: '/demo/testnet-contracts' },
              { text: 'ローカル音楽ストリーミング', link: '/demo/local-streaming' },
              { text: 'ローカルストリーミングゲートウェイ', link: '/demo/local-gateway' }
            ]
          }
        ],
        '/whitepaper/': [
          {
            text: 'ホワイトペーパー',
            items: [
              { text: '概要', link: '/whitepaper/' },
              { text: '01 ビジョン', link: '/whitepaper/01-vision' },
              { text: '02 市場と課題', link: '/whitepaper/02-market' },
              { text: '03 権利と資金', link: '/whitepaper/03-rights-and-money' },
              { text: '04 プラットフォーム構成', link: '/whitepaper/04-platform-architecture' },
              { text: '05 クリエイター登録', link: '/whitepaper/05-creator-onboarding' },
              { text: '06 経済モデル', link: '/whitepaper/06-economics' },
              { text: '07 ガバナンス', link: '/whitepaper/07-governance' },
              { text: '08 発見とコミュニティ', link: '/whitepaper/08-discovery-community' },
              { text: '09 技術', link: '/whitepaper/09-technology' },
              { text: '10 セキュリティ', link: '/whitepaper/10-security' },
              { text: '11 法務・STO・税務', link: '/whitepaper/11-legal-sto-tax' },
              { text: '12 インフラコスト', link: '/whitepaper/12-infrastructure-cost' },
              { text: '13 ロードマップ', link: '/whitepaper/13-roadmap' }
            ]
          }
        ],
        '/protocol/': [
          {
            text: 'プロトコル基盤',
            items: [
              { text: '概要・実装フロー', link: '/protocol/' },
              { text: 'エンドツーエンド最小縦断実装', link: '/protocol/vertical-slice' },
              { text: '最小縦断実装計画', link: '/protocol/implementation-plan' },
              { text: '決定基準', link: '/protocol/decision-baseline' },
              { text: '決定待ち一覧', link: '/protocol/open-questions' },
              { text: 'プロトコルREADME', link: '/protocol/foundation/overview' },
              { text: '規約', link: '/protocol/foundation/conventions' },
              { text: '用語集', link: '/protocol/foundation/glossary' },
              { text: '全体不変条件', link: '/protocol/foundation/invariants' }
            ]
          },
          {
            text: 'プロトコル仕様',
            items: [
              {
                text: 'アカウントライフサイクル（草案）',
                link: '/protocol/specs/account-lifecycle'
              },
              {
                text: 'ウォレット連携（草案）',
                link: '/protocol/specs/wallet-linking'
              },
              {
                text: '初期サポーター資格証明（草案）',
                link: '/protocol/specs/early-supporter-credential'
              },
              {
                text: 'サブスクリプション決済（草案）',
                link: '/protocol/specs/subscription-settlement'
              },
              {
                text: '決済資産登録簿（草案）',
                link: '/protocol/specs/settlement-asset-registry'
              },
              {
                text: '権利登録簿（草案）',
                link: '/protocol/specs/rights-registry'
              },
              {
                text: '再生認可（草案）',
                link: '/protocol/specs/playback-authorization'
              },
              {
                text: 'プレーヤークライアント（草案）',
                link: '/protocol/specs/player-client'
              },
              {
                text: '再生検証（草案）',
                link: '/protocol/specs/playback-verification'
              },
              {
                text: '音楽クリエーター分配（草案）',
                link: '/protocol/specs/creator-distribution'
              },
              {
                text: 'ガバナンス変更（草案）',
                link: '/protocol/specs/governance-change'
              },
              {
                text: '透明型ゼロ知識証明検証（草案）',
                link: '/protocol/specs/transparent-zk-verification'
              },
              {
                text: '本番サービスライフサイクル（草案）',
                link: '/protocol/specs/production-service-lifecycle'
              }
            ]
          }
        ],
        '/adr/': [
          {
            text: 'アーキテクチャ意思決定記録',
            items: [
              { text: 'ADR一覧', link: '/adr/' },
              { text: '0001 ガバナンスモデル', link: '/adr/ADR-0001-governance-model' },
              { text: '0002 検証可能な抽選代表制', link: '/adr/ADR-0002-verifiable-sortition' },
              { text: '0003 権利登録簿', link: '/adr/ADR-0003-rights-registry' },
              { text: '0004 音楽クリエーター分配', link: '/adr/ADR-0004-creator-distribution-model' },
              { text: '0005 利用実績オラクル', link: '/adr/ADR-0005-usage-oracle' },
              { text: '0006 ゼロ知識証明', link: '/adr/ADR-0006-zero-knowledge-proof-strategy' },
              { text: '0007 ブロックチェーン／L2', link: '/adr/ADR-0007-blockchain-l2-strategy' },
              { text: '0008 アカウント／ウォレット／本人性', link: '/adr/ADR-0008-account-wallet-identity-strategy' },
              { text: '0009 Navidrome／ストリーミングゲートウェイ', link: '/adr/ADR-0009-navidrome-streaming-gateway' },
              { text: '0010 初期サポーターSBT', link: '/adr/ADR-0010-early-supporter-sbt-privileges' },
              { text: '0011 統合プレーヤークライアント', link: '/adr/ADR-0011-integrated-player-client' },
              { text: '0013 資金フローの透明性', link: '/adr/ADR-0013-treasury-flow-transparency' },
              { text: '0014 公開テストネットのユーザ体験経路', link: '/adr/ADR-0014-public-testnet-user-journey' },
              { text: '0015 公開テストネットの音楽クリエーター体験経路', link: '/adr/ADR-0015-public-testnet-creator-journey' },
              { text: '0016 二院制ガバナンス', link: '/adr/ADR-0016-bicameral-quadratic-governance' },
              { text: '0017 透明型ZKのテストネット／本番境界', link: '/adr/ADR-0017-transparent-zk-testnet-mainnet-boundary' },
              { text: '0018 本番サービス全体アーキテクチャ', link: '/adr/ADR-0018-production-service-architecture' }
            ]
          }
        ],
        '/governance/': [
          {
            text: '二院制ガバナンス',
            items: [
              { text: '議会・投票システム', link: '/governance/' },
              { text: 'CFP文書', link: '/proposals/' },
              { text: 'ガバナンスプロトコル', link: '/protocol/specs/governance-change' },
              { text: '設計判断 ADR-0016', link: '/adr/ADR-0016-bicameral-quadratic-governance' }
            ]
          }
        ],
        '/proposals/': [
          {
            text: 'CFP文書',
            items: [
              { text: 'CFP文書一覧', link: '/proposals/' },
              { text: 'CFP文書・議事録管理', link: '/proposals/record-management' },
              { text: 'CFP-0002 初期サポーター1年未満ルール', link: '/proposals/CFP-0002-early-supporter-one-year-rule' }
            ]
          }
        ]
      },

      socialLinks: [
        {
          icon: 'github',
          link: 'https://github.com/ShigeichiroYamasaki/creator-first-platform'
        }
      ],

      footer: {
        message: '音楽クリエーターとユーザのための、検証可能な音楽プラットフォーム',
        copyright: 'Creator First Platform'
      },

      editLink: {
        pattern: 'https://github.com/ShigeichiroYamasaki/creator-first-platform/edit/main/docs/:path',
        text: 'GitHubでこのページを編集'
      },

      lastUpdated: {
        text: '最終更新'
      },

      outline: {
        level: [2, 3],
        label: 'このページ'
      },

      docFooter: {
        prev: '前のページ',
        next: '次のページ'
      },

      returnToTopLabel: 'ページ上部へ戻る',
      sidebarMenuLabel: 'メニュー',
      darkModeSwitchLabel: '表示テーマ',
      lightModeSwitchTitle: 'ライトテーマへ切り替える',
      darkModeSwitchTitle: 'ダークテーマへ切り替える',
      langMenuLabel: '言語を変更',
      skipToContentLabel: '本文へ移動',

      search: {
        provider: 'local',
        options: {
          _render(source, environment, markdown) {
            const html = markdown.render(source, environment)
            if (environment.frontmatter?.search === false) return ''

            const withoutMermaidSources = html.replace(
              /<details class="mermaid-diagram__source">[\s\S]*?<\/details>/g,
              ''
            )
            const withoutCredentialArtwork = withoutMermaidSources.replace(
              /<h3[^>]*id="supporter-early-supporter-sbtの表示例"[^>]*>[\s\S]*?(?=<h3|<h2|$)/,
              ''
            )
            const searchableDocument = environment.relativePath === 'whitepaper/11-legal-sto-tax.md'
              ? withoutCredentialArtwork
                .replace(
                  /<h2[^>]*id="_11-19-株主ガバナンスとプロトコルガバナンス"[^>]*>[\s\S]*?(?=<h2[^>]*id="_11-22-|$)/,
                  ''
                )
                .replace(
                  /<h2[^>]*id="_11-44-責任分担"[^>]*>[\s\S]*?(?=<h2|$)/,
                  ''
                )
              : withoutCredentialArtwork

            // アカウント結合の要点は検索可能に保ち、詳細は本文とADR-0019で
            // 提供することで、同じ説明による検索索引の重複を避ける。
            if (environment.relativePath?.endsWith('whitepaper/10-security.md')) {
              return searchableDocument.replace(
                /(<h3[^>]*id="_10-6-1-[^"]*"[^>]*>[\s\S]*?<\/h3>)[\s\S]*?(?=<hr><h2[^>]*id="_10-7-|$)/,
                '$1<p>JPKI本人確認、FIDO2／WebAuthnパスキー、MetaMaskウォレットをアカウント・トラストサービスで段階的に結合する。公開デモはモックJPKIとPolygon Amoyを使用し、詳細はADR-0019で定義する。</p>'
              )
            }

            // 長大なインフラ章の後半は、実装時に参照する運用詳細であるため、
            // ページ本文には残しつつローカル検索索引から除外する。
            if (environment.relativePath === 'whitepaper/12-infrastructure-cost.md') {
              return searchableDocument.replace(
                /<h2[^>]*id="_12-47-[^"]*"[^>]*>[\s\S]*$/,
                ''
              )
            }

            // CFP lifecycleの見出しと概要は検索可能に保ち、長いシナリオ表と
            // 証拠グラフは本文だけに掲載して検索転送量を抑える。
            if (environment.relativePath === 'whitepaper/07-governance.md') {
              return searchableDocument.replace(
                /<h3[^>]*id="標準手続き"[^>]*>[\s\S]*?(?=<h2|$)/,
                ''
              )
            }

            if (environment.relativePath === 'governance/index.md') {
              return searchableDocument.replace(
                /<h2[^>]*id="議会ページの画面構成"[^>]*>[\s\S]*$/,
                ''
              )
            }

            if (environment.relativePath === 'proposals/index.md') {
              return searchableDocument.replace(
                /<h2[^>]*id="cfp-手続"[^>]*>[\s\S]*$/,
                ''
              )
            }

            if (environment.relativePath?.startsWith('protocol/specs/')) {
              return searchableDocument
                .replace(
                  /<h2[^>]*id="interfaces"[^>]*>[\s\S]*?(?=<h2|$)/,
                  ''
                )
                .replace(
                  /<h2[^>]*id="test-requirements"[^>]*>[\s\S]*?(?=<h2|$)/,
                  ''
                )
                .replace(
                  /<h2[^>]*id="state-transitions"[^>]*>[\s\S]*?(?=<h2|$)/,
                  ''
                )
                .replace(
                  /<h2[^>]*id="error-conditions"[^>]*>[\s\S]*?(?=<h2|$)/,
                  ''
                )
            }

            if (environment.relativePath?.startsWith('adr/ADR-')) {
              return searchableDocument
                .replace(
                  /<h2[^>]*id="cfp文書・議事録管理"[^>]*>[\s\S]*?(?=<h2|$)/,
                  ''
                )
                .replace(
                  /<h2[^>]*id="[^"]*(?:alternatives-considered|検討した代替案)[^"]*"[^>]*>[\s\S]*?(?=<h2|$)/,
                  ''
                )
                .replace(
                  /<h2[^>]*id="[^"]*(?:testnet-acceptance-criteria|validation-gates|テストネット受入基準|検証ゲート|受入基準)[^"]*"[^>]*>[\s\S]*?(?=<h2|$)/,
                  ''
                )
                .replace(
                  /<h2[^>]*id="[^"]*(?:related-documents|関連文書)[^"]*"[^>]*>[\s\S]*?(?=<h2|$)/,
                  ''
                )
            }

            return searchableDocument
          },
          translations: {
            button: {
              buttonText: '検索',
              buttonAriaLabel: 'サイト内を検索'
            },
            modal: {
              displayDetails: '詳細を表示',
              resetButtonTitle: '検索をリセット',
              backButtonTitle: '検索を閉じる',
              noResultsText: '検索結果がありません：',
              footer: {
                selectText: '選択',
                selectKeyAriaLabel: 'Enterキー',
                navigateText: '移動',
                navigateUpKeyAriaLabel: '上矢印キー',
                navigateDownKeyAriaLabel: '下矢印キー',
                closeText: '閉じる',
                closeKeyAriaLabel: 'Escapeキー'
              }
            }
          }
        }
      }
    }
  })
