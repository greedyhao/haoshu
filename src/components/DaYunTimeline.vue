<script setup lang="ts">
import { computed, ref } from "vue";
import type { AiDaYun, AiYearly, SuiYunTrigger } from "../types/aiReport";

const props = defineProps<{
  dayun: AiDaYun | null;
  suiYun: SuiYunTrigger | null;
}>();

// 0 = 全部总览；其余为对应大运 index
const selectedYun = ref(0);

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

// 由起运公历年份推算每个大运的年份区间（每步十年）
const yunRanges = computed(() => {
  if (!props.dayun) return [];
  const base = props.dayun.qi_yun.year;
  return props.dayun.dayun_list.map((d) => {
    const start = base + (d.index - 1) * 10;
    return { index: d.index, startYear: start, endYear: start + 9 };
  });
});

// 某公历年份所属的大运序号（0 表示大运前）
function yunIndexOfYear(year: number): number {
  if (!props.dayun) return 0;
  const base = props.dayun.qi_yun.year;
  if (year < base) return 0;
  let idx = Math.floor((year - base) / 10) + 1;
  const max = props.dayun.dayun_list.length;
  if (idx > max) idx = max;
  return idx;
}

// 按大运分组流年
const yearlyByYun = computed<Record<number, AiYearly[]>>(() => {
  const map: Record<number, AiYearly[]> = {};
  (props.dayun?.yearly ?? []).forEach((y) => {
    const i = yunIndexOfYear(y.year);
    (map[i] ??= []).push(y);
  });
  // 每个大运内按年份升序
  Object.values(map).forEach((arr) => arr.sort((a, b) => a.year - b.year));
  return map;
});

const displayYearly = computed<AiYearly[]>(() => {
  if (selectedYun.value === 0) return props.dayun?.yearly ?? [];
  return yearlyByYun.value[selectedYun.value] ?? [];
});

const currentStep = computed(
  () => props.dayun?.dayun_list.find((d) => d.index === selectedYun.value) ?? null,
);
const currentRange = computed(
  () => yunRanges.value.find((r) => r.index === selectedYun.value) ?? null,
);

function selectYun(i: number) {
  selectedYun.value = i;
}

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

      <!-- 大运步骤（可点击切换流年） -->
      <h3>十年大运（点击查看对应流年）</h3>
      <div class="dayun-row">
        <button class="dayun-step" :class="{ active: selectedYun === 0 }" @click="selectYun(0)">
          <div class="step-idx">全部</div>
          <div class="step-ganzhi">总览</div>
          <div class="step-age">所有流年</div>
        </button>
        <button
          v-for="d in dayun.dayun_list"
          :key="d.index"
          class="dayun-step"
          :class="{ active: d.index === selectedYun }"
          @click="selectYun(d.index)"
        >
          <div class="step-idx">第 {{ d.index }} 运</div>
          <div class="step-ganzhi">{{ d.ganzhi }}</div>
          <div class="step-age">
            <template v-if="d.start_age != null && d.end_age != null">
              {{ d.start_age }}–{{ d.end_age }} 岁
            </template>
            <template v-else>年龄未知</template>
          </div>
        </button>
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

      <!-- 流年（按选中大运过滤） -->
      <h3 v-if="selectedYun === 0">流年（逐年 · 全部大运）</h3>
      <h3 v-else-if="currentStep && currentRange">
        第 {{ currentStep.index }} 运 · {{ currentStep.ganzhi }}
        <span class="sub"
          >（{{ currentRange.startYear }}–{{ currentRange.endYear }} 年 ·
          {{ currentStep.start_age }}–{{ currentStep.end_age }} 岁）</span
        >
      </h3>
      <p v-if="displayYearly.length === 0" class="hint">该大运区间暂无流年数据。</p>
      <div class="yearly-grid">
        <div
          class="yearly"
          v-for="y in displayYearly"
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
.dayun h3 .sub {
  font-size: 12px;
  color: var(--muted);
  font-weight: 400;
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
  border: 1px solid transparent;
  border-radius: 10px;
  padding: 10px 8px;
  text-align: center;
  cursor: pointer;
  font: inherit;
  color: inherit;
  transition: background 0.15s, border-color 0.15s;
}
.dayun-step:hover {
  background: #e9edf3;
}
.dayun-step.active {
  background: #e8f1fb;
  border-color: #185fa5;
  box-shadow: 0 0 0 1px #185fa5 inset;
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
  /* auto-fit 让逐年卡片撑满容器宽度（最后一行无右侧空隙）；auto-fill 会留空列 */
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
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
.hint {
  color: var(--muted);
  font-size: 13px;
}
@media (max-width: 760px) {
  .yearly-grid {
    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  }
  .dayun-step {
    min-width: 76px;
    padding: 8px 6px;
  }
  .step-ganzhi {
    font-size: 17px;
  }
}
</style>
