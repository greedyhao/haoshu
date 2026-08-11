<script setup lang="ts">
import type { AiClassic, AiGoldenCase } from "../types/aiReport";

defineProps<{
  classics: AiClassic[];
  goldenCases: AiGoldenCase[];
}>();

const tierLabel: Record<number, string> = { 1: "定向命中", 2: "格局对应", 3: "通用精要" };
</script>

<template>
  <div class="classics">
    <h3>典籍溯源（{{ classics.length }} 条）</h3>
    <div v-if="!classics.length" class="hint">无命中典籍。</div>
    <details v-for="(c, i) in classics" :key="i" class="doc">
      <summary>
        <span class="tier" :class="'t' + c.tier">{{ tierLabel[c.tier] || c.tier }}</span>
        <strong>{{ c.source }}</strong>
        <span class="tt">· {{ c.title }}</span>
        <em>{{ c.match_type }}</em>
      </summary>
      <p class="content">{{ c.content }}</p>
      <p class="meta" v-if="c.matched_keys.length">命中键：{{ c.matched_keys.join("、") }}</p>
    </details>

    <h3 v-if="goldenCases.length">黄金参考命例（{{ goldenCases.length }} 条）</h3>
    <div class="panel case" v-for="(g, i) in goldenCases" :key="'g' + i">
      <div class="case-head">
        <strong>{{ g.label }}</strong>
        <span class="meta">{{ g.source }} · {{ g.gender }}</span>
      </div>
      <p class="fp">{{ g.four_pillars }}</p>
      <p class="content">{{ g.content }}</p>
    </div>
  </div>
</template>

<style scoped>
h3 {
  margin: 16px 0 8px;
  font-size: 15px;
}
.hint {
  color: var(--muted);
}
.doc {
  border-top: 1px solid var(--border);
  padding: 8px 0;
}
.doc summary {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.doc summary .tt {
  color: var(--muted);
}
.doc summary em {
  color: var(--muted);
  font-style: normal;
  font-size: 12px;
  margin-left: auto;
}
.tier {
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 10px;
  color: #fff;
}
.tier.t1 {
  background: #185fa5;
}
.tier.t2 {
  background: #1e7e34;
}
.tier.t3 {
  background: #b8860b;
}
.content {
  margin: 8px 0 4px;
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
}
.meta {
  color: var(--muted);
  font-size: 12px;
}
.panel.case {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 12px;
}
.case-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
}
.fp {
  font-size: 15px;
  letter-spacing: 1px;
  margin: 6px 0;
}
</style>
