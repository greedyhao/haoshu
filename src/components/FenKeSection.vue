<script setup lang="ts">
import { computed } from "vue";
import type { FenKeZhuanXiang } from "../types/aiReport";
import { tendencyClass, tendencyOf, tendencyText } from "../lib/tendency";

const props = defineProps<{ fenKe: FenKeZhuanXiang }>();

const items = [
  { key: "career", label: "事业" },
  { key: "wealth", label: "财运" },
  { key: "marriage", label: "婚姻" },
  { key: "children", label: "子女" },
  { key: "health", label: "健康" },
  { key: "parents", label: "父母" },
] as const;

const rows = computed(() => items.map((it) => ({ ...it, item: props.fenKe[it.key] })));
</script>

<template>
  <div class="fenke">
    <p class="boundary">
      以下为分科倾向性参考（偏顺 / 中性 / 需协调 / 需谨慎，概率性），依据为引擎结构关系，非吉凶定论。
    </p>
    <div class="grid-2">
      <div class="panel" v-for="row in rows" :key="row.key">
        <h2>{{ row.label }}</h2>
        <div class="item">
          <div class="stars">
            <span class="sl">核心星</span>
            <span class="chip" v-for="s in row.item.key_star" :key="s">{{ s }}</span>
            <span v-if="!row.item.key_star.length" class="muted">—</span>
          </div>
          <p class="meta">核心宫：{{ row.item.core_palace || "—" }}</p>
          <p class="meta">强弱：{{ row.item.strength || "—" }}</p>
          <p class="tendency" :class="tendencyClass(tendencyOf(row.item.ji_xiong))">
            倾向：{{ tendencyText(row.item.ji_xiong) }}
          </p>
          <p class="basis" v-if="row.item.basis">依据：{{ row.item.basis }}</p>
          <div class="sha" v-if="row.item.shensha_detail.length">
            <span class="sl">神煞</span>
            <span class="chip sha-chip" v-for="s in row.item.shensha_detail" :key="s">{{ s }}</span>
          </div>
        </div>
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
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.panel {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
}
.panel h2 {
  margin: 0 0 10px;
  font-size: 16px;
}
.stars {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.sl {
  color: var(--muted);
  font-size: 13px;
}
.chip {
  display: inline-block;
  padding: 2px 9px;
  background: #eef2f7;
  border-radius: 12px;
  font-size: 13px;
}
.chip.sha-chip {
  background: #f3f5f9;
}
.meta {
  color: var(--muted);
  font-size: 13px;
  margin: 8px 0 0;
}
.tendency {
  font-size: 13px;
  margin: 8px 0 0;
  display: inline-block;
  padding: 2px 10px;
  border-radius: 10px;
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
  font-size: 12px;
  color: var(--muted);
  margin: 6px 0 0;
  line-height: 1.6;
}
.sha {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.muted {
  color: var(--muted);
}
@media (max-width: 760px) {
  .grid-2 {
    grid-template-columns: 1fr;
  }
}
</style>
