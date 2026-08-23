<script setup lang="ts">
import { computed, ref } from 'vue'

type MoneyRow = { label: string; amount: number; note: string }

const openingBalance = 3_200_000
const inflows: MoneyRow[] = [
  { label: 'サブスクリプション課金', amount: 1_000_000, note: '確定済み収入Fixture' },
  { label: 'サポーター支援', amount: 200_000, note: '確定済み収入Fixture' }
]
const outflows: MoneyRow[] = [
  { label: 'クリエータ分配', amount: 650_000, note: '支払済みFixture' },
  { label: 'システム維持', amount: 180_000, note: 'クラウド・開発・監査等' },
  { label: '納税・公租公課', amount: 120_000, note: '法人処理Fixture' },
  { label: 'プロモーション', amount: 80_000, note: '承認済み予算から支出' },
  { label: 'コミュニティ運営', amount: 70_000, note: '承認済み予算から支出' }
]
const locations: MoneyRow[] = [
  { label: 'コントラクト内資産', amount: 1_800_000, note: 'オンチェーン保管' },
  { label: '法人管理資産', amount: 1_100_000, note: '法人の資金管理' },
  { label: '未収金', amount: 400_000, note: '会計上の未回収額Fixture' }
]
const purposes: MoneyRow[] = [
  { label: 'クリエータ未払額', amount: 1_250_000, note: '確定・保留を含むFixture' },
  { label: '納税準備・未払税金', amount: 300_000, note: '税務判断前のFixture' },
  { label: 'システム維持準備金', amount: 500_000, note: '運用継続の承認済み枠' },
  { label: 'プロモーション予算', amount: 200_000, note: '未執行の承認済み枠' },
  { label: 'コミュニティ運営予算', amount: 250_000, note: '未執行の承認済み枠' },
  { label: '未配分・純準備金', amount: 800_000, note: '用途決定前の残余' }
]

const total = (rows: MoneyRow[]) => rows.reduce((sum, row) => sum + row.amount, 0)
const inflowTotal = computed(() => total(inflows))
const outflowTotal = computed(() => total(outflows))
const endingBalance = computed(() => openingBalance + inflowTotal.value - outflowTotal.value)
const locationTotal = computed(() => total(locations))
const purposeTotal = computed(() => total(purposes))
const flowReconciled = computed(() => endingBalance.value === locationTotal.value)
const balanceReconciled = computed(() => locationTotal.value === purposeTotal.value)
const format = (amount: number) => new Intl.NumberFormat('ja-JP').format(amount)
const compactFormat = (amount: number) => `${Math.round(amount / 10_000)}万`
const width = (amount: number) => `${Math.max(4, amount / endingBalance.value * 100)}%`
const stockView = ref<'location' | 'purpose'>('location')
const selectedStockRows = computed(() => stockView.value === 'location' ? locations : purposes)
const availableFunds = computed(() => openingBalance + inflowTotal.value)
const periodFlowWidth = (amount: number) => amount / availableFunds.value * 160
const stockFlowWidth = (amount: number) => amount / endingBalance.value * 180
const stockMobileFlowWidth = (amount: number) => amount / endingBalance.value * 200
const curve = (x1: number, y1: number, x2: number, y2: number) => `M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`
const shortStockLabel = (label: string) => ({
  'クリエータ未払額': 'クリエータ未払',
  '納税準備・未払税金': '税準備・未払',
  'システム維持準備金': '維持準備',
  'プロモーション予算': 'Promotion',
  'コミュニティ運営予算': 'Community',
  '未配分・純準備金': '未配分準備'
}[label] ?? label)
const stockSourceY = (index: number) => 70 + selectedStockRows.value.slice(0, index).reduce((sum, row) => sum + stockFlowWidth(row.amount), 0) + stockFlowWidth(selectedStockRows.value[index].amount) / 2
const stockTargetY = (index: number) => stockView.value === 'location'
  ? [70, 175, 255][index]
  : [50, 100, 145, 190, 230, 285][index]
const stockMobileSourceY = (index: number) => 60 + selectedStockRows.value.slice(0, index).reduce((sum, row) => sum + stockMobileFlowWidth(row.amount), 0) + stockMobileFlowWidth(selectedStockRows.value[index].amount) / 2
const stockMobileTargetY = (index: number) => stockView.value === 'location'
  ? [60, 165, 250][index]
  : [40, 90, 135, 180, 220, 275][index]
</script>

<template>
  <section class="treasury-demo" aria-labelledby="treasury-demo-title">
    <header class="dashboard-heading">
      <div>
        <p class="kicker">Treasury Transparency · Synthetic fixture</p>
        <h2 id="treasury-demo-title">資金フロー透明性ダッシュボード</h2>
      </div>
      <div class="meta"><span>2026-08</span><span>MockJPYC</span><span>mock-treasury-v1</span></div>
    </header>

    <div class="notice" role="note">
      これは計算方法を示す合成データです。法定の貸借対照表・会計帳簿・税務申告ではなく、支払や予算執行を承認する機能もありません。
    </div>

    <section class="visualization-panel" aria-labelledby="visualization-title">
      <h3 id="visualization-title">流入・流出・ストックの可視化</h3>
      <div class="summary-table-wrap">
        <table class="summary-table">
          <thead><tr><th scope="col">区分</th><th scope="col">金額</th><th scope="col">意味</th></tr></thead>
          <tbody>
            <tr><th scope="row">流入</th><td>{{ format(inflowTotal) }}</td><td>期間中に確定した収入</td></tr>
            <tr><th scope="row">流出</th><td>{{ format(outflowTotal) }}</td><td>期間中に確定した支出</td></tr>
            <tr><th scope="row">ストック</th><td>{{ format(endingBalance) }}</td><td>期末時点の残高</td></tr>
          </tbody>
        </table>
      </div>

      <figure class="sankey-figure">
        <figcaption>期間資金フロー</figcaption>
        <p class="chart-description">期首残高と期間中の流入が利用可能資金となり、期間流出と期末ストックへ移る関係を線の太さで表します。</p>
        <div class="sankey-desktop" role="img" :aria-label="`期首残高 ${format(openingBalance)}、課金 ${format(inflows[0].amount)}、支援 ${format(inflows[1].amount)}から、期間流出 ${format(outflowTotal)}と期末ストック ${format(endingBalance)}へ流れるサンキーダイアグラム`">
          <svg viewBox="0 0 600 330" aria-hidden="true">
            <path class="sankey-link opening" :d="curve(42, 92, 200, 128)" :stroke-width="periodFlowWidth(openingBalance)" />
            <path class="sankey-link inflow" :d="curve(42, 225, 200, 204)" :stroke-width="periodFlowWidth(inflows[0].amount)" />
            <path class="sankey-link support" :d="curve(42, 292, 200, 230)" :stroke-width="periodFlowWidth(inflows[1].amount)" />
            <path class="sankey-link outflow" :d="curve(210, 120, 360, 78)" :stroke-width="periodFlowWidth(outflowTotal)" />
            <path class="sankey-link stock" :d="curve(210, 210, 360, 188)" :stroke-width="periodFlowWidth(endingBalance)" />
            <path v-for="(row, index) in outflows" :key="row.label" class="sankey-link outflow-detail" :d="curve(370, 58 + outflows.slice(0, index).reduce((sum, item) => sum + periodFlowWidth(item.amount), 0) + periodFlowWidth(row.amount) / 2, 520, 42 + index * 56)" :stroke-width="Math.max(2.5, periodFlowWidth(row.amount))" />

            <rect class="sankey-node opening-node" x="30" :y="92 - periodFlowWidth(openingBalance) / 2" width="12" :height="periodFlowWidth(openingBalance)" />
            <rect class="sankey-node inflow-node" x="30" :y="225 - periodFlowWidth(inflows[0].amount) / 2" width="12" :height="periodFlowWidth(inflows[0].amount)" />
            <rect class="sankey-node support-node" x="30" :y="292 - periodFlowWidth(inflows[1].amount) / 2" width="12" :height="periodFlowWidth(inflows[1].amount)" />
            <rect class="sankey-node available-node" x="200" y="92" width="10" height="160" />
            <rect class="sankey-node outflow-node" x="360" :y="78 - periodFlowWidth(outflowTotal) / 2" width="10" :height="periodFlowWidth(outflowTotal)" />
            <rect class="sankey-node stock-node" x="360" :y="188 - periodFlowWidth(endingBalance) / 2" width="10" :height="periodFlowWidth(endingBalance)" />
            <rect v-for="(row, index) in outflows" :key="`node-${row.label}`" class="sankey-node outflow-detail-node" x="520" :y="42 + index * 56 - Math.max(2.5, periodFlowWidth(row.amount)) / 2" width="10" :height="Math.max(2.5, periodFlowWidth(row.amount))" />

            <g class="sankey-label"><text x="18" y="24">期首残高</text><text x="18" y="42">{{ compactFormat(openingBalance) }}</text></g>
            <g class="sankey-label"><text x="18" y="190">サブスクリプション</text><text x="18" y="208">{{ compactFormat(inflows[0].amount) }}</text></g>
            <g class="sankey-label"><text x="18" y="278">サポーター支援 {{ compactFormat(inflows[1].amount) }}</text></g>
            <g class="sankey-label center"><text x="205" y="72">利用可能資金</text><text x="205" y="88">{{ compactFormat(availableFunds) }}</text></g>
            <g class="sankey-label"><text x="380" y="58">期間流出 {{ compactFormat(outflowTotal) }}</text><text x="380" y="272">期末ストック {{ compactFormat(endingBalance) }}</text></g>
            <g v-for="(row, index) in outflows" :key="`label-${row.label}`" class="sankey-label"><text x="536" :y="39 + index * 56">{{ row.label }}</text><text x="536" :y="55 + index * 56">{{ compactFormat(row.amount) }}</text></g>
          </svg>
        </div>
        <div class="sankey-mobile" role="img" :aria-label="`期首残高と期間流入から、期間流出 ${format(outflowTotal)}と期末ストック ${format(endingBalance)}へ流れる縦型サンキーダイアグラム`">
          <svg viewBox="0 0 240 400" aria-hidden="true">
            <path class="sankey-link opening" d="M 69.5 62 C 69.5 110, 69.5 130, 69.5 178" stroke-width="111" />
            <path class="sankey-link inflow" d="M 157.5 62 C 157.5 110, 142.5 130, 142.5 178" stroke-width="35" />
            <path class="sankey-link support" d="M 202.5 62 C 202.5 110, 163.5 130, 163.5 178" stroke-width="7" />
            <path class="sankey-link outflow" d="M 33 190 C 33 240, 33 255, 33 305" stroke-width="38" />
            <path class="sankey-link stock" d="M 109.5 190 C 109.5 240, 109.5 255, 109.5 305" stroke-width="115" />
            <rect class="sankey-node opening-node" x="14" y="50" width="111" height="12" />
            <rect class="sankey-node inflow-node" x="140" y="50" width="35" height="12" />
            <rect class="sankey-node support-node" x="199" y="50" width="7" height="12" />
            <rect class="sankey-node available-node" x="14" y="178" width="154" height="12" />
            <rect class="sankey-node outflow-node" x="14" y="305" width="38" height="12" />
            <rect class="sankey-node stock-node" x="52" y="305" width="115" height="12" />
            <g class="sankey-label"><text x="14" y="22">期首 {{ compactFormat(openingBalance) }}</text><text x="131" y="22">課金 {{ compactFormat(inflows[0].amount) }}</text><text x="226" y="42" text-anchor="end">支援 {{ compactFormat(inflows[1].amount) }}</text></g>
            <g class="sankey-label center"><text x="91" y="215" text-anchor="middle">利用可能資金 {{ compactFormat(availableFunds) }}</text></g>
            <g class="sankey-label"><text x="14" y="344">流出 {{ compactFormat(outflowTotal) }}</text><text x="52" y="344">期末ストック {{ compactFormat(endingBalance) }}</text><text x="14" y="380">流出内訳は下の数値表で確認</text></g>
          </svg>
        </div>
      </figure>

      <figure class="sankey-figure stock-sankey">
        <figcaption class="sankey-caption-hidden">期末ストックの分類</figcaption>
        <div class="stock-chart-heading">
          <div><p class="figure-title">期末ストック</p><p class="chart-description">期末残高を、同時に重ねない二つの分類で確認します。</p></div>
          <div class="stock-toggle" aria-label="期末ストックの分類">
            <button type="button" :aria-pressed="stockView === 'location'" @click="stockView = 'location'">所在別</button>
            <button type="button" :aria-pressed="stockView === 'purpose'" @click="stockView = 'purpose'">目的別</button>
          </div>
        </div>
        <div class="stock-sankey-graphic" role="img" :aria-label="`期末ストック ${format(endingBalance)}を${stockView === 'location' ? '所在別' : '目的別'}に分解するサンキーダイアグラム`" aria-live="polite">
          <svg class="stock-sankey-desktop" viewBox="0 0 600 320" aria-hidden="true">
            <path v-for="(row, index) in selectedStockRows" :key="row.label" class="sankey-link stock-detail" :d="curve(130, stockSourceY(index), 455, stockTargetY(index))" :stroke-width="Math.max(3, stockFlowWidth(row.amount))" />
            <rect class="sankey-node stock-node" x="120" y="70" width="10" height="180" />
            <rect v-for="(row, index) in selectedStockRows" :key="`stock-node-${row.label}`" class="sankey-node stock-detail-node" x="455" :y="stockTargetY(index) - Math.max(3, stockFlowWidth(row.amount)) / 2" width="10" :height="Math.max(3, stockFlowWidth(row.amount))" />
            <g class="sankey-label"><text x="18" y="145">期末ストック</text><text x="18" y="164">{{ format(endingBalance) }}</text></g>
            <g v-for="(row, index) in selectedStockRows" :key="`stock-label-${row.label}`" class="sankey-label"><text x="478" :y="stockTargetY(index) - 2">{{ shortStockLabel(row.label) }}</text><text x="478" :y="stockTargetY(index) + 15">{{ format(row.amount) }}</text></g>
          </svg>
          <svg class="stock-sankey-mobile" viewBox="0 0 240 310" aria-hidden="true">
            <path v-for="(row, index) in selectedStockRows" :key="`mobile-${row.label}`" class="sankey-link stock-detail" :d="curve(24, stockMobileSourceY(index), 192, stockMobileTargetY(index))" :stroke-width="Math.max(3, stockMobileFlowWidth(row.amount))" />
            <rect class="sankey-node stock-node" x="16" y="60" width="8" height="200" />
            <rect v-for="(row, index) in selectedStockRows" :key="`mobile-node-${row.label}`" class="sankey-node stock-detail-node" x="192" :y="stockMobileTargetY(index) - Math.max(3, stockMobileFlowWidth(row.amount)) / 2" width="8" :height="Math.max(3, stockMobileFlowWidth(row.amount))" />
            <g class="sankey-label"><text x="18" y="24">期末ストック {{ compactFormat(endingBalance) }}</text></g>
            <g v-for="(row, index) in selectedStockRows" :key="`mobile-label-${row.label}`" class="sankey-label"><text x="210" :y="stockMobileTargetY(index) + 4">{{ index + 1 }}</text></g>
          </svg>
        </div>
        <ul class="stock-mobile-legend"><li v-for="(row, index) in selectedStockRows" :key="`legend-${row.label}`"><span><b>{{ index + 1 }}</b>{{ row.label }}</span><strong>{{ format(row.amount) }}</strong></li></ul>
      </figure>
    </section>

    <section class="flow-panel" aria-labelledby="period-flow-title">
      <div class="panel-heading"><h3 id="period-flow-title">期間中の資金フロー</h3><span :class="['reconcile', flowReconciled ? 'ok' : 'error']">{{ flowReconciled ? '照合一致' : '要確認' }}</span></div>
      <div class="equation" aria-label="期首残高に収入を加え支出を引くと期末残高になる">
        <div><span>期首残高</span><strong>{{ format(openingBalance) }}</strong></div><b>＋</b>
        <div><span>収入</span><strong>{{ format(inflowTotal) }}</strong></div><b>−</b>
        <div><span>支出</span><strong>{{ format(outflowTotal) }}</strong></div><b>＝</b>
        <div class="ending"><span>期末残高</span><strong>{{ format(endingBalance) }}</strong></div>
      </div>
      <div class="flow-columns">
        <div><h4>収入</h4><ul><li v-for="row in inflows" :key="row.label"><span>{{ row.label }}</span><strong>+ {{ format(row.amount) }}</strong><small>{{ row.note }}</small></li></ul></div>
        <div><h4>支出</h4><ul><li v-for="row in outflows" :key="row.label"><span>{{ row.label }}</span><strong>− {{ format(row.amount) }}</strong><small>{{ row.note }}</small></li></ul></div>
      </div>
    </section>

    <div class="balance-heading"><h3>期末残高の照合</h3><span :class="['reconcile', balanceReconciled ? 'ok' : 'error']">{{ balanceReconciled ? '左右一致' : '要確認' }}</span></div>
    <div class="balance-grid">
      <section class="balance-panel" aria-labelledby="asset-location-title">
        <h4 id="asset-location-title">どこにあるか（資産の所在）</h4>
        <p class="total">合計 <strong>{{ format(locationTotal) }}</strong></p>
        <ul><li v-for="row in locations" :key="row.label"><div><span>{{ row.label }}</span><strong>{{ format(row.amount) }}</strong></div><div class="bar"><i :style="{ width: width(row.amount) }"></i></div><small>{{ row.note }}</small></li></ul>
      </section>
      <section class="balance-panel" aria-labelledby="purpose-title">
        <h4 id="purpose-title">何のためか（負担・準備・残余）</h4>
        <p class="total">合計 <strong>{{ format(purposeTotal) }}</strong></p>
        <ul><li v-for="row in purposes" :key="row.label"><div><span>{{ row.label }}</span><strong>{{ format(row.amount) }}</strong></div><div class="bar purpose"><i :style="{ width: width(row.amount) }"></i></div><small>{{ row.note }}</small></li></ul>
      </section>
    </div>
    <p class="footnote">単位: MockJPYCの最小表示単位（整数） · 状態: FINALIZED_FIXTURE · 実データ連携なし</p>
  </section>
</template>

<style scoped>
.treasury-demo { margin: 1.75rem 0; }
.dashboard-heading, .panel-heading, .balance-heading { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 1rem; align-items: center; }
.dashboard-heading h2, .panel-heading h3, .balance-heading h3 { margin: 0.25rem 0 0; border: 0; }
.kicker { margin: 0; color: var(--vp-c-brand-1); font-size: .82rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
.meta { display: flex; flex-wrap: wrap; gap: .4rem; }
.meta span, .reconcile { padding: .3rem .6rem; border-radius: 999px; background: var(--vp-c-bg-soft); font-size: .78rem; font-weight: 700; }
.notice { margin: 1rem 0; padding: .9rem 1rem; border-left: 4px solid var(--vp-c-warning-1); background: var(--vp-c-warning-soft); }
.flow-panel, .balance-panel, .visualization-panel { padding: 1.1rem; border: 1px solid var(--vp-c-divider); border-radius: 14px; background: var(--vp-c-bg-soft); }
.visualization-panel { margin: 1rem 0; }
.visualization-panel > h3 { margin-top: 0; }
.summary-table-wrap { overflow-x: auto; }
.summary-table { width: 100%; margin: 0 0 1.25rem; border-collapse: collapse; background: var(--vp-c-bg); }
.summary-table th, .summary-table td { padding: .65rem .75rem; border: 1px solid var(--vp-c-divider); text-align: left; }
.summary-table td:nth-child(2) { text-align: right; font-variant-numeric: tabular-nums; font-weight: 700; }
.sankey-figure { min-width: 0; margin: 0 0 1rem; padding: 1rem; border: 1px solid var(--vp-c-divider); background: var(--vp-c-bg); }
figcaption { font-weight: 700; }
.figure-title { margin: 0; font-weight: 700; }
.sankey-caption-hidden { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
.chart-description { margin: .25rem 0 .75rem; color: var(--vp-c-text-2); font-size: .82rem; }
.sankey-desktop svg, .sankey-mobile svg, .stock-sankey-graphic svg { display: block; width: 100%; height: auto; }
.sankey-link { fill: none; stroke-opacity: .54; }
.sankey-link.opening { stroke: var(--vp-c-text-3); }.sankey-link.inflow { stroke: var(--vp-c-brand-1); }.sankey-link.support { stroke: var(--vp-c-brand-2); }
.sankey-link.outflow, .sankey-link.outflow-detail { stroke: var(--vp-c-warning-1); }.sankey-link.stock, .sankey-link.stock-detail { stroke: var(--vp-c-green-1); }
.sankey-node { rx: 2; }.opening-node { fill: var(--vp-c-text-2); }.inflow-node, .available-node { fill: var(--vp-c-brand-1); }.support-node { fill: var(--vp-c-brand-2); }
.outflow-node, .outflow-detail-node { fill: var(--vp-c-warning-1); }.stock-node, .stock-detail-node { fill: var(--vp-c-green-1); }
.sankey-label { fill: var(--vp-c-text-1); font-size: 13px; }.sankey-label text + text { fill: var(--vp-c-text-2); font-size: 12px; }.sankey-label.center { font-weight: 700; }
.sankey-mobile { display: none; }
.stock-sankey-mobile { display: none !important; }
.stock-chart-heading { display: flex; flex-wrap: wrap; justify-content: space-between; gap: .75rem; align-items: start; }
.stock-toggle { display: flex; padding: 3px; border: 1px solid var(--vp-c-divider); border-radius: 9px; background: var(--vp-c-bg-soft); }
.stock-toggle button { min-height: 36px; padding: .35rem .75rem; border: 0; border-radius: 6px; background: transparent; color: var(--vp-c-text-1); font: inherit; font-weight: 700; cursor: pointer; }
.stock-toggle button[aria-pressed='true'] { background: var(--vp-c-brand-1); color: var(--vp-c-white); }
.stock-mobile-legend { display: none; }
.reconcile.ok { color: var(--vp-c-green-1); background: var(--vp-c-green-soft); }
.reconcile.error { color: var(--vp-c-danger-1); background: var(--vp-c-danger-soft); }
.equation { display: grid; grid-template-columns: repeat(7, auto); gap: .7rem; align-items: center; margin: 1rem 0; }
.equation > div { display: grid; gap: .2rem; min-width: 0; padding: .75rem; border-radius: 10px; background: var(--vp-c-bg); }
.equation span, small, .footnote { color: var(--vp-c-text-2); }
.equation strong { font-size: 1.15rem; }
.equation .ending { background: var(--vp-c-brand-soft); }
.flow-columns, .balance-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
h4 { margin: .25rem 0 .7rem; }
ul { display: grid; gap: .65rem; margin: 0; padding: 0; list-style: none; }
.flow-columns li { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: .15rem .75rem; padding-bottom: .5rem; border-bottom: 1px solid var(--vp-c-divider); }
.flow-columns small { grid-column: 1 / -1; }
.balance-heading { margin: 1.5rem 0 .75rem; }
.total { display: flex; justify-content: space-between; padding-bottom: .65rem; border-bottom: 1px solid var(--vp-c-divider); }
.balance-panel li > div:first-child { display: flex; justify-content: space-between; gap: .75rem; }
.bar { height: 7px; overflow: hidden; border-radius: 99px; background: var(--vp-c-divider); }
.bar i { display: block; height: 100%; border-radius: inherit; background: var(--vp-c-brand-1); }
.bar.purpose i { background: var(--vp-c-green-1); }
.footnote { margin: .8rem 0 0; font-size: .82rem; }
@media (max-width: 760px) { .equation { grid-template-columns: 1fr; } .equation > b { text-align: center; } .flow-columns, .balance-grid { grid-template-columns: 1fr; } .sankey-desktop { display: none; } .sankey-mobile { display: block; } .sankey-mobile svg, .stock-sankey-mobile { max-width: 360px; margin-inline: auto; } .stock-sankey-desktop { display: none !important; } .stock-sankey-mobile { display: block !important; } .stock-mobile-legend { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .35rem .75rem; } .stock-mobile-legend li { display: flex; justify-content: space-between; gap: .5rem; font-size: .78rem; } .stock-mobile-legend span { display: flex; gap: .35rem; } .stock-mobile-legend b { color: var(--vp-c-green-1); } }
@media (max-width: 420px) { .stock-chart-heading { display: grid; } .stock-toggle { width: 100%; } .stock-toggle button { flex: 1; } .stock-mobile-legend { grid-template-columns: 1fr; } }
</style>
