<script setup lang="ts">
import type { XingQingCard } from "../types/aiReport";

defineProps<{ xingQing: XingQingCard }>();
</script>

<template>
  <div class="xingqing">
    <div class="panel">
      <h2>性情九维</h2>

      <h3>日主本象</h3>
      <p>{{ xingQing.ri_gan_xiang }}</p>

      <h3>坐支之象</h3>
      <p>{{ xingQing.zuo_zhi_xiang }}</p>

      <h3>十神性情</h3>
      <ul class="lines">
        <li v-for="(s, i) in xingQing.shi_shen_xiang" :key="i">{{ s }}</li>
      </ul>

      <h3>五行偏颇 · 五常得失</h3>
      <div class="dev">
        <span class="chip" v-for="(v, k) in xingQing.wuxing_deviation" :key="k">{{ k }}：{{ v }}</span>
      </div>

      <h3>格局性情</h3>
      <p>{{ xingQing.geju_xiang }}</p>

      <h3>神煞性情（日时柱）</h3>
      <div class="marks">
        <span class="chip" v-for="(s, i) in xingQing.shensha_marks" :key="i">{{ s }}</span>
        <span v-if="!xingQing.shensha_marks.length" class="muted">—</span>
      </div>

      <h3>调候冷热</h3>
      <p>{{ xingQing.tiao_hou_xiang }}</p>

      <h3>总校验</h3>
      <p class="verdict">{{ xingQing.verdict }}</p>
    </div>
  </div>
</template>

<style scoped>
.panel {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
}
.panel h2 {
  margin: 0 0 12px;
  font-size: 16px;
}
h3 {
  margin: 14px 0 6px;
  font-size: 14px;
  color: var(--muted);
}
p {
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
}
.lines {
  margin: 0;
  padding-left: 18px;
  font-size: 14px;
  line-height: 1.7;
}
.dev,
.marks {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chip {
  display: inline-block;
  padding: 2px 9px;
  background: #eef2f7;
  border-radius: 12px;
  font-size: 13px;
}
.verdict {
  color: #185fa5;
}
.muted {
  color: var(--muted);
}
</style>
