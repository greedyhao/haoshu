<script setup lang="ts">
import { reactive } from "vue";
import type { AnalyzeArgs } from "../lib/tauri";
import type { HistoryEntry } from "../lib/history";

defineProps<{ loading: boolean; history: HistoryEntry[] }>();
const emit = defineEmits<{
  (e: "analyze", args: AnalyzeArgs): void;
  (e: "delete-history", id: string): void;
}>();

const form = reactive({
  year: 1990,
  month: 7,
  day: 15,
  hour: 14,
  minute: 0,
  gender: "male" as "male" | "female",
  isGregorian: true,
  isLeap: false,
  skipDayun: false,
  baziDirect: "",
});

function submit() {
  emit("analyze", {
    year: Number(form.year),
    month: Number(form.month),
    day: Number(form.day),
    hour: Number(form.hour),
    minute: Number(form.minute),
    gender: form.gender,
    isGregorian: form.isGregorian,
    isLeap: form.isLeap,
    skipDayun: form.skipDayun,
    baziDirect: form.baziDirect.trim() || undefined,
    lean: false,
  });
}

// 点击历史记录 → 快速填充表单
function fillFrom(e: HistoryEntry) {
  form.year = e.args.year;
  form.month = e.args.month;
  form.day = e.args.day;
  form.hour = e.args.hour;
  form.minute = e.args.minute ?? 0;
  form.gender = e.args.gender;
  form.isGregorian = e.args.isGregorian ?? true;
  form.isLeap = e.args.isLeap ?? false;
  form.skipDayun = e.args.skipDayun ?? false;
  form.baziDirect = e.args.baziDirect ?? "";
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  const now = new Date();
  const hm = pad(d.getHours()) + ":" + pad(d.getMinutes());
  if (d.toDateString() === now.toDateString()) return "今天 " + hm;
  const md = pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  if (d.getFullYear() === now.getFullYear()) return md + " " + hm;
  return d.getFullYear() + "-" + md + " " + hm;
}
</script>

<template>
  <div class="panel input-view">
    <h2>出生信息</h2>
    <label>年 <input type="number" v-model="form.year" /></label>
    <label>月 <input type="number" v-model="form.month" min="1" max="12" /></label>
    <label>日 <input type="number" v-model="form.day" min="1" max="31" /></label>
    <label>时 <input type="number" v-model="form.hour" min="0" max="23" /></label>
    <label>分 <input type="number" v-model="form.minute" min="0" max="59" /></label>

    <div class="row">
      <span>历法</span>
      <label><input type="radio" :value="true" v-model="form.isGregorian" /> 公历</label>
      <label><input type="radio" :value="false" v-model="form.isGregorian" /> 农历</label>
    </div>
    <div class="row">
      <span>性别</span>
      <label><input type="radio" value="male" v-model="form.gender" /> 男</label>
      <label><input type="radio" value="female" v-model="form.gender" /> 女</label>
    </div>

    <label class="check"><input type="checkbox" v-model="form.isLeap" /> 闰月</label>
    <label class="check"
      ><input type="checkbox" v-model="form.skipDayun" /> 快速模式（跳过大运流年）</label
    >

    <label class="full"
      >直接八字（可选）
      <input type="text" v-model="form.baziDirect" placeholder="庚午 癸未 辛巳 乙未" />
    </label>

    <button :disabled="loading" @click="submit">
      {{ loading ? "分析中…" : "开始分析" }}
    </button>
  </div>

  <!-- 历史记录：点击快速填充，× 删除 -->
  <div v-if="history.length" class="panel history-panel">
    <div class="history-head">
      <h2>历史记录</h2>
      <span class="hint">点击回填表单</span>
    </div>
    <ul class="history-list">
      <li v-for="e in history" :key="e.id" class="history-item">
        <button class="history-fill" type="button" @click="fillFrom(e)">
          <span class="history-bazi">{{ e.bazi }}</span>
          <span class="history-meta">{{ e.dateLabel }} · {{ formatTime(e.ts) }}</span>
        </button>
        <button
          class="history-del"
          type="button"
          title="删除该记录"
          @click="emit('delete-history', e.id)"
        >
          ×
        </button>
      </li>
    </ul>
  </div>
</template>
