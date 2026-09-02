<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { withBase } from 'vitepress'
import { resolveCloudDemoTarget } from './cloud-demo-runtime.js'

const message = ref('Google クラウド上の無償版運用実験へ接続しています。')
const target = ref('')

async function connect() {
  message.value = 'Google クラウド上の無償版運用実験へ接続しています。'
  try {
    const configuredPath = new URLSearchParams(location.search).get('path') ?? '/creator-first-platform/demo/'
    const requestedPath = `${configuredPath}${location.hash}`
    target.value = await resolveCloudDemoTarget(
      new URL(withBase('/demo-runtime.json'), location.origin).href,
      requestedPath
    )
    location.replace(target.value)
  } catch {
    message.value = '現在、クラウド版へ接続できません。入力内容は送信されていません。'
  }
}

onMounted(connect)
</script>

<template>
  <section class="cloud-demo-redirect" aria-live="polite">
    <span aria-hidden="true">☁️</span>
    <div><h2>クラウド版へ移動</h2><p>{{ message }}</p></div>
    <button v-if="!target" type="button" @click="connect">接続を再確認する</button>
  </section>
</template>

<style scoped>
.cloud-demo-redirect{display:grid;grid-template-columns:auto minmax(0,1fr);gap:1rem;align-items:start;padding:1.2rem;border:1px solid var(--vp-c-divider);border-radius:14px;background:var(--vp-c-bg-soft)}
.cloud-demo-redirect>span{font-size:2rem}.cloud-demo-redirect h2,.cloud-demo-redirect p{margin:.1rem 0}.cloud-demo-redirect button{grid-column:2;min-height:44px;width:fit-content;padding:.6rem .9rem;border:1px solid var(--vp-c-brand-1);border-radius:9px;background:var(--vp-c-brand-1);color:white;font:inherit;font-weight:700;cursor:pointer}
</style>
