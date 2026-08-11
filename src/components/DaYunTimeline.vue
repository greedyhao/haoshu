<script setup lang="ts">
import { computed } from "vue";
import type { AiDaYun, SuiYunTrigger } from "../types/aiReport";

const props = defineProps<{
  dayun: AiDaYun | null;
  suiYun: SuiYunTrigger | null;
}>();

const colors: Record<string, string> = {
  木: "var(--c-mu)",
  火: "var(--c-huo)",
  土: "var(--c-tu)",
  金: "var(--c-jin)",
  水: "var(--c-shui)",
};

const chongYears = computed(() => {
  const s = new Set<number>();
  (props.suiYun?.per_year ?? []).forEach((y) => {
    if (y.is_tai_sui_chong) s.add(y.year);
  });
  return s;
});
const binglinYears = computed(() => {
  const s = new Set<number>();
  (props.suiYun?.per_year ?? []).forEach((y) => {
    if (y.is_bing_lin) s.add(y.year);
  });
  return s;
});
const triggerYears = computed(() => new Set(props.suiYun?.strong_trigger_years ?? []));

function wuxingColor(w: string): string {
  return colors[w] ?? "var(--muted)";
}
</script>

<template>
  <div class="dayun">
    <p v-if="!dayun" class="hint">未排大运（选择了「跳过大运」）。</p>
    <template v-else>
      <!-- 起运信息 -->
      <div class="qiyun panel">
        <span class="label">起运</span>
        <strong>{{ dayun.qi_yun.age }} 岁</strong>
        <span class="sep">·</span>
        <span>{{ dayun.qi_yun.year }} 年</span>
        <span class="sep">·</span>
        <span :class="dayun.qi_yun.forward ? 'tag-forward' : 'tag-reverse'">
          {{ dayun.qi_yun.forward ? "顺排" : "逆排" }}
        </span>
        <span v-if="dayun.note" class="note">（{{ dayun.note }}）</span>
      </div>

      <!-- 大运步骤 -->
      <h3>十年大运</h3>
      <div class="dayun-row">
        <div class="dayun-step" v-for="d in dayun.dayun_list" :key="d.index">
          <div class="step-idx">第 {{ d.index }} 运</div>
          <div class="step-ganzhi">{{ d.ganzhi }}</div>
          <div class="step-age">
            <template v-if="d.start_age != null && d.end_age != null">
              {{ d.start_age }}–{{ d.end_age }} 岁
            </template>
            <template v-else>年龄未知</template>
          </div>
        </div>
      </div>

      <!-- 岁运引动摘要 -->
      <div v-if="suiYun" class="suiyun panel">
        <h4>岁运引动</h4>
        <ul class="suiyun-list">
          <li v-if="suiYun.is_tai_sui_chong">
            太岁冲：<span class="hl-bad">{{ suiYun.tai_sui_targets.join("、") }}</span>
          </li>
          <li v-if="suiYun.is_sui_yun_bing_lin">
            岁运并临：<span class="hl-warn">{{ suiYun.bing_lin_example ?? "是" }}</span>
          </li>
          <li v-if="suiYun.dark_chong.length">
            暗冲引动：{{ suiYun.dark_chong.join("、") }}
          </li>
          <li v-if="suiYun.strong_trigger_years.length">
            强触发年（易应事）：<span class="hl-good">{{
              suiYun.strong_trigger_years.join("、")
            }}</span>
          </li>
        </ul>
      </div>

      <!-- 流年 -->
      <h3>流年（逐年）</h3>
      <div class="yearly-grid">
        <div
          class="yearly"
          v-for="y in dayun.yearly"
          :key="y.year"
          :class="{
            'is-trigger': triggerYears.has(y.year),
            'is-chong': chongYears.has(y.year),
            'is-binglin': binglinYears.has(y.year),
          }"
        >
          <div class="year-head">
            <span class="yr">{{ y.year }}</span>
            <span class="gz" :style="{ color: wuxingColor(y.gan_wuxing) }">{{ y.ganzhi }}</span>
          </div>
          <div class="wave-track">
            <div
              class="wave-fill"
              :style="{ width: y.fluctuation + '%', background: wuxingColor(y.gan_wuxing) }"
            ></div>
          </div>
          <div class="yr-rel">
            <span v-if="chongYears.has(y.year)" class="rel bad">冲太岁</span>
            <span v-if="binglinYears.has(y.year)" class="rel warn">岁运并临</span>
            <span v-for="r in y.relations" :key="r" class="rel">{{ r }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.qiyun {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
  padding: 12px 16px;
}
.qiyun .label {
  color: var(--muted);
}
.qiyun .sep {
  color: var(--border);
}
.qiyun .note {
  color: var(--muted);
  font-size: 12px;
}
.tag-forward,
.tag-reverse {
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 12px;
}
.tag-forward {
  background: #e8f1fb;
  color: #185fa5;
}
.tag-reverse {
  background: #fdeaea;
  color: #c0392b;
}
.dayun h3 {
  margin: 18px 0 10px;
  font-size: 15px;
}
.dayun-row {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 6px;
}
.dayun-step {
  flex: 0 0 auto;
  min-width: 84px;
  background: #f3f5f9;
  border-radius: 10px;
  padding: 10px 8px;
  text-align: center;
}
.step-idx {
  font-size: 12px;
  color: var(--muted);
}
.step-ganzhi {
  font-size: 19px;
  font-weight: 700;
  letter-spacing: 2px;
  margin: 4px 0;
}
.step-age {
  font-size: 12px;
  color: var(--muted);
}
.suiyun {
  margin: 16px 0;
  padding: 12px 16px;
  background: #fbfaf3;
}
.suiyun h4 {
  margin: 0 0 6px;
  font-size: 14px;
}
.suiyun-list {
  margin: 0;
  padding-left: 18px;
  font-size: 13px;
  line-height: 1.8;
}
.hl-bad {
  color: #c0392b;
  font-weight: 600;
}
.hl-warn {
  color: #b8860b;
  font-weight: 600;
}
.hl-good {
  color: #1e7e34;
  font-weight: 600;
}
.yearly-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
}
.yearly {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px;
  background: var(--panel);
}
.yearly.is-trigger {
  border-color: #1e7e34;
  box-shadow: 0 0 0 1px #1e7e34 inset;
}
.yearly.is-chong {
  border-color: #c0392b;
}
.yearly.is-binglin {
  border-color: #b8860b;
}
.year-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.yr {
  font-size: 12px;
  color: var(--muted);
}
.gz {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 1px;
}
.wave-track {
  height: 6px;
  background: #eef0f3;
  border-radius: 3px;
  overflow: hidden;
  margin: 8px 0 6px;
}
.wave-fill {
  height: 100%;
  border-radius: 3px;
}
.yr-rel {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.rel {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 8px;
  background: #eef2f7;
  color: var(--muted);
}
.rel.bad {
  background: #fdeaea;
  color: #c0392b;
}
.rel.warn {
  background: #fcf3df;
  color: #b8860b;
}
</style>
