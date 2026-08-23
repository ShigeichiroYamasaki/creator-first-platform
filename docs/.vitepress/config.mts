import { defineConfig } from 'vitepress'

const repository = 'shigeichiroyamasaki/creator-first-platform'
const githubCommit = process.env.GITHUB_SHA
const buildCommit = githubCommit && /^[0-9a-f]{40}$/.test(githubCommit)
  ? githubCommit
  : 'local'

export default defineConfig({
    lang: 'ja-JP',
    title: 'Creator First Platform',
    description: 'CreatorとUserが共同統治する、クリエイター中心の音楽配信プラットフォーム構想',

    base: '/creator-first-platform/',
    srcExclude: ['**/* 2.md'],
    vite: {
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
        return items.filter(({ url }) => !url.endsWith('whitepaper/06-economics-mathjax'))
      }
    },
    transformHead({ pageData, title, description }) {
      if (pageData.isNotFound) {
        return [['meta', { name: 'robots', content: 'noindex' }]]
      }

      const route = pageData.relativePath
        .replace(/(^|\/)index\.md$/, '$1')
        .replace(/\.md$/, '')
      const canonicalUrl = new URL(
        pageData.frontmatter.canonical ?? route,
        'https://shigeichiroyamasaki.github.io/creator-first-platform/'
      ).href

      const head = [
        ['link', { rel: 'canonical', href: canonicalUrl }],
        ['meta', { property: 'og:title', content: title }],
        ['meta', { property: 'og:description', content: description }],
        ['meta', { property: 'og:url', content: canonicalUrl }],
        ['meta', { name: 'twitter:card', content: 'summary' }],
        ['meta', { name: 'twitter:title', content: title }],
        ['meta', { name: 'twitter:description', content: description }]
      ]

      if (pageData.frontmatter.robots) {
        head.push(['meta', { name: 'robots', content: pageData.frontmatter.robots }])
      }

      return head
    },

    head: [
      ['meta', { name: 'theme-color', content: '#3451b2' }],
      ['meta', { property: 'og:type', content: 'website' }],
      ['meta', { property: 'og:site_name', content: 'Creator First Platform' }],
      ['meta', { property: 'og:locale', content: 'ja_JP' }],
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
      ['meta', { property: 'og:image:alt', content: 'Creator First Platformのシンボル' }],
      [
        'meta',
        {
          name: 'twitter:image',
          content: 'https://shigeichiroyamasaki.github.io/creator-first-platform/creator-first-platform-symbol.png'
        }
      ],
      ['meta', { name: 'twitter:image:alt', content: 'Creator First Platformのシンボル' }],
      [
        'link',
        {
          rel: 'sitemap',
          type: 'application/xml',
          href: '/creator-first-platform/sitemap.xml'
        }
      ],
      ['link', { rel: 'icon', href: '/creator-first-platform/creator-first-platform-symbol.png' }],
      [
        'script',
        { type: 'application/ld+json' },
        JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'Creator First Platform',
          url: 'https://shigeichiroyamasaki.github.io/creator-first-platform/',
          description: 'CreatorとUserが共同統治する、クリエイター中心の音楽配信プラットフォーム構想',
          inLanguage: 'ja-JP',
          image: 'https://shigeichiroyamasaki.github.io/creator-first-platform/creator-first-platform-symbol.png',
          sameAs: 'https://github.com/ShigeichiroYamasaki/creator-first-platform'
        })
      ]
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
            const labels: Record<string, string> = {
              flowchart: 'フローチャート',
              graph: 'フローチャート',
              sequenceDiagram: 'シーケンス図'
            }
            const label = labels[directive] ?? 'Mermaid図'
            const encodedGraph = encodeURIComponent(token.content)
            const escapedSource = markdown.utils.escapeHtml(token.content)

            return [
              '<figure class="mermaid-diagram">',
              `<ClientOnly><MermaidDiagram id="mermaid-${index}" graph="${encodedGraph}" label="${label}" /></ClientOnly>`,
              '<details class="mermaid-diagram__source">',
              `<summary>${label}のテキスト表現を表示</summary>`,
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

      notFound: {
        title: 'ページが見つかりません',
        quote: 'URLが変更されたか、ページがまだ公開されていない可能性があります。',
        linkLabel: 'Creator First Platformのホームへ戻る',
        linkText: 'ホームへ戻る'
      },

      nav: [
        { text: 'ホーム', link: '/' },
        { text: 'Testnetデモ', link: '/demo/' },
        { text: '現在の状況', link: '/status' },
        { text: 'ホワイトペーパー', link: '/whitepaper/' },
        { text: 'Protocol', link: '/protocol/' },
        { text: 'CFP', link: '/proposals/' },
        { text: 'ADR 一覧', link: '/adr/' }
      ],

      sidebar: {
        '/demo/': [
          {
            text: 'Demo',
            items: [
              { text: 'Testnetデモ入口', link: '/demo/' },
              { text: 'Test User登録デモ', link: '/demo/test-user-registration' },
              { text: 'ローカル音楽ストリーミング', link: '/demo/local-streaming' },
              { text: 'ローカルStreaming Gateway', link: '/demo/local-gateway' }
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
            text: 'Protocol Foundation',
            items: [
              { text: '概要・実装フロー', link: '/protocol/' },
              { text: 'End-to-End Vertical Slice', link: '/protocol/vertical-slice' },
              { text: 'Vertical Slice実装計画', link: '/protocol/implementation-plan' },
              { text: 'Decision Baseline', link: '/protocol/decision-baseline' },
              { text: '決定待ち一覧', link: '/protocol/open-questions' },
              { text: 'Protocol README', link: '/protocol/foundation/overview' },
              { text: 'Conventions', link: '/protocol/foundation/conventions' },
              { text: 'Glossary', link: '/protocol/foundation/glossary' },
              { text: 'Global Invariants', link: '/protocol/foundation/invariants' }
            ]
          },
          {
            text: 'Protocol Specifications',
            items: [
              {
                text: 'Account Lifecycle (Draft)',
                link: '/protocol/specs/account-lifecycle'
              },
              {
                text: 'Wallet Linking (Draft)',
                link: '/protocol/specs/wallet-linking'
              },
              {
                text: 'Early Supporter Credential (Draft)',
                link: '/protocol/specs/early-supporter-credential'
              },
              {
                text: 'Subscription Settlement (Draft)',
                link: '/protocol/specs/subscription-settlement'
              },
              {
                text: 'Settlement Asset Registry (Draft)',
                link: '/protocol/specs/settlement-asset-registry'
              },
              {
                text: 'Rights Registry (Draft)',
                link: '/protocol/specs/rights-registry'
              },
              {
                text: 'Playback Authorization (Draft)',
                link: '/protocol/specs/playback-authorization'
              },
              {
                text: 'Player Client (Draft)',
                link: '/protocol/specs/player-client'
              },
              {
                text: 'Playback Verification (Draft)',
                link: '/protocol/specs/playback-verification'
              },
              {
                text: 'Creator Distribution (Draft)',
                link: '/protocol/specs/creator-distribution'
              }
            ]
          }
        ],
        '/adr/': [
          {
            text: 'Architecture Decision Records',
            items: [
              { text: 'ADR一覧', link: '/adr/' },
              { text: '0001 Governance Model', link: '/adr/ADR-0001-governance-model' },
              { text: '0002 Verifiable Sortition', link: '/adr/ADR-0002-verifiable-sortition' },
              { text: '0003 Rights Registry', link: '/adr/ADR-0003-rights-registry' },
              { text: '0004 Creator Distribution', link: '/adr/ADR-0004-creator-distribution-model' },
              { text: '0005 Usage Oracle', link: '/adr/ADR-0005-usage-oracle' },
              { text: '0006 Zero-Knowledge Proof', link: '/adr/ADR-0006-zero-knowledge-proof-strategy' },
              { text: '0007 Blockchain / L2', link: '/adr/ADR-0007-blockchain-l2-strategy' },
              { text: '0008 Account / Wallet / Identity', link: '/adr/ADR-0008-account-wallet-identity-strategy' },
              { text: '0009 Navidrome / Streaming Gateway', link: '/adr/ADR-0009-navidrome-streaming-gateway' },
              { text: '0010 Early Supporter SBT', link: '/adr/ADR-0010-early-supporter-sbt-privileges' },
              { text: '0011 Integrated Player Client', link: '/adr/ADR-0011-integrated-player-client' }
            ]
          }
        ],
        '/proposals/': [
          {
            text: 'Creator First Proposal',
            items: [{ text: 'CFP制度・一覧', link: '/proposals/' }]
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
        message: 'CreatorとUserのための、検証可能な音楽プラットフォーム',
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

            if (environment.relativePath?.startsWith('protocol/specs/')) {
              return withoutCredentialArtwork
                .replace(
                  /<h2[^>]*id="interfaces"[^>]*>[\s\S]*?(?=<h2|$)/,
                  ''
                )
                .replace(
                  /<h2[^>]*id="test-requirements"[^>]*>[\s\S]*?(?=<h2|$)/,
                  ''
                )
            }

            if (environment.relativePath?.startsWith('adr/ADR-')) {
              return withoutCredentialArtwork
                .replace(
                  /<h2[^>]*id="[^"]*alternatives-considered[^"]*"[^>]*>[\s\S]*?(?=<h2|$)/,
                  ''
                )
                .replace(
                  /<h2[^>]*id="[^"]*(?:testnet-acceptance-criteria|validation-gates)[^"]*"[^>]*>[\s\S]*?(?=<h2|$)/,
                  ''
                )
                .replace(
                  /<h2[^>]*id="[^"]*related-documents[^"]*"[^>]*>[\s\S]*?(?=<h2|$)/,
                  ''
                )
            }

            return withoutCredentialArtwork
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
