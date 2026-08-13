<script setup lang="ts">
import { ref, onMounted } from "vue";
import InputView from "./views/InputView.vue";
import ResultView from "./views/ResultView.vue";
import type { AiReport } from "./types/aiReport";
import { analyze, type AnalyzeArgs } from "./lib/tauri";

const result = ref<AiReport | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const lastArgs = ref<AnalyzeArgs | null>(null);
// 输入侧栏是否收起：小屏（≤760px）默认收起，避免占用结果区空间
const inputCollapsed = ref(false);

onMounted(() => {
  inputCollapsed.value = window.innerWidth <= 760;
});

async function onAnalyze(args: AnalyzeArgs) {
  loading.value = true;
  error.value = null;
  try {
    result.value = await analyze(args);
    lastArgs.value = args;
  } catch (e) {
    error.value = String(e);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="app">
    <header class="app-header">
      <div class="title-col">
        <h1>八字命理分析</h1>
        <p class="subtitle">Tauri 2.0 · Rust 引擎 · Vue 3</p>
      </div>
      <button class="toggle-side" type="button" @click="inputCollapsed = !inputCollapsed">
        {{ inputCollapsed ? "☰ 出生信息" : "✕ 收起输入" }}
      </button>
    </header>
    <main class="app-main" :class="{ collapsed: inputCollapsed }">
      <InputView :loading="loading" @analyze="onAnalyze" />
      <section class="result-area">
        <p v-if="error" class="error">{{ error }}</p>
        <p v-else-if="loading" class="hint">分析中…</p>
        <ResultView v-else-if="result" :report="result" :args="lastArgs" />
        <p v-else class="hint">点击右上角「☰ 出生信息」录入生辰后开始分析。</p>
      </section>
    </main>
  </div>
</template>
