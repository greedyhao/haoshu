<script setup lang="ts">
import { computed, ref } from "vue";
import type { AiDaYun, AiDaYunStep, AiYearly, SuiYunTrigger } from "../types/aiReport";
import { formatDate, formatDateTime } from "../lib/datetime";

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

const steps = computed<AiDaYunStep[]>(() => props.dayun?.dayun_list ?? []);
const qiyun = computed(() => props.dayun?.qi_yun ?? null);

interface StepRange {
  startYear: number | null;
  endYear: number | null;
}

// 优先用引擎给出的 start_year/end_year；旧数据回退到起运年 + 10 年步长推算。
function yearRangeOf(step: AiDaYunStep): StepRange {
  if (step.start_year != null && step.end_year != null) {
    return { startYear: step.start_year, endYear: step.end_year };
  }
  const base = props.dayun?.qi_yun.year;
  // 直录未知时引擎用 0 表示，不参与年份区间推算。
  if (base != null && base > 0) {
    const start = base + (step.index - 1) * 10;
    return { startYear: start, endYear: start + 9 };
  }
  return { startYear: null, endYear: null };
}

const ranges = computed<Map<number, StepRange>>(() => {
  const map = new Map<number, StepRange>();
  for (const s of steps.value) {
    map.set(s.index, yearRangeOf(s));
  }
  return map;
});

// 某公历年份所属的大运序号：引擎给出 current_dayun_index 时直接用；否则按年份区间，再按干支回退；0 表示大运前。
function yunIndexOfYear(
  year: number,
  currentIndex: number | null | undefined,
  currentDayun: string | null | undefined,
): number {
  if (
    currentIndex != null &&
    currentIndex > 0 &&
    steps.value.some((s) => s.index === currentIndex)
  ) {
    return currentIndex;
  }
  for (const s of steps.value) {
    const r = ranges.value.get(s.index);
    if (r && r.startYear != null && r.endYear != null && year >= r.startYear && year <= r.endYear) {
      return s.index;
    }
  }
  if (currentDayun) {
    const found = steps.value.find((s) => s.ganzhi === currentDayun);
    if (found) return found.index;
  }
  return 0;
}

// 岁运并临：只认真实年份（bing_lin_years 优先，旧数据回退 per_year.is_bing_lin）。
const binglinYears = computed(() => {
  const set = new Set<number>();
  const years = props.suiYun?.bing_lin_years ?? [];
  if (years.length) {
    years.forEach((y) => set.add(y));
  } else {
    (props.suiYun?.per_year ?? []).forEach((y) => {
      if (y.is_bing_lin) set.add(y.year);
    });
  }
  return set;
});

const notableYears = computed(() => {
  const set = new Set<number>();
  (props.suiYun?.notable_years ?? []).forEach((y) => set.add(y));
  return set;
});

const taiSuiYears = computed(() => {
  const set = new Set<number>();
  (props.suiYun?.tai_sui_chong_years ?? []).forEach((y) => set.add(y));
  return set;
});

// 按大运分组流年
const yearlyByYun = computed<Record<number, AiYearly[]>>(() => {
  const map: Record<number, AiYearly[]> = {};
  for (const y of props.dayun?.yearly ?? []) {
    const i = yunIndexOfYear(y.year, y.current_dayun_index, y.current_dayun);
    (map[i] ??= []).push(y);
  }
  Object.values(map).forEach((arr) => arr.sort((a, b) => a.year - b.year));
  return map;
});

const displayYearly = computed<AiYearly[]>(() => {
  if (selectedYun.value === 0) return props.dayun?.yearly ?? [];
  return yearlyByYun.value[selectedYun.value] ?? [];
});

// 关系文案可能重复出现（如 午破卯 出现两次），去重后再渲染，避免 Vue 重复 key。
function unique(list: string[]): string[] {
  return Array.from(new Set(list));
}

interface YearRow {
  year: number;
  ganzhi: string;
  ganWuxing: string;
  currentDayun: string;
  isBingLin: boolean;
  isNotable: boolean;
  isTaiSuiChong: boolean;
  yuanJu: string[];
  dayunRelations: string[];
  ganRelations: string[];
  signals: string[];
}

const displayRows = computed<YearRow[]>(() =>
  displayYearly.value.map((y) => {
    const i = yunIndexOfYear(y.year, y.current_dayun_index, y.current_dayun);
    const step = steps.value.find((s) => s.index === i);
    return {
      year: y.year,
      ganzhi: y.ganzhi,
      ganWuxing: y.gan_wuxing,
      currentDayun: y.current_dayun ?? step?.ganzhi ?? "—",
      isBingLin: binglinYears.value.has(y.year),
      isNotable: notableYears.value.has(y.year),
      isTaiSuiChong: taiSuiYears.value.has(y.year),
      yuanJu: unique(y.yuan_ju_relations ?? []),
      dayunRelations: unique(y.dayun_relations ?? []),
      ganRelations: unique(y.gan_relations ?? []),
      signals: unique(y.signals ?? []),
    };
  }),
);

const currentStep = computed(
  () => steps.value.find((d) => d.index === selectedYun.value) ?? null,
);
const taiSuiTargets = computed(() => props.suiYun?.tai_sui_chong_targets ?? []);
const bingLinList = computed(() => Array.from(binglinYears.value).sort((a, b) => a - b));
const notableList = computed(() => Array.from(notableYears.value).sort((a, b) => a - b));
const taiSuiYearList = computed(() => Array.from(taiSuiYears.value).sort((a, b) => a - b));
const notableNote = computed(
  () =>
    props.suiYun?.notable_note ||
    "按原局/大运/天干关系密集度排序，仅提示“变化较多”，非吉凶结论。",
);
const hasSuiYun = computed(() => !!props.suiYun);

function selectYun(i: number) {
  selectedYun.value = i;
}

function wuxingColor(w: string): string {
  return colors[w] ?? "var(--muted)";
}

function ageRangeText(step: AiDaYunStep): string {
  if (step.start_age != null && step.end_age != null) {
    return `${step.start_age}–${step.end_age} 岁`;
  }
  return "年龄未知";
}

function yearRangeText(step: AiDaYunStep): string {
  const r = ranges.value.get(step.index);
  if (r && r.startYear != null && r.endYear != null) {
    return `${r.startYear}–${r.endYear} 年`;
  }
  return "年份未知";
}
</script>

<template>
  <div class="dayun">
    <p v-if="!dayun" class="hint">未排大运（选择了「跳过大运」或直录未提供起运信息）。</p>
    <template v-else>
      <!-- 起运信息：含起运算法与首次交运精确时刻 -->
      <div class="qiyun panel">
        <div class="qiyun-row">
          <span class="label">起运</span>
          <strong>{{ qiyun && qiyun.age > 0 ? qiyun.age + " 岁" : "年龄未知" }}</strong>
          <span class="sep">·</span>
          <span>{{ qiyun && qiyun.year > 0 ? qiyun.year + " 年" : "年份未知" }}</span>
          <span class="sep">·</span>
          <span :class="qiyun?.forward ? 'tag-forward' : 'tag-reverse'">
            {{ qiyun == null ? "—" : qiyun.forward ? "顺排" : "逆排" }}
          </span>
        </div>
        <div class="qiyun-row">
          <span class="label">首次交运</span>
          <strong>{{ formatDateTime(qiyun?.jiao_yun_datetime) }}</strong>
          <span v-if="qiyun?.days_to_term != null" class="sub">
            （距节 {{ qiyun.days_to_term }} 日）
          </span>
        </div>
        <p class="qiyun-algo" v-if="qiyun?.algorithm">起运算法：{{ qiyun.algorithm }}</p>
        <p class="note" v-if="dayun.note">{{ dayun.note }}</p>
      </div>

      <!-- 大运步骤（可点击切换流年）：显示年龄/年份区间 + 交运日期 -->
      <h3>十年大运（点击查看对应流年）</h3>
      <div class="dayun-row">
        <button class="dayun-step" :class="{ active: selectedYun === 0 }" @click="selectYun(0)">
          <div class="step-idx">全部</div>
          <div class="step-ganzhi">总览</div>
          <div class="step-age">所有流年</div>
        </button>
        <button
          v-for="d in steps"
          :key="d.index"
          class="dayun-step"
          :class="{ active: d.index === selectedYun }"
          @click="selectYun(d.index)"
        >
          <div class="step-idx">第 {{ d.index }} 运</div>
          <div class="step-ganzhi">{{ d.ganzhi }}</div>
          <div class="step-age">{{ ageRangeText(d) }}</div>
          <div class="step-year">{{ yearRangeText(d) }}</div>
          <div class="step-jiao" v-if="d.jiao_yun_datetime">
            交运 {{ formatDate(d.jiao_yun_datetime) }}
          </div>
        </button>
      </div>

      <!-- 岁运引动摘要：只陈述关系，不作吉凶定论 -->
      <div v-if="hasSuiYun" class="suiyun panel">
        <h4>岁运引动（关系提示，非吉凶）</h4>
        <ul class="suiyun-list">
          <li v-if="taiSuiTargets.length">太岁冲（{{ taiSuiYearList.join("、") }}）：{{ taiSuiTargets.join("、") }}</li>
          <li v-if="bingLinList.length">
            岁运并临（流年干支同大运）：{{ bingLinList.join("、") }}
          </li>
          <li v-if="notableList.length">
            关系较多之年（非吉凶）：{{ notableList.join("、") }}
          </li>
        </ul>
        <p class="suiyun-note">{{ notableNote }}</p>
      </div>

      <!-- 流年（按选中大运过滤） -->
      <h3 v-if="selectedYun === 0">流年（逐年 · 全部大运）</h3>
      <h3 v-else-if="currentStep">
        第 {{ currentStep.index }} 运 · {{ currentStep.ganzhi }}
        <span class="sub">
          （{{ yearRangeText(currentStep) }} · {{ ageRangeText(currentStep) }}）
        </span>
      </h3>
      <p v-if="displayRows.length === 0" class="hint">该大运区间暂无流年数据。</p>
      <div class="yearly-grid">
        <div
          class="yearly"
          v-for="y in displayRows"
          :key="y.year"
          :class="{ 'is-binglin': y.isBingLin, 'is-notable': y.isNotable && !y.isBingLin }"
        >
          <div class="year-head">
            <span class="yr">{{ y.year }}</span>
            <span class="gz" :style="{ color: wuxingColor(y.ganWuxing) }">{{ y.ganzhi }}</span>
          </div>
          <div class="year-meta">
            <span class="yun-chip">大运 {{ y.currentDayun }}</span>
            <span v-if="y.isBingLin" class="rel warn">岁运并临</span>
            <span v-if="y.isNotable" class="rel note">关系较多之年（非吉凶）</span>
            <span v-if="y.isTaiSuiChong" class="rel">太岁冲原局</span>
          </div>
          <div class="rel-group" v-if="y.yuanJu.length">
            <span class="rel-label">原局</span>
            <span class="rel" v-for="r in y.yuanJu" :key="'y' + r">{{ r }}</span>
          </div>
          <div class="rel-group" v-if="y.dayunRelations.length">
            <span class="rel-label">大运</span>
            <span class="rel" v-for="r in y.dayunRelations" :key="'d' + r">{{ r }}</span>
          </div>
          <div class="rel-group" v-if="y.ganRelations.length">
            <span class="rel-label">天干</span>
            <span class="rel" v-for="r in y.ganRelations" :key="'g' + r">{{ r }}</span>
          </div>
          <div class="rel-group" v-if="y.signals.length">
            <span class="rel-label">信号</span>
            <span class="rel signal" v-for="s in y.signals" :key="'s' + s">{{ s }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.qiyun {
  display: block;
  margin-bottom: 16px;
  padding: 12px 16px;
}
.qiyun-row {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 4px;
}
.qiyun .label {
  color: var(--muted);
}
.qiyun .sep {
  color: var(--border);
}
.qiyun .sub,
.qiyun .note {
  color: var(--muted);
  font-size: 12px;
}
.qiyun-algo {
  margin: 4px 0 0;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.6;
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
  background: #f6efe0;
  color: #8a5b00;
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
  min-width: 96px;
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
.step-age,
.step-year,
.step-jiao {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.5;
}
.step-jiao {
  margin-top: 2px;
  font-size: 11px;
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
.suiyun-note {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.6;
}
.yearly-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 10px;
}
.yearly {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px;
  background: var(--panel);
}
.yearly.is-binglin {
  border-color: #185fa5;
  box-shadow: 0 0 0 1px #185fa5 inset;
}
.yearly.is-notable {
  border-style: dashed;
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
.year-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin: 6px 0;
}
.yun-chip {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 8px;
  background: #eef2f7;
  color: var(--text);
}
.rel-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
}
.rel-label {
  font-size: 10px;
  color: var(--muted);
}
.rel {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 8px;
  background: #eef2f7;
  color: var(--muted);
}
.rel.warn {
  background: #fcf3df;
  color: #8a5b00;
}
.rel.note {
  background: #eef0f3;
  color: var(--muted);
}
.rel.signal {
  background: #e8f1fb;
  color: #185fa5;
}
.hint {
  color: var(--muted);
  font-size: 13px;
}
@media (max-width: 760px) {
  .yearly-grid {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  }
  .dayun-step {
    min-width: 84px;
    padding: 8px 6px;
  }
  .step-ganzhi {
    font-size: 17px;
  }
}
</style>
