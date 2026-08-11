<script setup lang="ts">
import type { GeJuResult, TiaoHou, WangShuaiVerdict } from "../types/aiReport";

defineProps<{
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
</script>

<template>
  <div class="geju">
    <!-- 格局 -->
    <div class="panel">
      <h2>格局</h2>
      <div class="row">
        <span class="name">{{ geju.geju }}</span>
        <span class="cat">{{ geju.category }}</span>
        <span :class="geju.is_cheng ? 'ok' : geju.is_po ? 'bad' : 'na'">
          {{ geju.is_cheng ? "成格" : geju.is_po ? "破格" : "未明" }}
        </span>
      </div>
      <p class="reason" v-if="geju.is_cheng && geju.cheng_reason">{{ geju.cheng_reason }}</p>
      <p class="reason" v-if="geju.is_po && geju.po_reason">{{ geju.po_reason }}</p>

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
      <p class="meta">取用五法：{{ geju.qu_yong_fa }}</p>
      <p class="meta">判定：{{ geju.method }} · 置信度 {{ geju.confidence }}</p>
      <p class="conflict" v-if="geju.conflicts.length">
        冲突：{{ geju.conflicts.join("；") }}
      </p>
      <p class="lim" v-if="geju.limitations.length">
        局限：{{ geju.limitations.join("；") }}
      </p>
    </div>

    <!-- 调候 -->
    <div class="panel">
      <h2>调候（穷通宝鉴）</h2>
      <p class="meta">{{ tiaoHou.yue_ling }} 月令 · 气候：<strong>{{ climate(tiaoHou) }}</strong></p>
      <div class="stars">
        <div class="star-block">
          <span class="sl">调候用神</span>
          <span class="chip" v-for="s in tiaoHou.yong_shen" :key="s">{{ s }}</span>
        </div>
      </div>
      <p class="reason">{{ tiaoHou.reason }}</p>
      <p class="meta">来源：{{ tiaoHou.source_book }}</p>
    </div>

    <!-- 旺衰判定 -->
    <div class="panel">
      <h2>旺衰判定</h2>
      <div class="row">
        <span class="name big">{{ verdict.verdict }}</span>
        <span class="meta">综合得分 {{ Math.round(verdict.score) }}</span>
      </div>
      <p class="meta">
        得令（月令）{{ verdict.month_state }} · 月支本气 {{ verdict.month_benqi_shen }} ·
        得地 {{ verdict.de_di ? "是" : "否" }} / 得势 {{ verdict.de_shi ? "是" : "否" }} /
        得生 {{ verdict.de_sheng ? "是" : "否" }}
      </p>
      <p class="meta">判定：{{ verdict.method }} · 置信度 {{ verdict.confidence }}</p>
      <h3>证据</h3>
      <ul class="ev">
        <li v-for="(e, i) in verdict.evidence" :key="i">{{ e }}</li>
      </ul>
      <h3>五行偏颇</h3>
      <div class="dev">
        <span class="chip" v-for="(v, k) in verdict.wuxing_deviation" :key="k">
          {{ k }}：{{ v > 0 ? "+" : "" }}{{ v }}
        </span>
      </div>
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
.ok {
  color: #1e7e34;
  font-size: 13px;
}
.bad {
  color: #c0392b;
  font-size: 13px;
}
.na {
  color: var(--muted);
  font-size: 13px;
}
.reason {
  margin: 8px 0 4px;
  font-size: 13px;
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
}
.chip.xi {
  background: #e8f1fb;
  color: #185fa5;
}
.chip.ji {
  background: #fdeaea;
  color: #c0392b;
}
.meta {
  color: var(--muted);
  font-size: 13px;
  margin: 6px 0 0;
}
.conflict {
  color: #b8860b;
  font-size: 13px;
  margin: 8px 0 0;
}
.lim {
  color: var(--muted);
  font-size: 12px;
  margin: 8px 0 0;
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
.dev {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
</style>
