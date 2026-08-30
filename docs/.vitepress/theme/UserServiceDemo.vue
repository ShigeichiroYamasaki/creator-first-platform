<script setup lang="ts">
import { computed, ref } from 'vue'

type DemoTrack = {
  id: string
  title: string
  creator: string
  album: string
  genre: string
  duration: string
  releaseDate: string
  access: string
  accent: string
  symbol: string
  description: string
}

const tracks: DemoTrack[] = [
  {
    id: 'first-light', title: 'First Light', creator: 'AO', album: 'Synthetic Dawn', genre: 'Ambient Pop',
    duration: '3:42', releaseDate: '2026-08-12', access: '月額利用で再生', symbol: '☀️',
    accent: 'linear-gradient(145deg,#164e63,#22d3ee)',
    description: '静かな朝の光をイメージした、シンセサイザー中心の架空のデモ作品です。'
  },
  {
    id: 'supporter-signal', title: 'Supporter Signal', creator: 'AO', album: 'Synthetic Dawn', genre: 'Electronic',
    duration: '4:08', releaseDate: '2026-08-20', access: 'サポータ限定', symbol: '📡',
    accent: 'linear-gradient(145deg,#4c1d95,#c084fc)',
    description: '音楽クリエータとファンコミュニティのつながりを表現した架空のデモ作品です。'
  },
  {
    id: 'early-echo', title: 'Early Echo', creator: 'Lumen', album: 'Five Second Studies', genre: 'Minimal',
    duration: '2:56', releaseDate: '2026-07-30', access: '初期サポータ限定', symbol: '🌱',
    accent: 'linear-gradient(145deg,#9a3412,#fb923c)',
    description: '活動初期の音楽クリエータを見つける体験を示す、架空の短編デモ作品です。'
  }
]

const selectedId = ref(tracks[0].id)
const selectedTrack = computed(() => tracks.find((track) => track.id === selectedId.value) ?? tracks[0])
</script>

<template>
  <section class="user-service-demo" aria-labelledby="user-service-title">
    <header class="service-header">
      <div>
        <p class="demo-kicker">登録せずに見られるサービス画面</p>
        <h2 id="user-service-title">音楽を探す・知る・応援する</h2>
        <p>作品を選ぶと、作品情報と音楽クリエータへの応援状態の見本が切り替わります。</p>
      </div>
      <div class="preview-state"><span aria-hidden="true">👀</span><div><small>現在の画面</small><strong>登録前の見本</strong></div></div>
    </header>

    <div class="service-status" aria-label="この画面で確認できる内容">
      <div><span aria-hidden="true">🎧</span><p><strong>音楽一覧</strong><small>作品を選んで確認</small></p></div>
      <div><span aria-hidden="true">💿</span><p><strong>作品情報</strong><small>作者、公開日、再生条件</small></p></div>
      <div><span aria-hidden="true">🤝</span><p><strong>応援状態</strong><small>一般・初期サポータ</small></p></div>
    </div>

    <div class="service-layout">
      <section class="catalog-panel" aria-labelledby="catalog-title">
        <div class="section-heading"><div><p class="section-kicker">DISCOVER</p><h3 id="catalog-title">音楽一覧</h3></div><span>{{ tracks.length }}作品</span></div>
        <div class="catalog-list">
          <button
            v-for="track in tracks"
            :key="track.id"
            type="button"
            :class="{ selected: selectedId === track.id }"
            :aria-pressed="selectedId === track.id"
            @click="selectedId = track.id"
          >
            <span class="track-art small" :style="{ background: track.accent }" aria-hidden="true">{{ track.symbol }}</span>
            <span class="track-copy"><strong>{{ track.title }}</strong><small>{{ track.creator }} · {{ track.album }}</small></span>
            <span class="track-meta"><small>{{ track.duration }}</small><em>{{ track.access }}</em></span>
          </button>
        </div>
      </section>

      <section class="work-panel" aria-labelledby="work-title">
        <div class="selected-work">
          <span class="track-art large" :style="{ background: selectedTrack.accent }" aria-hidden="true">{{ selectedTrack.symbol }}</span>
          <div><p class="section-kicker">作品情報</p><h3 id="work-title">{{ selectedTrack.title }}</h3><p>{{ selectedTrack.creator }} · {{ selectedTrack.album }}</p></div>
        </div>
        <p class="work-description">{{ selectedTrack.description }}</p>
        <dl class="work-facts">
          <div><dt>音楽クリエータ</dt><dd>{{ selectedTrack.creator }}</dd></div>
          <div><dt>ジャンル</dt><dd>{{ selectedTrack.genre }}</dd></div>
          <div><dt>公開日</dt><dd>{{ selectedTrack.releaseDate }}</dd></div>
          <div><dt>再生条件</dt><dd>{{ selectedTrack.access }}</dd></div>
        </dl>
        <div class="player-sample" aria-label="再生操作の見本"><button type="button" disabled aria-label="再生は画面見本では利用できません">▶</button><div><strong>{{ selectedTrack.title }}</strong><small>このページでは音源を再生しません</small></div><span>0:00 / {{ selectedTrack.duration }}</span></div>
      </section>
    </div>

    <section class="support-panel" aria-labelledby="support-title">
      <div class="creator-card">
        <span class="creator-avatar" :style="{ background: selectedTrack.accent }" aria-hidden="true">{{ selectedTrack.creator.slice(0, 1) }}</span>
        <div><p class="section-kicker">音楽クリエータ</p><h3 id="support-title">{{ selectedTrack.creator }}の応援状態</h3><p>作品を選ぶと、対象となる音楽クリエータの情報に切り替わります。</p></div>
      </div>
      <div class="support-state-grid">
        <article class="current-support"><span aria-hidden="true">○</span><div><small>現在の応援状態</small><strong>まだ応援していません</strong><p>登録前にはこの状態で表示されます。</p></div></article>
        <article><span aria-hidden="true">🤝</span><div><small>一般サポータ</small><strong>ファンコミュニティへ参加</strong><p>応援していることを示す証明書と参加資格が表示されます。</p></div></article>
        <article><span aria-hidden="true">🌱</span><div><small>初期サポータ</small><strong>活動初期からの応援</strong><p>所定期間内から応援している場合に特別な状態として表示されます。</p></div></article>
      </div>
      <button class="support-sample-button" type="button" disabled>{{ selectedTrack.creator }}を応援する（操作見本）</button>
    </section>

    <aside class="sample-notice"><span aria-hidden="true">ℹ️</span><p><strong>これは登録前に見られる画面見本です。</strong>作品、音楽クリエータ、再生条件、応援状態はすべて架空で、実際の購入、課金、再生または応援登録は行いません。</p></aside>
  </section>
</template>

<style scoped>
.user-service-demo{display:grid;gap:1rem;margin:1.75rem 0}.service-header,.catalog-panel,.work-panel,.support-panel,.sample-notice{border:1px solid var(--vp-c-divider);border-radius:18px;background:var(--vp-c-bg-soft)}.service-header{display:flex;justify-content:space-between;gap:1.5rem;align-items:center;padding:clamp(1rem,3vw,1.6rem);background:radial-gradient(circle at top right,var(--vp-c-brand-soft),transparent 45%),var(--vp-c-bg-soft)}.service-header h2{margin:.25rem 0;border:0}.service-header>div:first-child>p:last-child{max-width:680px;margin-bottom:0;color:var(--vp-c-text-2)}.demo-kicker,.section-kicker{margin:0;color:var(--vp-c-brand-1);font-size:.75rem;font-weight:800;letter-spacing:.1em}.preview-state{display:flex;gap:.7rem;align-items:center;min-width:190px;padding:.75rem 1rem;border:1px solid var(--vp-c-divider);border-radius:14px;background:var(--vp-c-bg)}.preview-state>span{font-size:1.5rem}.preview-state small,.preview-state strong{display:block}.preview-state small{color:var(--vp-c-text-2)}.service-status{display:grid;grid-template-columns:repeat(3,1fr);gap:.7rem}.service-status>div{display:flex;gap:.7rem;align-items:center;padding:.85rem 1rem;border:1px solid var(--vp-c-divider);border-radius:14px;background:var(--vp-c-bg)}.service-status>div>span{font-size:1.5rem}.service-status p,.service-status strong,.service-status small{display:block;margin:0}.service-status small{color:var(--vp-c-text-2)}.service-layout{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(300px,.95fr);gap:1rem}.catalog-panel,.work-panel,.support-panel{padding:clamp(1rem,2.5vw,1.35rem)}.section-heading{display:flex;justify-content:space-between;align-items:center;margin-bottom:.8rem}.section-heading h3,.selected-work h3,.creator-card h3{margin:.15rem 0;border:0}.section-heading>span{color:var(--vp-c-text-2);font-size:.85rem}.catalog-list{display:grid;gap:.55rem}.catalog-list button{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:.75rem;align-items:center;width:100%;padding:.7rem;border:1px solid transparent;border-radius:13px;background:var(--vp-c-bg);color:var(--vp-c-text-1);font:inherit;text-align:left;cursor:pointer}.catalog-list button:hover,.catalog-list button.selected{border-color:var(--vp-c-brand-1);box-shadow:0 0 0 2px var(--vp-c-brand-soft)}.track-art{display:grid;place-items:center;color:white;box-shadow:inset 0 0 0 1px #ffffff30}.track-art.small{width:48px;height:48px;border-radius:11px;font-size:1.25rem}.track-art.large{width:100px;height:100px;border-radius:20px;font-size:2.3rem}.track-copy,.track-copy strong,.track-copy small,.track-meta,.track-meta small,.track-meta em{display:block}.track-copy small,.track-meta small{color:var(--vp-c-text-2)}.track-meta{text-align:right}.track-meta em{margin-top:.2rem;color:var(--vp-c-brand-1);font-size:.72rem;font-style:normal;font-weight:700}.selected-work{display:flex;gap:1rem;align-items:center}.selected-work p{margin:.15rem 0;color:var(--vp-c-text-2)}.work-description{color:var(--vp-c-text-2)}.work-facts{display:grid;grid-template-columns:repeat(2,1fr);gap:.6rem;margin:1rem 0}.work-facts>div{padding:.65rem;border-radius:10px;background:var(--vp-c-bg)}.work-facts dt{color:var(--vp-c-text-2);font-size:.78rem}.work-facts dd{margin:.15rem 0 0;font-weight:700}.player-sample{display:grid;grid-template-columns:auto 1fr auto;gap:.7rem;align-items:center;padding:.75rem;border:1px solid var(--vp-c-divider);border-radius:12px;background:var(--vp-c-bg)}.player-sample button{width:42px;height:42px;border:0;border-radius:50%;background:var(--vp-c-brand-soft);color:var(--vp-c-brand-1)}.player-sample strong,.player-sample small{display:block}.player-sample small,.player-sample>span{color:var(--vp-c-text-2);font-size:.78rem}.support-panel{display:grid;gap:1rem}.creator-card{display:flex;gap:1rem;align-items:center}.creator-card p{margin:.15rem 0;color:var(--vp-c-text-2)}.creator-avatar{display:grid;place-items:center;width:64px;height:64px;border-radius:50%;color:white;font-size:1.5rem;font-weight:800}.support-state-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:.7rem}.support-state-grid article{display:grid;grid-template-columns:auto 1fr;gap:.7rem;padding:.9rem;border:1px solid var(--vp-c-divider);border-radius:13px;background:var(--vp-c-bg)}.support-state-grid article>span{font-size:1.35rem}.support-state-grid small,.support-state-grid strong{display:block}.support-state-grid small{color:var(--vp-c-text-2)}.support-state-grid p{margin:.35rem 0 0;color:var(--vp-c-text-2);font-size:.85rem}.current-support{border-style:dashed!important}.support-sample-button{min-height:44px;padding:.65rem 1rem;border:1px solid var(--vp-c-divider);border-radius:10px;background:var(--vp-c-bg);color:var(--vp-c-text-2);font:inherit;font-weight:700}.sample-notice{display:flex;gap:.75rem;padding:1rem}.sample-notice p{margin:0;color:var(--vp-c-text-2)}@media(max-width:780px){.service-header,.selected-work,.creator-card{align-items:flex-start}.service-header{display:grid}.preview-state{min-width:0}.service-layout{grid-template-columns:1fr}.support-state-grid{grid-template-columns:1fr}}@media(max-width:580px){.service-status{grid-template-columns:1fr}.catalog-list button{grid-template-columns:auto 1fr}.track-meta{grid-column:2;text-align:left}.work-facts{grid-template-columns:1fr}.track-art.large{width:78px;height:78px}.player-sample{grid-template-columns:auto 1fr}.player-sample>span{grid-column:2}}
</style>
