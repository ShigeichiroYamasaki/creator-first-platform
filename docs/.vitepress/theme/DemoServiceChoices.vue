<script setup lang="ts">
import { computed } from 'vue'
import { withBase } from 'vitepress'

type ChoiceKind = 'entry' | 'user' | 'creator'

const props = defineProps<{ kind: ChoiceKind }>()

const choices = computed(() => {
  if (props.kind === 'user') {
    return [
      {
        eyebrow: 'Registration',
        title: '登録する',
        description: 'AliasとDemo利用条件を登録し、このタブだけのTest Userを作成します。',
        link: '/demo/test-user-registration',
        action: 'Test User登録へ'
      },
      {
        eyebrow: 'Use',
        title: '利用する',
        description: '登録状態を確認し、合成CatalogとローカルPlayerへの利用導線を試します。',
        link: '/demo/user-service',
        action: 'ユーザ向け利用デモへ'
      }
    ]
  }

  if (props.kind === 'creator') {
    return [
      {
        eyebrow: 'Registration',
        title: '登録する',
        description: 'Artist名、活動形態、Genreを登録し、このタブだけのCreator Profileを作成します。',
        link: '/demo/creator-registration',
        action: 'Creator登録へ'
      },
      {
        eyebrow: 'Workspace',
        title: '利用する',
        description: '作品Draft、権利申告状態、確認Task、合成AnalyticsをCreator Workspaceで試します。',
        link: '/demo/creator-workspace',
        action: 'Creator Workspaceへ'
      }
    ]
  }

  return [
    {
      eyebrow: 'For listeners',
      title: 'ユーザ向けサービス',
      description: 'Test User登録と、Catalog／Player利用のテスト導線を選択します。',
      link: '/demo/user-services',
      action: 'ユーザ向けサービス'
    },
    {
      eyebrow: 'For music creators',
      title: '音楽クリエータサービス',
      description: 'Creator登録と、作品・権利・分析を扱うWorkspaceのテスト導線を選択します。',
      link: '/demo/creator-services',
      action: '音楽クリエータサービス'
    }
  ]
})
</script>

<template>
  <div class="demo-service-grid">
    <article v-for="choice in choices" :key="choice.link" class="demo-service-card">
      <p class="demo-service-eyebrow">{{ choice.eyebrow }}</p>
      <h2>{{ choice.title }}</h2>
      <p>{{ choice.description }}</p>
      <a class="demo-service-button" :href="withBase(choice.link)">{{ choice.action }}</a>
    </article>
  </div>
</template>
