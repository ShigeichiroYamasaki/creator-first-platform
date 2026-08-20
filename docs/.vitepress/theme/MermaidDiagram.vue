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

function preserveDiagramTextScale(renderedSvg: string, contentFontSize: string) {
  const template = document.createElement('template')
  template.innerHTML = renderedSvg.trim()
  const diagram = template.content.querySelector('svg')

  if (!diagram) return renderedSvg

  const viewBox = diagram.getAttribute('viewBox')?.trim().split(/\s+/).map(Number)
  const layoutWidth = viewBox?.length === 4 && Number.isFinite(viewBox[2])
    ? Math.ceil(viewBox[2])
    : undefined

  if (!layoutWidth) return renderedSvg

  diagram.setAttribute('width', String(layoutWidth))
  diagram.setAttribute('data-layout-width', String(layoutWidth))
  diagram.setAttribute('data-min-font-size', contentFontSize)
  diagram.style.width = `${layoutWidth}px`
  diagram.style.maxWidth = 'none'
  diagram.style.height = 'auto'

  return diagram.outerHTML
}

async function renderDiagram() {
  try {
    const { default: mermaid } = await import('mermaid')
    const dark = document.documentElement.classList.contains('dark')
    const content = document.querySelector('.vp-doc') ?? document.body
    const contentFontSize = getComputedStyle(content).fontSize

    mermaid.initialize({
      securityLevel: 'strict',
      startOnLoad: false,
      theme: frontmatter.value.mermaidTheme || (dark ? 'dark' : 'default'),
      themeVariables: {
        fontSize: contentFontSize
      }
    })

    const result = await mermaid.render(props.id, source.value)
    svg.value = preserveDiagramTextScale(result.svg, contentFontSize)
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
    tabindex="0"
    v-html="svg"
  />
  <div v-else-if="failed" class="mermaid-diagram__status mermaid-diagram--error" role="alert">
    図を表示できませんでした。下のテキスト表現を確認してください。
  </div>
  <div v-else class="mermaid-diagram__status mermaid-diagram--loading" aria-live="polite">
    図を読み込んでいます…
  </div>
</template>
