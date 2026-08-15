# 好术（haoshu）· 桌面 / 移动端应用

好术的 Tauri 2 + Vue 3 前端，调用 `bazi-analyzer` Rust 引擎完成八字排盘与结构化研判，并提供结果展示、历史记录，以及**与大模型直连的两轮流式分析**。

> 更完整的产品说明见仓库根目录 [`README.md`](../README.md)。

## 技术栈

- 框架：Tauri 2（Rust + WebView 壳）
- 前端：Vue 3 + TypeScript + Vite
- 后端：Rust（`bazi-analyzer` crate 作为 path 依赖，含 `rusqlite` bundled）
- 平台：Windows / macOS / Linux 桌面，以及 Android 移动端

## 开发

```bash
pnpm install
pnpm tauri dev           # 桌面开发（带 HMR）
pnpm tauri android dev   # Android 模拟器 / 真机
```

## 构建

```bash
pnpm tauri build
pnpm tauri android build
```

## 功能要点

- **八字输入**：公历 / 农历、性别 → 排四柱、十神、旺衰、神煞、大运流年；
- **结果视图**：八字卡、五行图、神煞详解区、大运时间线、典籍引用；
- **AI 直连**：选择模型、两轮提示词模板，流式输出解读，支持 Markdown 渲染与多格式导出；
- **典籍溯源**：经 `corpus-tracer` 清洗版典籍数据库，确保大模型解读有据可查，而非自由发挥。

## 关于"优化大模型分析效果"

本应用本身不做命理结论的端到端生成，而是把引擎产出的**结构化研判 + 精准典籍引文**整理成高质量提示词素材，交给大模型做最终解读。这种方式让大模型的输出建立在可追溯的证据之上，显著提升了八字分析的准确度与可控性。
