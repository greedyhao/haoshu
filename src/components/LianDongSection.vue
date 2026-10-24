<script setup lang="ts">
import type { LianDong } from "../types/aiReport";
import { tendencyClass, tendencyOf, tendencyText } from "../lib/tendency";

defineProps<{ lianDong: LianDong }>();
</script>

<template>
  <div class="liandong">
    <p class="boundary">
      以下为冲合联动的倾向性研判（偏顺 / 中性 / 需协调 / 需谨慎，概率性），非吉凶定论；应期未经验证，仅作观察提示。
    </p>
    <p v-if="!lianDong.links.length" class="hint">无明显联动关系。</p>
    <div class="chain" v-for="(l, i) in lianDong.links" :key="i">
      <div class="trigger">{{ l.triggered_by }}</div>
      <div class="body">
        <p><span class="lbl">引动</span> {{ l.triggers.join("、") || "—" }}</p>
        <p><span class="lbl">主事</span> {{ l.matters.join("、") || "—" }}</p>
        <p>
          <span class="lbl">倾向</span>
          <span class="v" :class="tendencyClass(tendencyOf(l.verdict))">
            {{ tendencyText(l.verdict) }}
          </span>
        </p>
        <p v-if="l.basis" class="basis"><span class="lbl">依据</span> {{ l.basis }}</p>
        <p v-if="l.ying_qi_year" class="yr">
          <span class="lbl">应期</span> {{ l.ying_qi_year }} 年（推测，需本人经历验证）
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.boundary {
  margin: 0 0 12px;
  padding: 8px 12px;
  background: #fbfaf3;
  border-left: 3px solid #b8860b;
  border-radius: 6px;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.6;
}
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
.v {
  display: inline-block;
  padding: 1px 9px;
  border-radius: 10px;
  font-size: 12px;
}
.tend-smooth {
  background: #e8f1fb;
  color: #185fa5;
}
.tend-neutral {
  background: #eef0f3;
  color: var(--muted);
}
.tend-coord {
  background: #f6efe0;
  color: #8a5b00;
}
.tend-caution {
  background: #f8eadd;
  color: #8a4b1d;
}
.basis {
  color: var(--muted);
  font-size: 12px !important;
}
.yr {
  color: #8a5b00;
}
.hint {
  color: var(--muted);
}
</style>
