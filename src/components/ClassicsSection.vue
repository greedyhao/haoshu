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
    <p class="boundary">
      以下典籍原文与命例均标注「原文背景」，只作背景参考，不等于本盘结论；古籍断语需结合适用条件理解。
    </p>

    <h3>典籍溯源（{{ classics.length }} 条）</h3>
    <div v-if="!classics.length" class="hint">无命中典籍。</div>
    <details v-for="(c, i) in classics" :key="i" class="doc">
      <summary>
        <span class="tier" :class="'t' + c.tier">{{ tierLabel[c.tier] || c.tier }}</span>
        <strong>{{ c.source }}</strong>
        <span class="tt">· {{ c.title }}</span>
        <em>{{ c.match_type }}</em>
        <span class="quote-kind">{{ c.quote_kind || "原文背景" }}</span>
      </summary>
      <p class="context" v-if="c.context_note">语境说明：{{ c.context_note }}</p>
      <p class="content">【原文】{{ c.content }}</p>
      <p class="meta" v-if="c.matched_keys.length">检索依据：{{ c.matched_keys.join("、") }}</p>
    </details>

    <h3 v-if="goldenCases.length">黄金参考命例（{{ goldenCases.length }} 条）</h3>
    <p v-if="goldenCases.length" class="boundary">
      以下命例为古籍记载，非本人经历，仅作背景参考，不可直接套用于本命盘。
    </p>
    <div class="panel case" v-for="(g, i) in goldenCases" :key="'g' + i">
      <div class="case-head">
        <strong>{{ g.label }}</strong>
        <span class="meta">{{ g.source }} · {{ g.gender }}</span>
      </div>
      <p class="fp">{{ g.four_pillars }}</p>
      <p class="content">{{ g.content }}</p>
      <p class="disclaimer">{{ g.disclaimer || "古籍命例，非本人经历，仅作背景参考" }}</p>
    </div>
  </div>
</template>

<style scoped>
.boundary {
  margin: 0 0 10px;
  padding: 8px 12px;
  background: #fbfaf3;
  border-left: 3px solid #b8860b;
  border-radius: 6px;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.6;
}
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
.quote-kind {
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 10px;
  background: #f6efe0;
  color: #8a5b00;
  white-space: nowrap;
}
.context {
  margin: 8px 0 0;
  padding: 6px 10px;
  background: #f8f9fb;
  border: 1px dashed var(--border);
  border-radius: 6px;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.7;
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
.disclaimer {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--muted);
  border-top: 1px dashed var(--border);
  padding-top: 6px;
}
</style>
