<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { withBase } from 'vitepress'

type CreatorProfile = {
  registered: true
  creatorId: string
  artistName: string
  entityType: 'INDIVIDUAL' | 'BAND' | 'UNIT' | 'LABEL'
  genre: string
  state: 'BROWSER_DEMO_ONLY'
  createdAt: string
}

const storageKey = 'creator-first-browser-creator-v1'
const emit = defineEmits<{ registered: [profile: CreatorProfile] }>()
const artistName = ref('')
const entityType = ref<CreatorProfile['entityType']>('INDIVIDUAL')
const genre = ref('')
const acceptedTerms = ref(false)
const acceptedPrivacy = ref(false)
const acknowledgedRightsBoundary = ref(false)
const profile = ref<CreatorProfile>()
const message = ref('')

const normalizedArtistName = computed(() => artistName.value.trim().normalize('NFKC'))
const normalizedGenre = computed(() => genre.value.trim().normalize('NFKC'))
const nameValid = computed(() => /^[\p{L}\p{N}_ .&-]{2,40}$/u.test(normalizedArtistName.value))
const genreValid = computed(() => /^[\p{L}\p{N}_ /&-]{2,30}$/u.test(normalizedGenre.value))
const ready = computed(() => (
  nameValid.value &&
  genreValid.value &&
  acceptedTerms.value &&
  acceptedPrivacy.value &&
  acknowledgedRightsBoundary.value
))

function newCreatorId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('')
}

function saveProfile(): void {
  if (!ready.value) return
  const value: CreatorProfile = {
    registered: true,
    creatorId: newCreatorId(),
    artistName: normalizedArtistName.value,
    entityType: entityType.value,
    genre: normalizedGenre.value,
    state: 'BROWSER_DEMO_ONLY',
    createdAt: new Date().toISOString()
  }
  sessionStorage.setItem(storageKey, JSON.stringify(value))
  profile.value = value
  message.value = `${value.artistName} をこのタブ内の実験用音楽クリエータとして登録しました。`
  emit('registered', value)
}

function resetProfile(): void {
  sessionStorage.removeItem(storageKey)
  sessionStorage.removeItem('creator-first-browser-creator-drafts-v1')
  profile.value = undefined
  artistName.value = ''
  entityType.value = 'INDIVIDUAL'
  genre.value = ''
  acceptedTerms.value = false
  acceptedPrivacy.value = false
  acknowledgedRightsBoundary.value = false
  message.value = 'このタブの活動情報とテスト作品を削除しました。'
}

function entityLabel(value: CreatorProfile['entityType']): string {
  return ({ INDIVIDUAL: '個人', BAND: 'バンド', UNIT: 'ユニット', LABEL: '自主レーベル' } as const)[value]
}

onMounted(() => {
  try {
    const stored = sessionStorage.getItem(storageKey)
    if (!stored) return
    const value = JSON.parse(stored) as Partial<CreatorProfile>
    if (
      value.registered === true &&
      value.state === 'BROWSER_DEMO_ONLY' &&
      typeof value.creatorId === 'string' &&
      typeof value.artistName === 'string' &&
      typeof value.genre === 'string' &&
      ['INDIVIDUAL', 'BAND', 'UNIT', 'LABEL'].includes(value.entityType ?? '') &&
      typeof value.createdAt === 'string'
    ) {
      profile.value = value as CreatorProfile
    }
  } catch {
    sessionStorage.removeItem(storageKey)
  }
})
</script>

<template>
  <section class="creator-demo" aria-labelledby="creator-registration-title">
    <div class="demo-heading">
      <p class="demo-kicker">実験用・このタブだけに保存</p>
      <h2 id="creator-registration-title">仮の活動情報を登録する</h2>
      <p>公開用の仮名だけを登録します。実名、連絡先、本人確認、契約、税務または支払情報は入力しないでください。</p>
    </div>

    <div v-if="profile" class="registered-card">
      <span class="status-badge">登録済み・実験用</span>
      <h3>{{ profile.artistName }}</h3>
      <dl>
        <div><dt>活動形態</dt><dd>{{ entityLabel(profile.entityType) }}</dd></div>
        <div><dt>音楽の分野</dt><dd>{{ profile.genre }}</dd></div>
        <div><dt>実験用登録番号</dt><dd><code>{{ profile.creatorId }}</code></dd></div>
        <div><dt>登録時刻</dt><dd>{{ new Date(profile.createdAt).toLocaleString('ja-JP') }}</dd></div>
      </dl>
      <p class="boundary-copy">この登録は、本人、作品の権利者、報酬の受取人または契約相手であることを証明しません。</p>
      <div class="action-row">
        <a class="primary-link" :href="withBase('/demo/creator-workspace')">活動体験へ進む</a>
        <button class="secondary-action" type="button" @click="resetProfile">このタブの登録を削除</button>
      </div>
    </div>

    <form v-else class="registration-form" @submit.prevent="saveProfile">
      <label for="creator-artist-name">仮の活動名</label>
      <input id="creator-artist-name" v-model="artistName" type="text" minlength="2" maxlength="40" autocomplete="off" aria-describedby="creator-name-help" placeholder="Demo Artist 01" required>
      <p id="creator-name-help" class="field-help">2〜40文字。実在人物・団体の名称や法的氏名を入力しないでください。</p>
      <p v-if="artistName && !nameValid" class="field-error" role="alert">活動名の文字を確認してください。</p>

      <label for="creator-entity-type">活動形態</label>
      <select id="creator-entity-type" v-model="entityType">
        <option value="INDIVIDUAL">個人</option>
        <option value="BAND">バンド</option>
        <option value="UNIT">ユニット</option>
        <option value="LABEL">自主レーベル</option>
      </select>

      <label for="creator-genre">音楽の分野（実験用）</label>
      <input id="creator-genre" v-model="genre" type="text" minlength="2" maxlength="30" autocomplete="off" placeholder="Electronic" required>
      <p v-if="genre && !genreValid" class="field-error" role="alert">音楽の分野の文字を確認してください。</p>

      <fieldset>
        <legend>実験の利用条件と情報の取扱い</legend>
        <label><input v-model="acceptedTerms" type="checkbox"> 実際のお金や本番利用の権利がない実験であることに同意します</label>
        <label><input v-model="acceptedPrivacy" type="checkbox"> 入力内容がこのタブだけに保存されることを確認しました</label>
        <label><input v-model="acknowledgedRightsBoundary" type="checkbox"> 登録だけでは本人・権利・契約・報酬受取資格を証明しないことを理解しました</label>
      </fieldset>

      <button class="primary-action" type="submit" :disabled="!ready">仮の活動情報を登録</button>
    </form>

    <p class="demo-message" aria-live="polite">{{ message }}</p>
  </section>
</template>

<style scoped>
.creator-demo { margin: 1.75rem 0; padding: clamp(1.1rem, 3vw, 2rem); border: 1px solid var(--vp-c-divider); border-radius: 18px; background: linear-gradient(145deg, var(--vp-c-bg-soft), var(--vp-c-bg)); }
.demo-heading h2 { margin: 0.25rem 0 0.75rem; border: 0; }
.demo-kicker { margin: 0; color: var(--vp-c-brand-1); font-size: 0.82rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.registration-form, .registered-card { display: grid; gap: 0.85rem; margin-top: 1.5rem; }
.registration-form > label, .registration-form legend { font-weight: 700; }
.registration-form input[type='text'], .registration-form select { width: 100%; min-height: 44px; padding: 0.65rem 0.8rem; border: 1px solid var(--vp-c-divider); border-radius: 9px; background: var(--vp-c-bg); color: var(--vp-c-text-1); font: inherit; }
.registration-form fieldset { display: grid; gap: 0.75rem; margin: 0.5rem 0 0; padding: 1rem; border: 1px solid var(--vp-c-divider); border-radius: 12px; }
.registration-form fieldset label { display: grid; grid-template-columns: 1.25rem minmax(0, 1fr); gap: 0.65rem; align-items: start; }
.registration-form input[type='checkbox'] { width: 1.1rem; height: 1.1rem; margin-top: 0.2rem; }
.field-help, .boundary-copy, .demo-message { color: var(--vp-c-text-2); }
.field-help, .field-error { margin: -0.35rem 0 0; font-size: 0.9rem; }
.field-error { color: var(--vp-c-danger-1); }
.primary-action, .secondary-action, .primary-link { min-height: 44px; width: fit-content; padding: 0.65rem 1rem; border: 1px solid var(--vp-c-brand-1); border-radius: 10px; font: inherit; font-weight: 700; cursor: pointer; }
.primary-action, .primary-link { background: var(--vp-c-brand-1); color: var(--vp-c-white); text-decoration: none; }
.primary-action:disabled { cursor: not-allowed; opacity: 0.5; }
.secondary-action { background: transparent; color: var(--vp-c-brand-1); }
.status-badge { width: fit-content; padding: 0.3rem 0.6rem; border-radius: 999px; background: var(--vp-c-brand-soft); color: var(--vp-c-brand-1); font-size: 0.85rem; font-weight: 700; }
.registered-card h3 { margin: 0; }
.registered-card dl { display: grid; gap: 0.55rem; margin: 0; }
.registered-card dl div { display: grid; grid-template-columns: 7rem minmax(0, 1fr); gap: 0.75rem; }
.registered-card dt { font-weight: 700; }
.registered-card dd { min-width: 0; margin: 0; overflow-wrap: anywhere; }
.action-row { display: flex; flex-wrap: wrap; gap: 0.75rem; }
@media (max-width: 540px) { .primary-action, .secondary-action, .primary-link { width: 100%; text-align: center; } .registered-card dl div { grid-template-columns: 1fr; gap: 0.1rem; } }
</style>
