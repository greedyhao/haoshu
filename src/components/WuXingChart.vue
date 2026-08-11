<script setup lang="ts">
import { computed } from "vue";
import type { AiWangShuai } from "../types/aiReport";

const props = defineProps<{ wangShuai: AiWangShuai }>();

const order = ["木", "火", "土", "金", "水"];
const colors: Record<string, string> = {
  木: "var(--c-mu)",
  火: "var(--c-huo)",
  土: "var(--c-tu)",
  金: "var(--c-jin)",
  水: "var(--c-shui)",
};

const bars = computed(() =>
  order.map((w) => {
    const s = props.wangShuai.scores[w];
    // percentage 可能是 0~1 或 0~100，统一归一到 0~100
    const raw = s ? s.percentage : 0;
    const pct = raw > 1 ? raw : raw * 100;
    return { w, pct: Math.round(pct), level: s ? s.level : "" };
  })
);
</script>

<template>
  <div class="panel wuxing">
    <h2>五行旺衰</h2>
    <p class="meta">
      日主 {{ wangShuai.ri_zhu_level }} · 得令 {{ wangShuai.ri_zhu_de_ling ? "是" : "否" }} ·
      最旺 {{ wangShuai.strongest }} / 最弱 {{ wangShuai.weakest }}
    </p>
    <div class="bars">
      <div class="bar-row" v-for="b in bars" :key="b.w">
        <span class="bar-label" :style="{ color: colors[b.w] }">{{ b.w }}</span>
        <div class="bar-track">
          <div
            class="bar-fill"
            :style="{ width: b.pct + '%', background: colors[b.w] }"
          ></div>
        </div>
        <span class="bar-pct">{{ b.pct }}%</span>
      </div>
    </div>
  </div>
</template>
