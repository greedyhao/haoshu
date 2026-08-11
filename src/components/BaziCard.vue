<script setup lang="ts">
import type { AiBazi } from "../types/aiReport";

defineProps<{ bazi: AiBazi }>();

const pillars = [
  { tag: "年", v: "year" },
  { tag: "月", v: "month" },
  { tag: "日", v: "day" },
  { tag: "时", v: "hour" },
] as const;
</script>

<template>
  <div class="panel bazi-card">
    <h2>四柱八字</h2>
    <div class="pillars">
      <div class="pillar" v-for="p in pillars" :key="p.tag">
        <span class="tag">{{ p.tag }}</span>
        <b>{{ bazi[p.v] }}</b>
      </div>
    </div>
    <p class="meta">
      日主 <b>{{ bazi.ri_zhu }}</b> · 月令 {{ bazi.yue_ling }} ·
      {{ bazi.gender }} · 大运{{ bazi.dayun_direction }}
    </p>
  </div>
</template>
