<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

type DemoProfile = {
  registered: true
  testUserId: string
  displayName: string
  state: 'BROWSER_DEMO_ONLY'
  createdAt: string
}

const storageKey = 'creator-first-browser-test-user-v1'
const alias = ref('')
const acceptedTerms = ref(false)
const acceptedPrivacy = ref(false)
const acknowledgedTestOnly = ref(false)
const profile = ref<DemoProfile>()
const message = ref('')

const normalizedAlias = computed(() => alias.value.trim().normalize('NFKC'))
const aliasValid = computed(() => /^[\p{L}\p{N}_ -]{2,24}$/u.test(normalizedAlias.value))
const ready = computed(() => (
  aliasValid.value &&
  acceptedTerms.value &&
  acceptedPrivacy.value &&
  acknowledgedTestOnly.value
))

function newTestUserId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('')
}

function saveProfile(): void {
  if (!ready.value) return
  const value: DemoProfile = {
    registered: true,
    testUserId: newTestUserId(),
    displayName: normalizedAlias.value,
    state: 'BROWSER_DEMO_ONLY',
    createdAt: new Date().toISOString()
  }
  sessionStorage.setItem(storageKey, JSON.stringify(value))
  profile.value = value
  message.value = `${value.displayName} をブラウザ内のTest Userとして登録しました。`
}

function resetProfile(): void {
  sessionStorage.removeItem(storageKey)
  profile.value = undefined
  alias.value = ''
  acceptedTerms.value = false
  acceptedPrivacy.value = false
  acknowledgedTestOnly.value = false
  message.value = 'このタブのTest Userデータを削除しました。'
}

onMounted(() => {
  try {
    const stored = sessionStorage.getItem(storageKey)
    if (!stored) return
    const value = JSON.parse(stored) as Partial<DemoProfile>
    if (
      value.registered === true &&
      value.state === 'BROWSER_DEMO_ONLY' &&
      typeof value.testUserId === 'string' &&
      typeof value.displayName === 'string' &&
      typeof value.createdAt === 'string'
    ) {
      profile.value = value as DemoProfile
    }
  } catch {
    sessionStorage.removeItem(storageKey)
  }
})
</script>

<template>
  <section class="test-user-demo" aria-labelledby="test-user-demo-title">
    <div class="demo-heading">
      <p class="demo-kicker">No server · No wallet · No payment</p>
      <h2 id="test-user-demo-title">ブラウザだけで登録体験を試す</h2>
      <p>
        入力内容はこのタブのSession Storageだけに保存され、サーバー、Blockchain、Walletまたは公開Profileへ送信されません。
      </p>
    </div>

    <div v-if="profile" class="registered-card">
      <span class="status-badge">登録済み · Browser demo</span>
      <h3>{{ profile.displayName }}</h3>
      <dl>
        <div><dt>状態</dt><dd>ブラウザ内シミュレーション</dd></div>
        <div><dt>Test User ID</dt><dd><code>{{ profile.testUserId }}</code></dd></div>
        <div><dt>登録時刻</dt><dd>{{ new Date(profile.createdAt).toLocaleString('ja-JP') }}</dd></div>
      </dl>
      <p class="boundary-copy">
        この状態はPlatform Account、本人確認、Subscription、Wallet LinkまたはSBT資格ではなく、再生権限を付与しません。
      </p>
      <button class="secondary-action" type="button" @click="resetProfile">このタブの登録を削除</button>
    </div>

    <form v-else class="registration-form" @submit.prevent="saveProfile">
      <label for="demo-alias">デモ表示用Alias</label>
      <input
        id="demo-alias"
        v-model="alias"
        type="text"
        minlength="2"
        maxlength="24"
        autocomplete="off"
        aria-describedby="alias-help"
        placeholder="Demo Listener 01"
        required
      >
      <p id="alias-help" class="field-help">
        2〜24文字の文字・数字・空白・_・-のみ。実名、メール、電話番号、Password、Wallet Addressを入力しないでください。
      </p>
      <p v-if="alias && !aliasValid" class="field-error" role="alert">Aliasの形式を確認してください。</p>

      <fieldset>
        <legend>Demo利用条件・Privacy Notice v1</legend>
        <label><input v-model="acceptedTerms" type="checkbox"> 金銭的価値や継続利用を保証しないDemo条件に同意します</label>
        <label><input v-model="acceptedPrivacy" type="checkbox"> 入力がこのタブ内だけに保存されることを確認しました</label>
        <label><input v-model="acknowledgedTestOnly" type="checkbox"> 本番Account、本人確認、資産口座ではないことを理解しました</label>
      </fieldset>

      <button class="primary-action" type="submit" :disabled="!ready">Test Userを登録</button>
    </form>

    <p class="demo-message" aria-live="polite">{{ message }}</p>
  </section>
</template>

<style scoped>
.test-user-demo {
  margin: 1.75rem 0;
  padding: clamp(1.1rem, 3vw, 2rem);
  border: 1px solid var(--vp-c-divider);
  border-radius: 18px;
  background: linear-gradient(145deg, var(--vp-c-bg-soft), var(--vp-c-bg));
}

.demo-heading h2 {
  margin: 0.25rem 0 0.75rem;
  border: 0;
}

.demo-kicker {
  margin: 0;
  color: var(--vp-c-brand-1);
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.registration-form,
.registered-card {
  display: grid;
  gap: 0.85rem;
  margin-top: 1.5rem;
}

.registration-form > label,
.registration-form legend {
  font-weight: 700;
}

.registration-form input[type='text'] {
  width: 100%;
  min-height: 44px;
  padding: 0.65rem 0.8rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 9px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font: inherit;
}

.registration-form fieldset {
  display: grid;
  gap: 0.75rem;
  margin: 0.5rem 0 0;
  padding: 1rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
}

.registration-form fieldset label {
  display: grid;
  grid-template-columns: 1.25rem minmax(0, 1fr);
  gap: 0.65rem;
  align-items: start;
}

.registration-form input[type='checkbox'] {
  width: 1.1rem;
  height: 1.1rem;
  margin-top: 0.2rem;
}

.field-help,
.boundary-copy,
.demo-message {
  color: var(--vp-c-text-2);
}

.field-help,
.field-error {
  margin: -0.35rem 0 0;
  font-size: 0.9rem;
}

.field-error {
  color: var(--vp-c-danger-1);
}

.primary-action,
.secondary-action {
  min-height: 44px;
  width: fit-content;
  padding: 0.65rem 1rem;
  border: 1px solid var(--vp-c-brand-1);
  border-radius: 10px;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.primary-action {
  background: var(--vp-c-brand-1);
  color: var(--vp-c-white);
}

.primary-action:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.secondary-action {
  background: transparent;
  color: var(--vp-c-brand-1);
}

.status-badge {
  width: fit-content;
  padding: 0.3rem 0.6rem;
  border-radius: 999px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  font-size: 0.85rem;
  font-weight: 700;
}

.registered-card h3 {
  margin: 0;
}

.registered-card dl {
  display: grid;
  gap: 0.55rem;
  margin: 0;
}

.registered-card dl div {
  display: grid;
  grid-template-columns: 7rem minmax(0, 1fr);
  gap: 0.75rem;
}

.registered-card dt {
  font-weight: 700;
}

.registered-card dd {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
}

@media (max-width: 540px) {
  .primary-action,
  .secondary-action {
    width: 100%;
  }

  .registered-card dl div {
    grid-template-columns: 1fr;
    gap: 0.1rem;
  }
}
</style>
