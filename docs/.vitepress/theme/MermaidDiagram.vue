<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useData } from 'vitepress'

const props = defineProps<{
  graph: string
  id: string
  label: string
}>()

const { frontmatter } = useData()
const svg = ref('')
const failed = ref(false)
let themeObserver: MutationObserver | undefined

const source = computed(() => decodeURIComponent(props.graph))

async function renderDiagram() {
  try {
    const { default: mermaid } = await import('mermaid')
    const dark = document.documentElement.classList.contains('dark')

    mermaid.initialize({
      securityLevel: 'strict',
      startOnLoad: false,
      theme: frontmatter.value.mermaidTheme || (dark ? 'dark' : 'default')
    })

    const result = await mermaid.render(props.id, source.value)
    svg.value = result.svg
    failed.value = false
  } catch (error) {
    failed.value = true
    console.error('Mermaid diagram rendering failed', error)
  }
}

onMounted(async () => {
  await renderDiagram()

  themeObserver = new MutationObserver(() => {
    void renderDiagram()
  })
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  })
})

onUnmounted(() => themeObserver?.disconnect())
</script>

<template>
  <div
    v-if="svg"
    class="mermaid-diagram__canvas"
    role="img"
    :aria-label="label"
    v-html="svg"
  />
  <div v-else-if="failed" class="mermaid-diagram__status mermaid-diagram--error" role="alert">
    図を表示できませんでした。下のテキスト表現を確認してください。
  </div>
  <div v-else class="mermaid-diagram__status mermaid-diagram--loading" aria-live="polite">
    図を読み込んでいます…
  </div>
</template>
