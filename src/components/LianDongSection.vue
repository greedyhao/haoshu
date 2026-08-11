<script setup lang="ts">
import type { LianDong } from "../types/aiReport";

defineProps<{ lianDong: LianDong }>();
</script>

<template>
  <div class="liandong">
    <p v-if="!lianDong.links.length" class="hint">无明显联动关系。</p>
    <div class="chain" v-for="(l, i) in lianDong.links" :key="i">
      <div class="trigger">{{ l.triggered_by }}</div>
      <div class="body">
        <p><span class="lbl">引动</span> {{ l.triggers.join("、") || "—" }}</p>
        <p><span class="lbl">主事</span> {{ l.matters.join("、") || "—" }}</p>
        <p class="v" :class="l.verdict.includes('吉') ? 'good' : l.verdict.includes('凶') ? 'bad' : 'na'">
          <span class="lbl">定论</span> {{ l.verdict }}
        </p>
        <p v-if="l.ying_qi_year" class="yr"><span class="lbl">应期</span> {{ l.ying_qi_year }} 年</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chain {
  border: 1px solid var(--border);
  border-radius: 10px;
  margin-bottom: 12px;
  overflow: hidden;
  background: var(--panel);
}
.trigger {
  background: #f3f5f9;
  padding: 8px 14px;
  font-weight: 600;
  font-size: 14px;
}
.body {
  padding: 10px 14px;
}
.body p {
  margin: 4px 0;
  font-size: 13px;
  line-height: 1.6;
}
.lbl {
  display: inline-block;
  width: 40px;
  color: var(--muted);
  font-size: 12px;
}
.v.good {
  color: #1e7e34;
}
.v.bad {
  color: #c0392b;
}
.yr {
  color: #b8860b;
}
.hint {
  color: var(--muted);
}
</style>
