<script setup lang="ts">
import { computed } from "vue";
import type { AiWangShuai, WangShuaiVerdict } from "../types/aiReport";

const props = defineProps<{
  wangShuai: AiWangShuai;
  verdict: WangShuaiVerdict;
}>();

const order = ["木", "火", "土", "金", "水"];
const colors: Record<string, string> = {
  木: "var(--c-mu)",
  火: "var(--c-huo)",
  土: "var(--c-tu)",
  金: "var(--c-jin)",
  水: "var(--c-shui)",
};

// 只展示定性等级：schema v1.1 已不再输出 score / percentage，界面也不做数值进度条。
const elements = computed(() =>
  order.map((w) => ({
    w,
    color: colors[w],
    level: props.wangShuai.scores[w]?.level ?? "—",
    strongest: props.wangShuai.strongest === w,
    weakest: props.wangShuai.weakest === w,
  })),
);

const flags = computed(() => [
  { label: "得令", ok: props.verdict.de_ling ?? props.wangShuai.ri_zhu_de_ling ?? false },
  { label: "得地", ok: props.verdict.de_di },
  { label: "得生", ok: props.verdict.de_sheng },
  { label: "得势", ok: props.verdict.de_shi },
]);

// level_derivation 为 v1.1 主字段；evidence 仅作旧引擎兜底。
const evidence = computed(() => {
  const derivation = props.verdict.level_derivation ?? [];
  return derivation.length ? derivation : (props.verdict.evidence ?? []);
});

const weightNote = computed(
  () =>
    props.wangShuai.scores_note ||
    "五行占比为引擎内部权重折算，未经验证，仅决定相对等级；不在界面展示数值。",
);
</script>

<template>
  <div class="panel wuxing">
    <h2>五行旺衰 · 日主裁决</h2>

    <div class="verdict">
      <div class="verdict-main">
        <span class="verdict-label">日主裁决</span>
        <span class="verdict-value">{{ verdict.verdict }}</span>
        <span class="verdict-tag">统一裁决值</span>
      </div>
      <p class="verdict-sub">
        月令状态 {{ verdict.month_state || "—" }} · 月支本气
        {{ verdict.month_benqi_shen || "—" }} · 置信度 {{ verdict.confidence || "—" }}
      </p>
      <p class="verdict-sub" v-if="wangShuai.level_source">
        裁决来源：{{ wangShuai.level_source }}
      </p>
    </div>

    <div class="elements">
      <div class="element" v-for="e in elements" :key="e.w">
        <span class="el-name" :style="{ color: e.color }">{{ e.w }}</span>
        <span class="el-level">{{ e.level }}</span>
        <span v-if="e.strongest" class="el-badge">最旺</span>
        <span v-else-if="e.weakest" class="el-badge weak">最弱</span>
      </div>
    </div>

    <div class="flags">
      <span
        v-for="f in flags"
        :key="f.label"
        class="flag"
        :class="f.ok ? 'flag-yes' : 'flag-no'"
      >
        {{ f.label }}：{{ f.ok ? "是" : "否" }}
      </span>
    </div>

    <h3>裁决证据（逐条推导）</h3>
    <ul class="evidence">
      <li v-for="(line, i) in evidence" :key="i">{{ line }}</li>
      <li v-if="!evidence.length" class="muted">引擎未提供推导证据。</li>
    </ul>

    <p class="method" v-if="verdict.method">判定方法：{{ verdict.method }}</p>
    <p class="note">{{ weightNote }}</p>
    <p class="note weight-warn">五行占比为内部权重，未经验证，不作吉凶依据。</p>

    <p class="lim" v-if="verdict.limitations.length">
      局限：{{ verdict.limitations.join("；") }}
    </p>
  </div>
</template>

<style scoped>
.verdict {
  background: #f3f5f9;
  border-radius: 10px;
  padding: 10px 14px;
  margin-bottom: 12px;
}
.verdict-main {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px;
}
.verdict-label {
  color: var(--muted);
  font-size: 13px;
}
.verdict-value {
  font-size: 22px;
  font-weight: 700;
}
.verdict-tag {
  font-size: 11px;
  color: #185fa5;
  background: #e3effc;
  border-radius: 10px;
  padding: 1px 8px;
}
.verdict-sub {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--muted);
}
.elements {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}
.element {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  background: #f8f9fb;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 8px 4px;
}
.el-name {
  font-size: 18px;
  font-weight: 700;
}
.el-level {
  font-size: 12px;
  color: var(--text);
}
.el-badge {
  font-size: 10px;
  color: #185fa5;
  background: #e3effc;
  border-radius: 8px;
  padding: 0 5px;
}
.el-badge.weak {
  color: var(--muted);
  background: #eef0f3;
}
.flags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 12px 0 0;
}
.flag {
  font-size: 12px;
  border-radius: 10px;
  padding: 2px 10px;
  border: 1px solid var(--border);
}
.flag-yes {
  background: #eef2f7;
  color: var(--text);
}
.flag-no {
  background: transparent;
  color: var(--muted);
}
h3 {
  margin: 14px 0 6px;
  font-size: 14px;
  color: var(--muted);
}
.evidence {
  margin: 0;
  padding-left: 18px;
  font-size: 13px;
  line-height: 1.7;
}
.method {
  margin: 10px 0 0;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.6;
}
.note {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.6;
}
.weight-warn {
  padding: 6px 10px;
  border-left: 3px solid #b8860b;
  background: #fbfaf3;
}
.lim {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.6;
}
.muted {
  color: var(--muted);
}
@media (max-width: 760px) {
  .elements {
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 4px;
  }
  .el-name {
    font-size: 16px;
  }
}
</style>
