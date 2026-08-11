<script setup lang="ts">
import { ref } from "vue";
import type { AiReport } from "../types/aiReport";
import BaziCard from "../components/BaziCard.vue";
import WuXingChart from "../components/WuXingChart.vue";
import ShiShenTable from "../components/ShiShenTable.vue";
import ShenShaSection from "../components/ShenShaSection.vue";
import DaYunTimeline from "../components/DaYunTimeline.vue";
import GeJuSection from "../components/GeJuSection.vue";
import FenKeSection from "../components/FenKeSection.vue";
import XingQingSection from "../components/XingQingSection.vue";
import LianDongSection from "../components/LianDongSection.vue";
import ClassicsSection from "../components/ClassicsSection.vue";

defineProps<{ report: AiReport }>();
const active = ref("overview");

const tabs = [
  { key: "overview", label: "概览" },
  { key: "dayun", label: "大运流年" },
  { key: "geju", label: "格局调候" },
  { key: "fenke", label: "分科专项" },
  { key: "xingqing", label: "性情" },
  { key: "liandong", label: "联动研判" },
  { key: "classics", label: "典籍溯源" },
];
</script>

<template>
  <div class="result">
    <BaziCard :bazi="report.bazi" />

    <div class="tabs">
      <button
        v-for="t in tabs"
        :key="t.key"
        :class="['tab', { active: active === t.key }]"
        @click="active = t.key"
      >
        {{ t.label }}
      </button>
    </div>

    <!-- 概览 -->
    <div v-show="active === 'overview'">
      <div class="grid-2">
        <WuXingChart :wang-shuai="report.wang_shuai" />
        <ShiShenTable :shi-shen="report.bazi.shi_shen" />
      </div>
      <ShenShaSection :shensha="report.shensha" />
    </div>

    <!-- 大运流年 -->
    <div v-show="active === 'dayun'">
      <DaYunTimeline :dayun="report.dayun" :sui-yun="report.sui_yun" />
    </div>

    <!-- 格局调候 -->
    <div v-show="active === 'geju'">
      <GeJuSection :geju="report.geju" :tiao-hou="report.tiao_hou" :verdict="report.wang_shuai_verdict" />
    </div>

    <!-- 分科专项 -->
    <div v-show="active === 'fenke'">
      <FenKeSection :fen-ke="report.fen_ke" />
    </div>

    <!-- 性情 -->
    <div v-show="active === 'xingqing'">
      <XingQingSection :xing-qing="report.xing_qing" />
    </div>

    <!-- 联动研判 -->
    <div v-show="active === 'liandong'">
      <LianDongSection :lian-dong="report.lian_dong" />
    </div>

    <!-- 典籍溯源 -->
    <div v-show="active === 'classics'">
      <ClassicsSection :classics="report.classics" :golden-cases="report.golden_cases" />
    </div>
  </div>
</template>

<style scoped>
.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 16px 0;
  position: sticky;
  top: 0;
  background: var(--bg);
  padding: 8px 0;
  z-index: 5;
}
.tab {
  border: 1px solid var(--border);
  background: var(--panel);
  border-radius: 18px;
  padding: 6px 16px;
  font-size: 14px;
  cursor: pointer;
  color: var(--text);
}
.tab.active {
  background: #185fa5;
  border-color: #185fa5;
  color: #fff;
}
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.grid-2 .panel {
  margin-bottom: 0;
}
@media (max-width: 760px) {
  .grid-2 {
    grid-template-columns: 1fr;
  }
}
</style>
