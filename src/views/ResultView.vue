<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick } from "vue";
import type { AiReport } from "../types/aiReport";
import type { AnalyzeArgs } from "../lib/tauri";
import { export_ai, type ExportMode } from "../lib/tauri";
import { saveExportFile } from "../lib/saveExport";
import { renderMarkdown } from "../lib/markdown";
import BaziCard from "../components/BaziCard.vue";
import WuXingChart from "../components/WuXingChart.vue";
import ShiShenTable from "../components/ShiShenTable.vue";
import ShenShaSection from "../components/ShenShaSection.vue";
import DaYunTimeline from "../components/DaYunTimeline.vue";
import GeJuSection from "../components/GeJuSection.vue";
import FenKeSection from "../components/FenKeSection.vue";
import XingQingSection from "../components/XingQingSection.vue";
import LianDongSection from "../components/LianDongSection.vue";
import ClassicsSection from "../components/ClassicsSection.vue";

const props = defineProps<{ report: AiReport; args: AnalyzeArgs | null }>();
const emit = defineEmits<{ (e: "back"): void }>();
const active = ref("overview");

const tabs = [
  { key: "overview", label: "概览" },
  { key: "dayun", label: "大运流年" },
  { key: "geju", label: "格局调候" },
  { key: "fenke", label: "分科专项" },
  { key: "xingqing", label: "性情" },
  { key: "liandong", label: "联动研判" },
  { key: "classics", label: "典籍溯源" },
];

// ================= 导出给大模型（精简包 / 全量调试包） =================
const exporting = ref(false);
const exportMsg = ref<string | null>(null);
const exportMode = ref<ExportMode>("brief");

const modeLabels: Record<ExportMode, string> = {
  brief: "精简包（推荐·单轮直发）",
  "debug-full": "全量包（仅调试·体积巨大）",
};

async function onExport() {
  if (!props.args) {
    exportMsg.value = "请先完成一次分析再导出。";
    return;
  }
  exporting.value = true;
  exportMsg.value = null;
  try {
    const out = await export_ai(props.args, exportMode.value);
    const defaultName = exportMode.value === "debug-full" ? "八字全量调试包.txt" : "八字精简包.txt";
    const saveRes = await saveExportFile(out.bundle, defaultName, "txt");
    const meta = `数据段 ${out.dataChars} 字符 / 约 ${out.dataTokens} tokens`;
    exportMsg.value = saveRes.canceled
      ? saveRes.message
      : `${saveRes.message}（${meta}）`;
    if (saveRes.canceled) return;
  } catch (e) {
    exportMsg.value = "导出失败：" + String(e);
  } finally {
    exporting.value = false;
  }
}

// ================= AI 直连 · 单轮自动分析 =================
const llm = reactive({
  baseUrl:
    localStorage.getItem("bazi.llm.baseUrl") ?? "https://api.deepseek.com",
  apiKey: localStorage.getItem("bazi.llm.apiKey") ?? "",
  model: localStorage.getItem("bazi.llm.model") ?? "deepseek-chat",
  customModel: localStorage.getItem("bazi.llm.customModel") ?? "",
});

// 下拉中的「自定义…」占位值
const CUSTOM_MODEL = "__custom__";

// 实际请求用的模型名（自定义时取手输值）
function llmModel(): string {
  return llm.model === CUSTOM_MODEL ? llm.customModel : llm.model;
}
const llmRunning = ref(false);
const llmError = ref<string | null>(null);
const llmReport = ref<string | null>(null);
const llmStatus = ref<string | null>(null);
const llmProgress = ref<string | null>(null);
const reportBox = ref<HTMLElement | null>(null);
let llmAbort: AbortController | null = null;
let progressTimer: ReturnType<typeof setInterval> | null = null;
let genChars = 0;
let genThinking = false;
const llmPhase = ref<"prepare" | "generate">("prepare");

// 流式期间把报告容器自动滚到底部，保证“逐字显示”始终在可视区内
watch(llmReport, async () => {
  if (llmRunning.value) {
    await nextTick();
    if (reportBox.value) {
      reportBox.value.scrollTop = reportBox.value.scrollHeight;
    }
  }
});

const reportParagraphs = computed(() =>
  llmReport.value
    ? llmReport.value.split(/\n{2,}/).filter((p) => p.trim().length > 0)
    : []
);

// 生成中显示原文；完成后默认渲染 markdown，可切回原文
const renderedHtml = computed(() =>
  llmReport.value && !llmRunning.value ? renderMarkdown(llmReport.value) : ""
);
const showRaw = ref(false);
const llmActionMsg = ref<string | null>(null);
const pdfFrame = ref<HTMLIFrameElement | null>(null);
const pdfSrc = ref<string | null>(null);
const pdfArmed = ref(false);

function persistLlm() {
  localStorage.setItem("bazi.llm.baseUrl", llm.baseUrl);
  localStorage.setItem("bazi.llm.apiKey", llm.apiKey);
  localStorage.setItem("bazi.llm.model", llm.model);
  localStorage.setItem("bazi.llm.customModel", llm.customModel);
}

// 配置变更即持久化（含通过下拉选择的模型）
watch(llm, persistLlm);

// ================= 获取模型列表 =================
const modelList = ref<string[]>([]);
const modelsLoading = ref(false);
const modelsMsg = ref<string | null>(null);

async function onFetchModels() {
  if (!llm.baseUrl.trim()) {
    modelsMsg.value = "请先填写 API 地址。";
    return;
  }
  modelsLoading.value = true;
  modelsMsg.value = null;
  try {
    const base = llm.baseUrl.replace(/\/+$/, "");
    // OpenAI 兼容端点：先试 {base}/models，404/405 时退回 {base}/v1/models
    const candidates = [base + "/models", base + "/v1/models"].filter(
      (u, i, arr) => arr.indexOf(u) === i
    );
    let lastErr = "";
    for (const url of candidates) {
      let resp: Response;
      try {
        resp = await fetch(url, {
          method: "GET",
          headers: { Authorization: "Bearer " + llm.apiKey },
        });
      } catch (e) {
        lastErr = String(e);
        break; // 网络错误不再重试第二个候选
      }
      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        lastErr = "HTTP " + resp.status + "：" + text.slice(0, 200);
        if (resp.status === 404 || resp.status === 405) {
          continue; // 换 /v1/models 再试
        }
        break; // 401/403 等不再重试
      }
      const data = (await resp.json()) as { data?: { id?: unknown }[] };
      const ids = (data.data ?? [])
        .map((m) => (typeof m.id === "string" ? m.id : null))
        .filter((x): x is string => x !== null);
      if (ids.length === 0) {
        modelsMsg.value = "接口返回的模型列表为空。";
        return;
      }
      ids.sort();
      modelList.value = ids;
      // 当前模型在列表中则保持；不在则自动选中第一个（避免旧值让用户无从下手）
      const cur = llmModel().trim();
      if (ids.includes(cur)) {
        llm.model = cur;
        modelsMsg.value = "已获取 " + ids.length + " 个模型，可在下拉中选择。";
      } else {
        llm.model = ids[0];
        modelsMsg.value =
          "已获取 " + ids.length + " 个模型，已自动选择 " + ids[0] + "，可在下拉中更换。";
      }
      return;
    }
    modelsMsg.value = lastErr ? "获取失败：" + lastErr : "获取失败。";
  } finally {
    modelsLoading.value = false;
  }
}

interface ChatMessage {
  role: string;
  content: string;
}

// OpenAI 兼容流式 chat/completions（SSE）：每收到一个 delta 就回调 onDelta，返回完整文本。
// 用 XMLHttpRequest + onprogress 做增量读取（WebView2 下比 fetch body 流式读取兼容性更好、逐块到达更稳）。
function streamComplete(
  messages: ChatMessage[],
  callbacks: {
    onDelta: (delta: string) => void;
    onReason?: (delta: string) => void;
  },
  signal: AbortSignal | undefined,
  thinking: boolean
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const url = llm.baseUrl.replace(/\/+$/, "") + "/chat/completions";
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.setRequestHeader("Authorization", "Bearer " + llm.apiKey);
    xhr.setRequestHeader("Accept", "text/event-stream");

    let buffer = "";
    let seen = 0;
    let full = "";
    let gotChunk = false;
    let settled = false;

    const finish = (fn: () => void) => {
      if (!settled) {
        settled = true;
        fn();
      }
    };

    const handleEvent = (event: string) => {
      for (const line of event.split("\n")) {
        const t = line.trim();
        if (!t.startsWith("data:")) continue;
        const payload = t.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const obj = JSON.parse(payload);
          const delta = obj?.choices?.[0]?.delta?.content;
          if (typeof delta === "string" && delta.length > 0) {
            full += delta;
            gotChunk = true;
            callbacks.onDelta(delta);
          } else {
            // 思考过程增量（reasoning_content）→ 通知进度条显示「模型思考中…」
            const reason = obj?.choices?.[0]?.delta?.reasoning_content;
            if (typeof reason === "string" && reason.length > 0) {
              callbacks.onReason?.(reason);
            }
          }
        } catch {
          /* 忽略无法解析的行 */
        }
      }
    };

    const pump = () => {
      const text = String(xhr.responseText ?? "");
      if (text.length <= seen) return;
      buffer += text.slice(seen);
      seen = text.length;
      // 换行符可能跨 chunk 拆开：对整个 buffer 归一化后再切分事件
      buffer = buffer.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
      let idx: number;
      while ((idx = buffer.indexOf("\n\n")) >= 0) {
        handleEvent(buffer.slice(0, idx));
        buffer = buffer.slice(idx + 2);
      }
    };

    xhr.onprogress = () => pump();
    xhr.onreadystatechange = () => {
      if (xhr.readyState >= 3) pump();
    };
    xhr.onload = () => {
      pump();
      if (buffer.trim().length > 0) {
        handleEvent(buffer.replace(/\r\n/g, "\n").replace(/\r/g, "\n"));
      }
      finish(() => {
        if (xhr.status >= 200 && xhr.status < 300) {
          if (!gotChunk) {
            reject(
              new Error("流式响应中没有内容（服务端可能不支持 stream），请检查 API 配置")
            );
          } else {
            resolve(full);
          }
        } else {
          reject(
            new Error(
              "HTTP " + xhr.status + "：" + String(xhr.responseText ?? "").slice(0, 300)
            )
          );
        }
      });
    };
    xhr.onerror = () =>
      finish(() => reject(new Error("网络请求失败：无法连接或 CORS 拦截")));
    xhr.onabort = () =>
      finish(() => reject(new DOMException("Aborted", "AbortError")));

    if (signal) {
      if (signal.aborted) {
        xhr.abort();
        return;
      }
      signal.addEventListener("abort", () => xhr.abort());
    }

    const body: Record<string, unknown> = { model: llmModel(), messages, stream: true };
    if (thinking) {
      // DeepSeek V4 思考模式：开启思考并把思考强度拉满
      body.thinking = { type: "enabled" };
      body.reasoning_effort = "max";
    }
    xhr.send(JSON.stringify(body));
  });
}


function onLlmCancel() {
  if (llmAbort) {
    llmAbort.abort();
  }
}

/** 单轮直发：精简包（提示词+数据段）→ 模型成稿。无中间协议、无校验回路。 */
async function runSingleFlow() {
  if (!props.args) throw new Error("缺少分析参数");
  llmStatus.value = "正在生成精简包（四柱藏干/旺衰格局调候/冲合/大运/近六年/精选典籍）…";
  const bundle = (await export_ai(props.args, "brief")).bundle;
  llmPhase.value = "generate";
  llmStatus.value = "生成中（模型思考可能较久）…";
  llmReport.value = "";
  await streamComplete(
    [{ role: "user", content: bundle }],
    {
      onDelta: (d) => {
        llmReport.value = (llmReport.value ?? "") + d;
        genChars += d.length;
        genThinking = false;
      },
      onReason: () => {
        genThinking = true;
      },
    },
    llmAbort!.signal,
    true
  );
  llmStatus.value = "完成。";
}

async function onLlmRun() {
  if (!props.args) {
    llmError.value = "请先完成一次分析。";
    return;
  }
  persistLlm();
  llmAbort = new AbortController();
  llmRunning.value = true;
  llmError.value = null;
  llmReport.value = null;
  showRaw.value = false;
  llmActionMsg.value = null;
  genChars = 0;
  genThinking = false;
  const runStart = Date.now();
  llmPhase.value = "prepare";
  llmProgress.value = "已用 0s";
  progressTimer = setInterval(() => {
    const secs = Math.floor((Date.now() - runStart) / 1000);
    if (llmPhase.value === "generate") {
      llmProgress.value =
        genThinking && genChars === 0
          ? "模型思考中… 已用 " + secs + "s"
          : "已生成 " + genChars + " 字 · 已用 " + secs + "s";
    } else {
      llmProgress.value = "已用 " + secs + "s";
    }
  }, 500);
  try {
    await runSingleFlow();
  } catch (e) {
    if (llmAbort && llmAbort.signal.aborted) {
      llmStatus.value = "已取消。";
    } else {
      llmStatus.value = "失败。";
      llmError.value = String(e);
    }
  } finally {
    if (progressTimer !== null) {
      clearInterval(progressTimer);
      progressTimer = null;
    }
    llmProgress.value = null;
    llmRunning.value = false;
    llmAbort = null;
  }
}

// 导出的独立 HTML 样式（与页面渲染风格一致）
const REPORT_CSS = [
  "body{font-family:-apple-system,'PingFang SC','Microsoft YaHei','Segoe UI',sans-serif;max-width:860px;margin:0 auto;padding:32px 24px;line-height:1.8;color:#1a1a1a;background:#fff}",
  "h1{font-size:26px;border-bottom:2px solid #185fa5;padding-bottom:8px}",
  "h2{font-size:21px;border-bottom:1px solid #e3e6eb;padding-bottom:6px;margin-top:28px}",
  "h3{font-size:17px;margin-top:22px}",
  "table{border-collapse:collapse;width:100%;margin:12px 0}",
  "th,td{border:1px solid #e3e6eb;padding:6px 10px;text-align:left;font-size:14px}",
  "th{background:#f3f5f9}",
  "blockquote{border-left:3px solid #185fa5;margin:12px 0;padding:4px 14px;color:#6b7280;background:#f5f6f8}",
  "code{background:#f3f5f9;padding:2px 5px;border-radius:4px;font-size:13px}",
  "pre{background:#f5f6f8;padding:12px;border-radius:8px;overflow-x:auto}",
  "hr{border:none;border-top:1px solid #e3e6eb;margin:20px 0}",
  "ul,ol{padding-left:24px}",
  "a{color:#185fa5}",
  "@media print{body{padding:0;max-width:none}}",
].join("\n");

function buildReportHtml(): string {
  const body = renderMarkdown(llmReport.value ?? "");
  return (
    "<!doctype html><html lang='zh-CN'><head><meta charset='utf-8'>" +
    "<title>AI 八字分析报告</title><style>" +
    REPORT_CSS +
    "</style></head><body><article>" +
    body +
    "</article></body></html>"
  );
}

async function onSaveReport(kind: "md" | "html") {
  if (!llmReport.value) return;
  try {
    const isMd = kind === "md";
    const content = isMd ? llmReport.value : buildReportHtml();
    const res = await saveExportFile(
      content,
      isMd ? "AI分析报告.md" : "AI分析报告.html",
      kind
    );
    if (res.canceled) return;
    llmActionMsg.value = res.message;
  } catch (e) {
    llmActionMsg.value = "导出失败：" + String(e);
  }
}

// PDF：渲染为独立 HTML 后经隐藏 iframe 唤起打印对话框（选「另存为 PDF」）
function onExportPdf() {
  if (!llmReport.value) return;
  llmActionMsg.value = "正在打开打印对话框，请选择「另存为 PDF」…";
  pdfArmed.value = true;
  pdfSrc.value = "data:text/html;charset=utf-8," + encodeURIComponent(buildReportHtml());
}

function onPdfFrameLoad() {
  if (!pdfArmed.value || !pdfSrc.value) return;
  pdfArmed.value = false;
  const win = pdfFrame.value?.contentWindow;
  if (win) {
    try {
      win.focus();
      win.print();
    } catch (e) {
      llmActionMsg.value = "打印失败：" + String(e);
    }
  }
  setTimeout(() => {
    pdfSrc.value = null;
  }, 2000);
}
</script>


<template>
  <div class="result">
    <div class="result-topbar">
      <button class="back-btn" type="button" @click="emit('back')">← 修改输入</button>
    </div>

    <p class="disclaimer">
      结构化参考 + 概率性表述，仅供传统文化研究与自我认知参考，不构成专业建议。
    </p>

    <BaziCard
      :bazi="report.bazi"
      :cang-gan="report.cang_gan"
      :birth-meta="report.birth_meta"
      :shi-shen="report.bazi.shi_shen"
    />

    <div class="export-bar">
      <span class="label">导出给大模型：</span>
      <select v-model="exportMode" class="mode-select">
        <option v-for="(label, key) in modeLabels" :key="key" :value="key">
          {{ label }}
        </option>
      </select>
      <button class="export-btn" :disabled="exporting || !args" @click="onExport">
        {{ exporting ? "导出中…" : "导出 .txt" }}
      </button>
      <span v-if="exportMsg" class="export-msg">{{ exportMsg }}</span>
    </div>

    <div class="tabs">
      <button
        v-for="t in tabs"
        :key="t.key"
        :class="['tab', { active: active === t.key }]"
        @click="active = t.key"
      >
        {{ t.label }}
      </button>
    </div>

    <!-- 概览 -->
    <div v-show="active === 'overview'">
      <div class="grid-2">
        <WuXingChart :wang-shuai="report.wang_shuai" :verdict="report.wang_shuai_verdict" />
        <ShiShenTable :shi-shen="report.bazi.shi_shen" />
      </div>
      <ShenShaSection :shensha="report.shensha" />
    </div>

    <!-- 大运流年 -->
    <div v-show="active === 'dayun'">
      <DaYunTimeline :dayun="report.dayun" :sui-yun="report.sui_yun" />
    </div>

    <!-- 格局调候 -->
    <div v-show="active === 'geju'">
      <GeJuSection :geju="report.geju" :tiao-hou="report.tiao_hou" :verdict="report.wang_shuai_verdict" />
    </div>

    <!-- 分科专项 -->
    <div v-show="active === 'fenke'">
      <FenKeSection :fen-ke="report.fen_ke" />
    </div>

    <!-- 性情 -->
    <div v-show="active === 'xingqing'">
      <XingQingSection :xing-qing="report.xing_qing" />
    </div>

    <!-- 联动研判 -->
    <div v-show="active === 'liandong'">
      <LianDongSection :lian-dong="report.lian_dong" />
    </div>

    <!-- 典籍溯源 -->
    <div v-show="active === 'classics'">
      <ClassicsSection :classics="report.classics" :golden-cases="report.golden_cases" />
    </div>

    <!-- AI 直连 · 单轮自动分析 -->
    <details class="llm-panel">
      <summary>AI 直连 · 自动分析</summary>
      <div class="llm-config">
        <label class="llm-field">
          地址
          <input v-model="llm.baseUrl" placeholder="https://api.deepseek.com" />
        </label>
        <label class="llm-field">
          模型
          <select v-model="llm.model" class="mode-select model-select">
            <option
              v-if="!modelList.includes(llm.model) && llm.model !== CUSTOM_MODEL"
              :value="llm.model"
            >
              {{ llm.model || "（选择模型）" }}
            </option>
            <option v-for="m in modelList" :key="m" :value="m">{{ m }}</option>
            <option v-if="modelList.length" :value="CUSTOM_MODEL">自定义…</option>
          </select>
          <input
            v-if="llm.model === CUSTOM_MODEL"
            v-model="llm.customModel"
            placeholder="如 qwen2.5:14b"
            class="custom-model-input"
          />
        </label>
        <button
          class="export-btn ghost-btn"
          :disabled="modelsLoading || llmRunning"
          @click="onFetchModels"
        >
          {{ modelsLoading ? "获取中…" : "获取模型列表" }}
        </button>
        <span v-if="modelsMsg" class="export-msg">{{ modelsMsg }}</span>
        <label class="llm-field llm-key">
          Key
          <input v-model="llm.apiKey" type="password" placeholder="sk-…" />
        </label>
        <button class="export-btn" :disabled="llmRunning || !args" @click="onLlmRun">
          {{ llmRunning ? "运行中…" : "开始分析" }}
        </button>
        <button v-if="llmRunning" class="export-btn cancel-btn" @click="onLlmCancel">
          取消
        </button>
      </div>
      <p class="llm-hint">
        单轮直发<strong>精简包</strong>（四柱藏干 / 旺衰格局调候 / 冲合 / 大运 / 当前年及未来五年
        流年干支 / 4–6 条引擎选定的典籍摘录），模型围绕命局的核心矛盾、化解方向与当前运自由成文。
        生成阶段开启模型思考且强度拉满（reasoning_effort=max）。完成后可导出
        .md / .html / .pdf（PDF 在打印对话框选「另存为 PDF」）。密钥仅保存在本机浏览器
        存储；接口需允许浏览器跨域（DeepSeek/OpenAI 官方接口支持；本地 Ollama 需设置
        OLLAMA_ORIGINS）。
      </p>
      <div v-if="llmStatus" class="llm-status">
        {{ llmStatus }}
        <span v-if="llmProgress" class="llm-progress">{{ llmProgress }}</span>
      </div>
      <div v-if="llmError" class="llm-error">{{ llmError }}</div>
      <div v-if="llmReport !== null" class="llm-report" ref="reportBox">
        <div class="llm-report-actions">
          <button class="export-btn" @click="onSaveReport('md')">导出 .md</button>
          <button class="export-btn" @click="onSaveReport('html')">导出 .html</button>
          <button class="export-btn" @click="onExportPdf">导出 .pdf</button>
          <button class="mini-btn" type="button" @click="showRaw = !showRaw">
            {{ showRaw ? "切换渲染" : "查看原文" }}
          </button>
          <span v-if="llmActionMsg" class="export-msg">{{ llmActionMsg }}</span>
        </div>
        <!-- 生成中：原始 markdown 逐字显示；完成后：默认渲染（可切回原文） -->
        <template v-if="llmRunning">
          <p v-for="(p, i) in reportParagraphs" :key="i" class="llm-para">{{ p }}</p>
        </template>
        <template v-else>
          <div v-if="!showRaw" class="llm-rendered" v-html="renderedHtml"></div>
          <pre v-else class="llm-raw-pre">{{ llmReport }}</pre>
        </template>
      </div>
      <iframe
        v-if="pdfSrc"
        ref="pdfFrame"
        :src="pdfSrc"
        class="pdf-frame"
        title="pdf-print"
        @load="onPdfFrameLoad"
      ></iframe>
    </details>
  </div>
</template>

<style scoped>
.result-topbar {
  margin-bottom: 10px;
}
.disclaimer {
  margin: 0 0 12px;
  padding: 8px 12px;
  background: #fbfaf3;
  border-left: 3px solid #b8860b;
  border-radius: 6px;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.6;
}
.back-btn {
  border: 1px solid var(--border);
  background: var(--panel);
  color: var(--text);
  border-radius: 8px;
  padding: 5px 14px;
  font-size: 13px;
  cursor: pointer;
}
.back-btn:hover {
  background: #eef2f7;
}
.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 16px 0;
  position: sticky;
  top: 0;
  background: var(--bg);
  padding: 8px 0;
  z-index: 5;
}
.tab {
  border: 1px solid var(--border);
  background: var(--panel);
  border-radius: 18px;
  padding: 6px 16px;
  font-size: 14px;
  cursor: pointer;
  color: var(--text);
}
.tab.active {
  background: #185fa5;
  border-color: #185fa5;
  color: #fff;
}
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.grid-2 .panel {
  margin-bottom: 0;
}
@media (max-width: 760px) {
  .grid-2 {
    grid-template-columns: 1fr;
  }
  .tabs {
    flex-wrap: nowrap;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 8px;
    scrollbar-width: none;
  }
  .tabs::-webkit-scrollbar {
    display: none;
  }
  .tab {
    flex: 0 0 auto;
    white-space: nowrap;
    padding: 8px 14px;
  }
}
.export-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin: 4px 0 8px;
  padding: 8px 12px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 10px;
}
.export-bar .label {
  font-size: 13px;
  color: var(--muted);
}
.mode-select {
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text);
  border-radius: 8px;
  padding: 5px 8px;
  font-size: 13px;
}
.export-btn {
  border: 1px solid #185fa5;
  background: #185fa5;
  color: #fff;
  border-radius: 8px;
  padding: 5px 14px;
  font-size: 13px;
  cursor: pointer;
}
.export-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.export-msg {
  font-size: 12px;
  color: var(--muted);
  word-break: break-all;
}
.llm-panel {
  margin: 20px 0;
  padding: 10px 14px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 10px;
}
.llm-panel summary {
  cursor: pointer;
  font-size: 14px;
  color: #185fa5;
  user-select: none;
}
.llm-config {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 10px;
  margin-top: 10px;
}
.llm-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: var(--muted);
}
.llm-field input {
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text);
  border-radius: 8px;
  padding: 5px 8px;
  font-size: 13px;
  width: 200px;
}
.llm-key input {
  width: 300px;
}
.llm-hint {
  font-size: 12px;
  color: var(--muted);
  margin: 8px 0 0;
  line-height: 1.6;
}
.cancel-btn {
  background: #8a4b1d;
  border-color: #8a4b1d;
}
.ghost-btn {
  background: transparent;
  color: #185fa5;
  align-self: flex-end;
  margin-bottom: 2px;
}
.model-select {
  width: 200px;
}
.custom-model-input {
  margin-top: 4px;
}
.llm-status {
  margin-top: 8px;
  font-size: 13px;
  color: var(--text);
}
.llm-progress {
  color: var(--muted);
  font-size: 12px;
  margin-left: 6px;
}
.llm-error {
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(196, 43, 43, 0.12);
  border: 1px solid rgba(196, 43, 43, 0.5);
  color: #c42b2b;
  font-size: 13px;
  word-break: break-all;
}
.llm-report {
  margin-top: 12px;
  max-height: 62vh;
  overflow-y: auto;
  padding-right: 6px;
}
.llm-report-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  position: sticky;
  top: 0;
  background: var(--panel);
  padding: 4px 0;
  z-index: 2;
}
.mini-btn {
  border: 1px solid var(--border);
  background: var(--panel);
  color: var(--muted);
  border-radius: 8px;
  padding: 5px 12px;
  font-size: 12px;
  cursor: pointer;
}
.mini-btn:hover {
  background: #eef2f7;
}
.llm-raw-pre {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 13px;
  line-height: 1.7;
  margin: 0;
  font-family: inherit;
}
.llm-rendered {
  line-height: 1.8;
  font-size: 14px;
}
.llm-rendered h1 {
  font-size: 22px;
  border-bottom: 2px solid #185fa5;
  padding-bottom: 6px;
}
.llm-rendered h2 {
  font-size: 18px;
  border-bottom: 1px solid var(--border);
  padding-bottom: 4px;
  margin-top: 20px;
}
.llm-rendered h3 {
  font-size: 15px;
  margin-top: 16px;
}
.llm-rendered table {
  border-collapse: collapse;
  width: 100%;
  margin: 10px 0;
}
.llm-rendered th,
.llm-rendered td {
  border: 1px solid var(--border);
  padding: 5px 10px;
  font-size: 13px;
}
.llm-rendered th {
  background: #f3f5f9;
}
.llm-rendered blockquote {
  border-left: 3px solid #185fa5;
  margin: 10px 0;
  padding: 4px 14px;
  color: var(--muted);
  background: var(--bg);
}
.llm-rendered code {
  background: #f3f5f9;
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 13px;
}
.llm-rendered pre {
  background: #f3f5f9;
  padding: 10px;
  border-radius: 8px;
  overflow-x: auto;
}
.llm-rendered hr {
  border: none;
  border-top: 1px solid var(--border);
  margin: 16px 0;
}
.llm-rendered ul,
.llm-rendered ol {
  padding-left: 22px;
}
.llm-rendered a {
  color: #185fa5;
}
.pdf-frame {
  position: fixed;
  right: -9999px;
  bottom: 0;
  width: 794px;
  height: 600px;
  border: 0;
}
.llm-para {
  white-space: pre-wrap;
  line-height: 1.8;
  font-size: 14px;
  margin: 0 0 10px;
}
</style>
