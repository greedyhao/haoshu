<script setup lang="ts">
import type { AiReport } from "../types/aiReport";
import BaziCard from "../components/BaziCard.vue";
import WuXingChart from "../components/WuXingChart.vue";
import ShiShenTable from "../components/ShiShenTable.vue";
import ShenShaSection from "../components/ShenShaSection.vue";

defineProps<{ report: AiReport }>();
</script>

<template>
  <div class="result">
    <BaziCard :bazi="report.bazi" />
    <div class="grid-2">
      <WuXingChart :wang-shuai="report.wang_shuai" />
      <ShiShenTable :shi-shen="report.bazi.shi_shen" />
    </div>
    <ShenShaSection :shensha="report.shensha" />
  </div>
</template>
