import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

export default withMermaid(
  defineConfig({
    lang: 'ja-JP',
    title: 'Creator First Platform',
    description: 'Creator First Platform Whitepaper',

    base: '/creator-first-platform/',

    cleanUrls: true,

    themeConfig: {
      siteTitle: 'Creator First Platform',

      nav: [
        { text: 'ホーム', link: '/' },
        { text: 'ホワイトペーパー', link: '/whitepaper/' },
        { text: 'CFP', link: '/proposals/' },
        { text: '設計決定', link: '/decisions/' }
      ],

      sidebar: {
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
        ]
      },

      socialLinks: [
        {
          icon: 'github',
          link: 'https://github.com/ShigeichiroYamasaki/creator-first-platform'
        }
      ],

      footer: {
        message: 'Creator First Platform',
        copyright: 'Copyright © Creator First Platform'
      },

      search: {
        provider: 'local'
      }
    }
  })
)