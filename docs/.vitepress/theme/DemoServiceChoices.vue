<script setup lang="ts">
import { computed } from 'vue'
import { withBase } from 'vitepress'

type ChoiceKind = 'entry' | 'user' | 'creator'

const props = defineProps<{ kind: ChoiceKind }>()

const choices = computed(() => {
  if (props.kind === 'user') {
    return [
      {
        icon: '🎧',
        eyebrow: '順番に操作する',
        title: 'はじめから体験する',
        description: '仮の名前を登録し、練習用のお金、月額利用、音楽プレーヤー、応援の証明書を順番に試します。',
        link: '/demo/test-user-registration',
        action: '音楽リスナーとして参加する'
      },
      {
        icon: '👀',
        eyebrow: '操作せずに見る',
        title: '画面だけ見てみる',
        description: '音楽一覧や応援状態の見本を、仮想通貨ワレットをつながずに確認します。',
        link: '/demo/user-service',
        action: '音楽サービスの見本を見る'
      }
    ]
  }

  if (props.kind === 'creator') {
    return [
      {
        icon: '🎵',
        eyebrow: '順番に操作する',
        title: 'はじめから体験する',
        description: '仮の活動名を登録し、仮想通貨ワレットとテスト作品の登録を順番に試します。',
        link: '/demo/creator-registration',
        action: '音楽クリエータとして参加登録する'
      },
      {
        icon: '👀',
        eyebrow: '操作せずに見る',
        title: '活動画面だけ見てみる',
        description: 'テスト作品や確認事項を管理する画面の見本を確認します。',
        link: '/demo/creator-workspace',
        action: '音楽クリエータの活動画面を見る'
      }
    ]
  }

  return [
    {
      icon: '🎧',
      eyebrow: '音楽を聴く立場',
      title: '音楽リスナーとして参加',
      description: '音楽サブスクリプションサービスの利用、音楽クリエータの応援、サービス改善や経営への参加などを試します。',
      link: '/demo/user-services',
      action: '音楽リスナーとして進む'
    },
    {
      icon: '🎵',
      eyebrow: '音楽をつくる立場',
      title: '音楽クリエータとして参加',
      description: '音源などの登録、ファンからの応援や交流、収益分配ルールづくりへの参加を試します。',
      link: '/demo/creator-services',
      action: '音楽クリエータとして進む'
    }
  ]
})
</script>

<template>
  <div class="demo-service-grid">
    <article v-for="choice in choices" :key="choice.link" class="demo-service-card">
      <span class="demo-service-icon" aria-hidden="true">{{ choice.icon }}</span>
      <p class="demo-service-eyebrow">{{ choice.eyebrow }}</p>
      <h2>{{ choice.title }}</h2>
      <p>{{ choice.description }}</p>
      <a class="demo-service-button" :href="withBase(choice.link)">{{ choice.action }}</a>
    </article>
  </div>
</template>
