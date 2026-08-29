<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { withBase } from 'vitepress'

type CreatorProfile = {
  registered: true
  creatorId: string
  artistName: string
  entityType: string
  genre: string
  state: 'BROWSER_DEMO_ONLY'
  createdAt: string
}

type ReleaseDraft = {
  draftId: string
  title: string
  releaseType: 'SINGLE' | 'EP' | 'ALBUM'
  state: 'DRAFT'
  rightsState: 'SELF_DECLARED_UNVERIFIED'
  createdAt: string
}

const profileKey = 'creator-first-browser-creator-v1'
const draftsKey = 'creator-first-browser-creator-drafts-v1'
const profile = ref<CreatorProfile>()
const drafts = ref<ReleaseDraft[]>([])
const title = ref('')
const releaseType = ref<ReleaseDraft['releaseType']>('SINGLE')
const rightsAcknowledged = ref(false)
const message = ref('')

const normalizedTitle = computed(() => title.value.trim().normalize('NFKC'))
const titleValid = computed(() => /^[\p{L}\p{N}_ .,'’&()!-]{2,60}$/u.test(normalizedTitle.value))
const ready = computed(() => titleValid.value && rightsAcknowledged.value)

function newDraftId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('')
}

function saveDraft(): void {
  if (!ready.value || !profile.value) return
  const draft: ReleaseDraft = {
    draftId: newDraftId(),
    title: normalizedTitle.value,
    releaseType: releaseType.value,
    state: 'DRAFT',
    rightsState: 'SELF_DECLARED_UNVERIFIED',
    createdAt: new Date().toISOString()
  }
  drafts.value = [draft, ...drafts.value].slice(0, 8)
  sessionStorage.setItem(draftsKey, JSON.stringify(drafts.value))
  title.value = ''
  releaseType.value = 'SINGLE'
  rightsAcknowledged.value = false
  message.value = `${draft.title} を未公開の作品案として保存しました。`
}

onMounted(() => {
  try {
    const storedProfile = sessionStorage.getItem(profileKey)
    if (storedProfile) {
      const value = JSON.parse(storedProfile) as Partial<CreatorProfile>
      if (
        value.registered === true &&
        value.state === 'BROWSER_DEMO_ONLY' &&
        typeof value.creatorId === 'string' &&
        typeof value.artistName === 'string'
      ) profile.value = value as CreatorProfile
    }

    const storedDrafts = sessionStorage.getItem(draftsKey)
    if (storedDrafts) {
      const values = JSON.parse(storedDrafts) as Partial<ReleaseDraft>[]
      if (Array.isArray(values)) {
        drafts.value = values.filter((value): value is ReleaseDraft => (
          typeof value.draftId === 'string' &&
          typeof value.title === 'string' &&
          value.state === 'DRAFT' &&
          value.rightsState === 'SELF_DECLARED_UNVERIFIED'
        )).slice(0, 8)
      }
    }
  } catch {
    sessionStorage.removeItem(draftsKey)
  }
})
</script>

<template>
  <section class="workspace-demo" aria-labelledby="creator-workspace-title">
    <div class="workspace-heading">
      <div>
        <p class="demo-kicker">画面操作の体験</p>
        <h2 id="creator-workspace-title">作品と確認状態を整理する</h2>
      </div>
      <span v-if="profile" class="status-badge">{{ profile.artistName }}</span>
    </div>

    <div v-if="!profile" class="empty-state">
      <h3>先に仮の活動情報を登録してください</h3>
      <p>この画面には活動情報がありません。個人情報を含まない仮の活動名などを登録すると、次へ進めます。</p>
      <a class="primary-link" :href="withBase('/demo/creator-registration')">仮の活動情報を登録する</a>
    </div>

    <template v-else>
      <div class="metric-grid" aria-label="画面見本用データによる活動概要">
        <article><span>公開作品</span><strong>0</strong><small>本番公開なし</small></article>
        <article><span>応援している人</span><strong>12</strong><small>画面見本用の人数</small></article>
        <article><span>今月の見込</span><strong>1,240</strong><small>画面見本用・受取不可</small></article>
      </div>

      <div class="workspace-grid">
        <section class="workspace-panel">
          <h3>未公開の作品案を作成</h3>
          <form class="draft-form" @submit.prevent="saveDraft">
            <label for="release-title">架空の作品名</label>
            <input id="release-title" v-model="title" type="text" minlength="2" maxlength="60" autocomplete="off" placeholder="Synthetic First Song" required>
            <p v-if="title && !titleValid" class="field-error" role="alert">作品名の形式を確認してください。</p>
            <label for="release-type">作品の形式</label>
            <select id="release-type" v-model="releaseType">
              <option value="SINGLE">シングル</option>
              <option value="EP">EP</option>
              <option value="ALBUM">アルバム</option>
            </select>
            <label class="check-row"><input v-model="rightsAcknowledged" type="checkbox"> これは作品の権利確認や公開申請ではなく、画面操作を試すための入力であることを確認しました</label>
            <button class="primary-action" type="submit" :disabled="!ready">未公開の作品案を保存</button>
          </form>
          <p class="demo-message" aria-live="polite">{{ message }}</p>
        </section>

        <section class="workspace-panel">
          <h3>本番利用までに必要となる確認</h3>
          <ul class="task-list">
            <li><span>活動情報</span><strong>実験用の登録済み</strong></li>
            <li><span>本人・所属の確認</span><strong>未実施</strong></li>
            <li><span>作品の権利確認</span><strong>未提出</strong></li>
            <li><span>報酬の受取先</span><strong>未設定</strong></li>
          </ul>
          <p class="boundary-copy">公開実験では本人確認書類、契約、権利資料、音源、財布の情報、税務・支払情報を受け付けません。</p>
        </section>
      </div>

      <section class="workspace-panel release-panel">
        <div class="panel-heading"><h3>未公開の作品案</h3><span>{{ drafts.length }} / 8</span></div>
        <p v-if="drafts.length === 0" class="empty-copy">まだ作品案はありません。左の入力欄から架空の作品を登録できます。</p>
        <ul v-else class="release-list">
          <li v-for="draft in drafts" :key="draft.draftId">
            <div><strong>{{ draft.title }}</strong><span>{{ draft.releaseType }} · {{ new Date(draft.createdAt).toLocaleString('ja-JP') }}</span></div>
            <div class="release-states"><span>未公開</span><span>権利未確認</span></div>
          </li>
        </ul>
      </section>
      <p><a class="primary-link" :href="withBase('/demo/treasury-dashboard')">資金フロー可視化デモを見る</a></p>
    </template>
  </section>
</template>

<style scoped>
.workspace-demo { margin: 1.75rem 0; }
.workspace-heading, .panel-heading { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 1rem; align-items: center; }
.workspace-heading h2 { margin: 0.25rem 0 0; border: 0; }
.demo-kicker { margin: 0; color: var(--vp-c-brand-1); font-size: 0.82rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.status-badge { width: fit-content; padding: 0.35rem 0.7rem; border-radius: 999px; background: var(--vp-c-brand-soft); color: var(--vp-c-brand-1); font-weight: 700; }
.metric-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.85rem; margin: 1.5rem 0; }
.metric-grid article, .workspace-panel, .empty-state { padding: 1.15rem; border: 1px solid var(--vp-c-divider); border-radius: 14px; background: var(--vp-c-bg-soft); }
.metric-grid article { display: grid; gap: 0.25rem; }
.metric-grid span, .metric-grid small, .boundary-copy, .demo-message, .empty-copy, .release-list span { color: var(--vp-c-text-2); }
.metric-grid strong { font-size: 1.35rem; }
.workspace-grid { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(15rem, 0.75fr); gap: 1rem; }
.workspace-panel h3, .empty-state h3 { margin-top: 0; }
.draft-form { display: grid; gap: 0.75rem; }
.draft-form > label:not(.check-row) { font-weight: 700; }
.draft-form input[type='text'], .draft-form select { width: 100%; min-height: 44px; padding: 0.65rem 0.8rem; border: 1px solid var(--vp-c-divider); border-radius: 9px; background: var(--vp-c-bg); color: var(--vp-c-text-1); font: inherit; }
.check-row { display: grid; grid-template-columns: 1.25rem minmax(0, 1fr); gap: 0.65rem; align-items: start; }
.check-row input { width: 1.1rem; height: 1.1rem; margin-top: 0.2rem; }
.field-error { margin: -0.35rem 0 0; color: var(--vp-c-danger-1); font-size: 0.9rem; }
.primary-action, .primary-link { min-height: 44px; width: fit-content; padding: 0.65rem 1rem; border: 1px solid var(--vp-c-brand-1); border-radius: 10px; background: var(--vp-c-brand-1); color: var(--vp-c-white); font: inherit; font-weight: 700; text-decoration: none; cursor: pointer; }
.primary-action:disabled { cursor: not-allowed; opacity: 0.5; }
.task-list, .release-list { padding: 0; list-style: none; }
.task-list { display: grid; gap: 0.7rem; }
.task-list li { display: flex; justify-content: space-between; gap: 1rem; padding-bottom: 0.55rem; border-bottom: 1px solid var(--vp-c-divider); }
.task-list strong { text-align: right; }
.release-panel { margin-top: 1rem; }
.panel-heading h3 { margin: 0; }
.release-list { display: grid; gap: 0.75rem; }
.release-list li { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 0.75rem; padding: 0.85rem; border: 1px solid var(--vp-c-divider); border-radius: 10px; background: var(--vp-c-bg); }
.release-list li > div { display: grid; gap: 0.2rem; }
.release-states { grid-auto-flow: column; align-items: center; }
.release-states span { padding: 0.2rem 0.5rem; border-radius: 999px; background: var(--vp-c-brand-soft); font-size: 0.8rem; font-weight: 700; }
@media (max-width: 720px) { .metric-grid, .workspace-grid { grid-template-columns: 1fr; } }
@media (max-width: 540px) { .primary-action, .primary-link { width: 100%; text-align: center; } .task-list li { display: grid; } .task-list strong { text-align: left; } }
</style>
