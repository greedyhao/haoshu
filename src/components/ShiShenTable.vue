<script setup lang="ts">
import type { AiShiShen } from "../types/aiReport";

defineProps<{ shiShen: AiShiShen[] }>();
</script>

<template>
  <div class="panel shishen">
    <h2>十神</h2>
    <div class="scroll">
      <table>
        <thead>
          <tr>
            <th>柱</th>
            <th>宫位</th>
            <th>人生阶段</th>
            <th>天干十神</th>
            <th>地支本气</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in shiShen" :key="s.pillar + s.alias">
            <td>{{ s.pillar }}（{{ s.alias }}）</td>
            <td>{{ s.palace }}</td>
            <td>{{ s.life_stage }}</td>
            <td>{{ s.gan_shi_shen }}</td>
            <td>{{ s.zhi_shi_shen }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
