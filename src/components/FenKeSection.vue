<script setup lang="ts">
import type { FenKeZhuanXiang } from "../types/aiReport";

const props = defineProps<{ fenKe: FenKeZhuanXiang }>();

const items: { key: keyof FenKeZhuanXiang; label: string }[] = [
  { key: "career", label: "事业" },
  { key: "wealth", label: "财运" },
  { key: "marriage", label: "婚姻" },
  { key: "children", label: "子女" },
  { key: "health", label: "健康" },
  { key: "parents", label: "父母" },
];

function jiClass(ji: string): string {
  if (/吉/.test(ji)) return "good";
  if (/凶|忌/.test(ji)) return "bad";
  return "na";
}
</script>

<template>
  <div class="fenke">
    <div class="grid-2">
      <div class="panel" v-for="it in items" :key="it.key">
        <h2>{{ it.label }}</h2>
        <div class="item">
          <div class="stars">
            <span class="sl">核心星</span>
            <span class="chip" v-for="s in props.fenKe[it.key].key_star" :key="s">{{ s }}</span>
            <span v-if="!props.fenKe[it.key].key_star.length" class="muted">—</span>
          </div>
          <p class="meta">核心宫：{{ props.fenKe[it.key].core_palace || "—" }}</p>
          <p class="meta">强弱：{{ props.fenKe[it.key].strength || "—" }}</p>
          <p class="ji" :class="jiClass(props.fenKe[it.key].ji_xiong)">
            吉凶：{{ props.fenKe[it.key].ji_xiong || "—" }}
          </p>
          <div class="sha" v-if="props.fenKe[it.key].shensha_detail.length">
            <span class="sl">神煞</span>
            <span class="chip sha-chip" v-for="s in props.fenKe[it.key].shensha_detail" :key="s">
              {{ s }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
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
.ji {
  font-size: 13px;
  margin: 6px 0 0;
}
.ji.good {
  color: #1e7e34;
}
.ji.bad {
  color: #c0392b;
}
.ji.na {
  color: var(--muted);
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
