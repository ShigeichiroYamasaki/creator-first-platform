<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { withBase } from 'vitepress'

type DemoProfile = {
  registered: true
  displayName: string
  state: 'BROWSER_DEMO_ONLY'
}

const profile = ref<DemoProfile>()

onMounted(() => {
  try {
    const stored = sessionStorage.getItem('creator-first-browser-test-user-v1')
    if (!stored) return
    const value = JSON.parse(stored) as Partial<DemoProfile>
    if (value.registered === true && value.state === 'BROWSER_DEMO_ONLY' && typeof value.displayName === 'string') {
      profile.value = value as DemoProfile
    }
  } catch {
    // Registration page owns invalid-profile cleanup.
  }
})
</script>

<template>
  <section class="user-service-demo" aria-labelledby="user-service-title">
    <div class="user-heading">
      <div>
        <p class="demo-kicker">操作せずに見られる実験用画面</p>
        <h2 id="user-service-title">音楽サービスの画面見本</h2>
      </div>
      <span v-if="profile" class="status-badge">{{ profile.displayName }}</span>
    </div>

    <div v-if="!profile" class="notice-card">
      <h3>仮の名前はまだ登録されていません</h3>
      <p>音楽一覧はそのまま見られます。登録状態も試す場合は、先に仮の名前を登録してください。</p>
      <a class="primary-link" :href="withBase('/demo/test-user-registration')">音楽リスナーとして参加する</a>
    </div>

    <div class="catalog-grid" aria-label="実験用の音楽一覧">
      <article><span class="track-number">01</span><div><h3>First Light</h3><p>AO · Synthetic Dawn</p></div><span class="capability">月額利用</span></article>
      <article><span class="track-number">02</span><div><h3>Supporter Signal</h3><p>AO · Synthetic Dawn</p></div><span class="capability">応援した方</span></article>
      <article><span class="track-number">03</span><div><h3>Early Echo</h3><p>Lumen · Five Second Studies</p></div><span class="capability">初期から応援</span></article>
    </div>

    <div class="notice-card">
      <h3>このページは画面見本です</h3>
      <p>表示される作品や音楽クリエーターは架空で、この画面から実際の音楽は配信しません。</p>
    </div>
  </section>
</template>

<style scoped>
.user-service-demo { margin: 1.75rem 0; }
.user-heading { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 1rem; align-items: center; }
.user-heading h2 { margin: 0.25rem 0 0; border: 0; }
.demo-kicker { margin: 0; color: var(--vp-c-brand-1); font-size: 0.82rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.status-badge, .capability { width: fit-content; padding: 0.3rem 0.6rem; border-radius: 999px; background: var(--vp-c-brand-soft); color: var(--vp-c-brand-1); font-size: 0.85rem; font-weight: 700; }
.catalog-grid { display: grid; gap: 0.75rem; margin: 1.5rem 0; }
.catalog-grid article { display: grid; grid-template-columns: 2.5rem minmax(0, 1fr) auto; gap: 0.8rem; align-items: center; padding: 1rem; border: 1px solid var(--vp-c-divider); border-radius: 12px; background: var(--vp-c-bg-soft); }
.track-number { color: var(--vp-c-text-3); font-weight: 700; }
.catalog-grid h3, .catalog-grid p { margin: 0; }
.catalog-grid p, .notice-card p { color: var(--vp-c-text-2); }
.notice-card { margin-top: 1rem; padding: 1.15rem; border: 1px solid var(--vp-c-divider); border-radius: 14px; background: var(--vp-c-bg-soft); }
.notice-card h3 { margin-top: 0; }
.primary-link, .secondary-link { display: inline-flex; min-height: 44px; align-items: center; padding: 0.65rem 1rem; border: 1px solid var(--vp-c-brand-1); border-radius: 10px; font-weight: 700; text-decoration: none; }
.primary-link { background: var(--vp-c-brand-1); color: var(--vp-c-white); }
.secondary-link { color: var(--vp-c-brand-1); }
@media (max-width: 540px) { .catalog-grid article { grid-template-columns: 2rem minmax(0, 1fr); } .capability { grid-column: 2; } .primary-link, .secondary-link { width: 100%; justify-content: center; } }
</style>
