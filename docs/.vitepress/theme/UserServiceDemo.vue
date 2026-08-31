<script setup lang="ts">
import { withBase } from 'vitepress'

const services = [
  {
    icon: '▶️',
    title: '音楽プレーヤー',
    description: 'テスト音源を選び、再生や一時停止などの基本操作を試します。',
    href: '/demo/cloud-entry?path=/creator-first-platform/demo/test-user-registration%23player-title',
    action: '音楽プレーヤーを開く'
  },
  {
    icon: '🤝',
    title: 'ファン登録',
    description: '好きな音楽クリエーターを応援し、応援の証明書を受け取る操作を試します。',
    href: '/demo/cloud-entry?path=/creator-first-platform/demo/test-user-registration%23supporter-registration-title',
    action: 'ファン登録を開く'
  },
  {
    icon: '🗳️',
    title: '議会参加',
    description: 'ユーザ院議会の提案と投票の画面を確認します。',
    href: '/demo/user-house',
    action: 'ユーザ院議会を開く'
  }
]
</script>

<template>
  <nav class="listener-service-links" aria-label="音楽リスナー向け機能">
    <a v-for="service in services" :key="service.href" :href="withBase(service.href)">
      <span class="service-icon" aria-hidden="true">{{ service.icon }}</span>
      <span class="service-copy">
        <strong>{{ service.title }}</strong>
        <span>{{ service.description }}</span>
      </span>
      <span class="service-action">{{ service.action }} <span aria-hidden="true">→</span></span>
    </a>
  </nav>
</template>

<style scoped>
.listener-service-links{display:grid;gap:1rem;margin:1.5rem 0}.listener-service-links>a{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:1rem;align-items:center;min-height:112px;padding:1.1rem 1.25rem;border:1px solid var(--vp-c-divider);border-radius:16px;background:var(--vp-c-bg-soft);color:var(--vp-c-text-1);text-decoration:none;transition:border-color .2s,box-shadow .2s,transform .2s}.listener-service-links>a:hover,.listener-service-links>a:focus-visible{border-color:var(--vp-c-brand-1);box-shadow:0 8px 24px color-mix(in srgb,var(--vp-c-brand-1) 14%,transparent);transform:translateY(-2px)}.service-icon{display:grid;place-items:center;width:58px;height:58px;border-radius:14px;background:var(--vp-c-brand-soft);font-size:1.7rem}.service-copy{display:grid;gap:.3rem}.service-copy strong{font-size:1.15rem}.service-copy>span{color:var(--vp-c-text-2);line-height:1.6}.service-action{color:var(--vp-c-brand-1);font-weight:800;white-space:nowrap}@media(max-width:640px){.listener-service-links>a{grid-template-columns:auto minmax(0,1fr)}.service-action{grid-column:2;white-space:normal}}
</style>
