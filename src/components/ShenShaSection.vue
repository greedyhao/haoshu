<script setup lang="ts">
import type { AiShenSha } from "../types/aiReport";

defineProps<{ shensha: AiShenSha }>();

const categoryColor: Record<string, string> = {
  吉神: "#2e7d32",
  凶煞: "#c62828",
  特殊格局: "#6a1b9a",
};
</script>

<template>
  <div class="panel shensha">
    <h2>神煞</h2>
    <div class="by-pillar" v-for="p in shensha.by_pillar" :key="p.pillar">
      <h3>{{ p.pillar }} <small>（{{ p.cross_pillar_weight }}）</small></h3>
      <span class="chip" v-for="s in p.shensha" :key="s">{{ s }}</span>
    </div>

    <h3>命中神煞详解（{{ shensha.details.length }}）</h3>
    <details v-for="d in shensha.details" :key="d.name">
      <summary>
        <span class="dot" :style="{ background: categoryColor[d.category] || '#888' }"></span>
        {{ d.name }} <em>{{ d.category }}</em>
      </summary>
      <p class="desc">{{ d.short_desc }}</p>
      <p class="rule"><b>查法：</b>{{ d.rule_text }}</p>
      <p class="koujue" v-if="d.koujue"><b>口诀：</b>{{ d.koujue }}</p>
    </details>
  </div>
</template>
