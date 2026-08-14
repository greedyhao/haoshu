<script setup lang="ts">
import { ref } from "vue";
import InputView from "./views/InputView.vue";
import ResultView from "./views/ResultView.vue";
import type { AiReport } from "./types/aiReport";
import { analyze, type AnalyzeArgs } from "./lib/tauri";
import {
  loadHistory,
  saveHistory,
  historyKey,
  genId,
  type HistoryEntry,
} from "./lib/history";

// 页面视图：input（录入）| result（结果）。两步跳转，无折叠开关。
const view = ref<"input" | "result">("input");
const result = ref<AiReport | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const lastArgs = ref<AnalyzeArgs | null>(null);
const history = ref<HistoryEntry[]>(loadHistory());

function scrollTop() {
  window.scrollTo({ top: 0 });
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

async function onAnalyze(args: AnalyzeArgs) {
  loading.value = true;
  error.value = null;
  try {
    const report = await analyze(args);
    result.value = report;
    lastArgs.value = args;
    // 写入历史（同参数去重、最新置顶、上限 50）
    const entry: HistoryEntry = {
      id: genId(),
      ts: Date.now(),
      args,
      bazi:
        report.bazi.year +
        " " +
        report.bazi.month +
        " " +
        report.bazi.day +
        " " +
        report.bazi.hour +
        " · " +
        report.bazi.gender,
      dateLabel:
        pad2(args.year) +
        "-" +
        pad2(args.month) +
        "-" +
        pad2(args.day) +
        " " +
        pad2(args.hour) +
        ":" +
        pad2(args.minute ?? 0),
    };
    const key = historyKey(args);
    history.value = [
      entry,
      ...history.value.filter((e) => historyKey(e.args) !== key),
    ].slice(0, 50);
    saveHistory(history.value);
    view.value = "result";
    scrollTop();
  } catch (e) {
    error.value = String(e);
  } finally {
    loading.value = false;
  }
}

function onDeleteHistory(id: string) {
  history.value = history.value.filter((e) => e.id !== id);
  saveHistory(history.value);
}

function onBackToInput() {
  view.value = "input";
  scrollTop();
}
</script>

<template>
  <div class="app">
    <header class="app-header">
      <div class="title-col">
        <h1>八字命理分析</h1>
        <p class="subtitle">Tauri 2.0 · Rust 引擎 · Vue 3</p>
      </div>
    </header>
    <main class="app-main">
      <p v-if="error" class="error">{{ error }}</p>

      <!-- v-show 保活：从结果页返回时表单内容不丢 -->
      <div v-show="view === 'input'" class="input-page">
        <InputView
          :loading="loading"
          :history="history"
          @analyze="onAnalyze"
          @delete-history="onDeleteHistory"
        />
      </div>

      <section v-show="view === 'result'" class="result-area">
        <p v-if="loading" class="hint">分析中…</p>
        <ResultView
          v-else-if="result"
          :report="result"
          :args="lastArgs"
          @back="onBackToInput"
        />
        <p v-else class="hint">请返回输入页录入生辰。</p>
      </section>
    </main>
  </div>
</template>
