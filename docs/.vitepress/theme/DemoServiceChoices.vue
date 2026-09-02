<script setup lang="ts">
import { computed } from 'vue'
import { withBase } from 'vitepress'

type ChoiceKind = 'entry' | 'user' | 'creator'

const props = defineProps<{ kind: ChoiceKind }>()

const choices = computed(() => {
  if (props.kind === 'user') {
    return [
      {
        icon: '📨',
        eyebrow: '実験参加未登録',
        status: true,
        title: '実験参加の準備',
        description: '申請、運営審査、参加メールからの本人登録、初回POL受領までを行います。',
        link: '/demo/cloud-entry?path=/creator-first-platform/demo/listener-participation',
        action: '参加準備を始める'
      },
      {
        icon: '🎧',
        eyebrow: '実験参加登録完了（初回POL受領）',
        status: true,
        title: '音楽サービスを体験',
        description: '初回POLを受け取った仮想通貨ワレットで、練習用のお金、月額利用、再生、応援証明を試します。',
        link: '/demo/cloud-entry?path=/creator-first-platform/demo/test-user-registration',
        action: 'サービス体験へ進む'
      },
      {
        icon: '👀',
        eyebrow: '操作せずに見る',
        status: false,
        title: '画面だけ見てみる',
        description: '音楽プレーヤー、ファン登録、ユーザ院議会から、確認したい機能を選びます。',
        link: '/demo/user-service',
        action: '音楽リスナー向け機能を見る'
      }
    ]
  }

  if (props.kind === 'creator') {
    return [
      {
        icon: '📨',
        eyebrow: '実験参加未登録',
        status: true,
        title: '実験参加の準備',
        description: '申請、運営審査、参加メールからの本人登録、初回POL受領までを行います。',
        link: '/demo/cloud-entry?path=/creator-first-platform/demo/creator-participation',
        action: '参加準備を始める'
      },
      {
        icon: '🎵',
        eyebrow: '実験参加登録完了（初回POL受領）',
        status: true,
        title: '音楽クリエータ活動を体験',
        description: '初回POLを受け取った仮想通貨ワレットで、仮の活動情報とテスト作品の登録を試します。',
        link: '/demo/cloud-entry?path=/creator-first-platform/demo/creator-workspace',
        action: '活動体験へ進む'
      },
      {
        icon: '👀',
        eyebrow: '操作せずに見る',
        status: false,
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
      status: false,
      title: '音楽リスナーとして参加',
      description: '音楽サブスクリプションサービスの利用、音楽クリエータの応援、サービス改善や経営への参加などを試します。',
      link: '/demo/user-services',
      action: '音楽リスナーとして進む'
    },
    {
      icon: '🎵',
      eyebrow: '音楽をつくる立場',
      status: false,
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
      <p class="demo-service-eyebrow" :class="{ 'is-status': choice.status }">{{ choice.eyebrow }}</p>
      <h2>{{ choice.title }}</h2>
      <p>{{ choice.description }}</p>
      <a class="demo-service-button" :href="withBase(choice.link)">{{ choice.action }}</a>
    </article>
  </div>
</template>
