<script setup lang="ts">
import { computed } from "vue";
import type { GeJuResult, TiaoHou, WangShuaiVerdict } from "../types/aiReport";

const props = defineProps<{
  geju: GeJuResult;
  tiaoHou: TiaoHou;
  verdict: WangShuaiVerdict;
}>();

function climate(t: TiaoHou): string {
  if (t.is_cold) return "寒";
  if (t.is_hot) return "热";
  if (t.is_dry) return "燥";
  if (t.is_wet) return "湿";
  return "平";
}

// 破格程度：v1.1 用 po_level（未破/轻破/重破）；旧数据回退为二元状态。
const poLevelText = computed(() => {
  if (props.geju.po_level) return props.geju.po_level;
  return props.geju.is_po ? "破格" : "未破";
});

// 真实样例存在 is_po=false 但 po_level="轻破" 的分级描述：等级非「未破」即展示证据。
const poActive = computed(() => {
  const level = props.geju.po_level;
  if (level && level !== "未破") return true;
  return props.geju.is_po;
});

const poEvalItems = computed(() => {
  const e = props.geju.po_eval;
  if (!e) return [];
  return [
    { k: "月令被冲", v: e.month_ling_clashed ? "是" : "否" },
    { k: "冲况", v: e.clash_detail || "—" },
    { k: "用神透干", v: e.yong_shen_tou_gan ? "是" : "否" },
    { k: "解救", v: e.rescue || "—" },
    { k: "结论", v: e.conclusion || "—" },
  ];
});

// 多流派用神裁决（v1.1 新增）；旧数据缺失时整块隐藏。
const resolution = computed(() => props.geju.yong_shen_resolution ?? null);
const resolutionSchools = computed(() => resolution.value?.schools ?? []);
const resolutionPriority = computed(() => resolution.value?.priority ?? []);
const resolutionDecision = computed(() => resolution.value?.decision ?? "");
const resolutionReason = computed(() => resolution.value?.reason ?? "");
const resolutionDisclaimer = computed(
  () =>
    resolution.value?.disclaimer ||
    "用神体系互有分歧，以上为并列与裁决理由，非唯一结论。",
);

// 旺衰证据：v1.1 用 level_derivation；旧数据回退 evidence。
const verdictEvidence = computed(() => {
  const derivation = props.verdict.level_derivation ?? [];
  return derivation.length ? derivation : (props.verdict.evidence ?? []);
});

const verdictFlags = computed(() => [
  { label: "得令", ok: props.verdict.de_ling ?? false },
  { label: "得地", ok: props.verdict.de_di },
  { label: "得生", ok: props.verdict.de_sheng },
  { label: "得势", ok: props.verdict.de_shi },
]);
</script>

<template>
  <div class="geju">
    <!-- 格局 -->
    <div class="panel">
      <h2>格局</h2>
      <div class="row">
        <span class="name">{{ geju.geju }}</span>
        <span class="cat">{{ geju.category }}</span>
        <span v-if="geju.is_cheng" class="state cheng">成格</span>
        <span v-if="poActive" class="state po">{{ poLevelText }}</span>
        <span v-if="!geju.is_cheng && !poActive" class="state na">未明</span>
      </div>
      <p class="reason" v-if="geju.is_cheng && geju.cheng_reason">{{ geju.cheng_reason }}</p>

      <!-- 破格/轻破：po_level + po_eval 证据（不作吉凶定论） -->
      <template v-if="poActive">
        <p class="reason">
          破格等级：<b>{{ poLevelText }}</b>
          <span class="muted">（分级描述格局成立度，不作吉凶定论）</span>
        </p>
        <p class="reason" v-if="geju.po_reason">{{ geju.po_reason }}</p>
        <ul class="po-eval" v-if="poEvalItems.length">
          <li v-for="it in poEvalItems" :key="it.k">
            <span class="po-k">{{ it.k }}</span>{{ it.v }}
          </li>
        </ul>
      </template>

      <div class="stars">
        <div class="star-block">
          <span class="sl">用神</span>
          <span class="chip" v-for="s in geju.yong_shen" :key="s">{{ s }}</span>
        </div>
        <div class="star-block">
          <span class="sl">喜神</span>
          <span class="chip xi" v-for="s in geju.xi_shen" :key="s">{{ s }}</span>
        </div>
        <div class="star-block">
          <span class="sl">忌神</span>
          <span class="chip ji" v-for="s in geju.ji_shen" :key="s">{{ s }}</span>
        </div>
      </div>
      <p class="meta" v-if="geju.yong_shen_gan.length">
        用神天干建议：{{ geju.yong_shen_gan.join("、") }}
      </p>
      <p class="meta">取用五法：{{ geju.qu_yong_fa }}</p>
      <p class="meta">判定：{{ geju.method }} · 置信度 {{ geju.confidence }}</p>
      <p class="conflict" v-if="geju.conflicts.length">体系差异：{{ geju.conflicts.join("；") }}</p>
      <p class="lim" v-if="geju.limitations.length">局限：{{ geju.limitations.join("；") }}</p>
    </div>

    <!-- 用神流派裁决 -->
    <div class="panel" v-if="resolutionSchools.length || resolutionDecision">
      <h2>用神流派裁决</h2>
      <div class="schools">
        <div class="school" v-for="s in resolutionSchools" :key="s.school">
          <div class="school-head">
            <b>{{ s.school }}</b>
            <span class="chip" v-for="y in s.yong_shen" :key="y">{{ y }}</span>
          </div>
          <p class="basis">依据：{{ s.basis }}</p>
        </div>
      </div>
      <p class="meta" v-if="resolutionPriority.length">
        优先级：
        <span class="chip" v-for="p in resolutionPriority" :key="p">{{ p }}</span>
      </p>
      <p class="decision" v-if="resolutionDecision"><b>裁决：</b>{{ resolutionDecision }}</p>
      <p class="reason" v-if="resolutionReason">理由：{{ resolutionReason }}</p>
      <p class="disclaimer" v-if="resolutionDisclaimer">免责：{{ resolutionDisclaimer }}</p>
    </div>

    <!-- 调候 -->
    <div class="panel">
      <h2>调候（穷通宝鉴）</h2>
      <p class="meta">
        {{ tiaoHou.yue_ling }} 月令 · 气候：<strong>{{ climate(tiaoHou) }}</strong>
      </p>
      <p class="meta" v-if="tiaoHou.status">取用状态：{{ tiaoHou.status }}</p>
      <div class="stars">
        <div class="star-block">
          <span class="sl">调候用神</span>
          <span class="chip" v-for="s in tiaoHou.yong_shen" :key="s">{{ s }}</span>
        </div>
      </div>
      <p class="reason">{{ tiaoHou.reason }}</p>
      <p class="meta">来源：{{ tiaoHou.source_book }}</p>
    </div>

    <!-- 旺衰判定（统一裁决，不再展示综合得分） -->
    <div class="panel">
      <h2>旺衰判定</h2>
      <div class="row">
        <span class="name big">{{ verdict.verdict }}</span>
        <span class="muted">统一裁决值（与「五行旺衰」页一致）</span>
      </div>
      <div class="flags">
        <span v-for="f in verdictFlags" :key="f.label" class="flag">
          {{ f.label }}：{{ f.ok ? "是" : "否" }}
        </span>
      </div>
      <p class="meta">
        月令状态 {{ verdict.month_state || "—" }} · 月支本气
        {{ verdict.month_benqi_shen || "—" }}
      </p>
      <p class="meta">判定：{{ verdict.method }} · 置信度 {{ verdict.confidence }}</p>
      <h3>裁决证据（逐条推导）</h3>
      <ul class="ev">
        <li v-for="(e, i) in verdictEvidence" :key="i">{{ e }}</li>
      </ul>
      <p class="lim">
        说明：五行偏颇的数值为引擎内部权重，未经验证，不作吉凶依据；定性等级见「五行旺衰」页。
      </p>
      <p class="lim" v-if="verdict.limitations.length">
        局限：{{ verdict.limitations.join("；") }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.name {
  font-size: 18px;
  font-weight: 700;
}
.name.big {
  font-size: 22px;
}
.cat {
  color: var(--muted);
  font-size: 13px;
}
.state {
  font-size: 12px;
  border-radius: 10px;
  padding: 1px 9px;
}
.state.cheng {
  background: #e8f1fb;
  color: #185fa5;
}
.state.po {
  background: #f6efe0;
  color: #8a5b00;
}
.state.na {
  background: #eef0f3;
  color: var(--muted);
}
.reason {
  margin: 8px 0 4px;
  font-size: 13px;
  line-height: 1.7;
}
.po-eval {
  margin: 6px 0 4px;
  padding-left: 18px;
  font-size: 13px;
  line-height: 1.8;
}
.po-k {
  display: inline-block;
  min-width: 72px;
  color: var(--muted);
}
.stars {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: 10px 0 4px;
}
.star-block {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.sl {
  color: var(--muted);
  font-size: 13px;
}
.chip {
  display: inline-block;
  padding: 2px 9px;
  background: #eef2f7;
  border-radius: 12px;
  font-size: 13px;
  margin-right: 2px;
}
.chip.xi {
  background: #e8f1fb;
  color: #185fa5;
}
.chip.ji {
  background: #f6efe0;
  color: #8a5b00;
}
.meta {
  color: var(--muted);
  font-size: 13px;
  margin: 6px 0 0;
}
.muted {
  color: var(--muted);
  font-size: 12px;
}
.conflict {
  color: #8a5b00;
  font-size: 13px;
  margin: 8px 0 0;
  line-height: 1.6;
}
.lim {
  color: var(--muted);
  font-size: 12px;
  margin: 8px 0 0;
  line-height: 1.6;
}
.schools {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 8px;
}
.school {
  background: #f8f9fb;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 8px 12px;
}
.school-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 13px;
}
.school-head b {
  font-size: 14px;
}
.basis {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.6;
}
.decision {
  margin: 10px 0 0;
  font-size: 13px;
  line-height: 1.7;
  padding: 8px 12px;
  background: #eef2f7;
  border-radius: 8px;
}
.disclaimer {
  margin: 10px 0 0;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.6;
  border-top: 1px dashed var(--border);
  padding-top: 8px;
}
.flags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 10px 0 0;
}
.flag {
  font-size: 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 2px 10px;
  color: var(--text);
}
h3 {
  margin: 14px 0 6px;
  font-size: 14px;
  color: var(--muted);
}
.ev {
  margin: 0;
  padding-left: 18px;
  font-size: 13px;
  line-height: 1.7;
}
</style>
