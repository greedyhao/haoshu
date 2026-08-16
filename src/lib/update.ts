import { getVersion } from "@tauri-apps/api/app";
import { openUrl } from "@tauri-apps/plugin-opener";

// 仓库 owner/name：release 页 https://github.com/greedyhao/haoshu/releases
const REPO = "greedyhao/haoshu";
export const RELEASES_PAGE = `https://github.com/${REPO}/releases`;

export interface UpdateInfo {
  /** 本地已安装版本（取自 Tauri 配置） */
  current: string;
  /** 远端最新 release 的 tag（已去掉前导 v） */
  latest: string;
  /** latest 是否严格大于 current */
  hasUpdate: boolean;
  /** 跳转地址：具体 release 页，失败兜底到 releases 列表页 */
  url: string;
}

/** 标准化版本号：去掉前导 v 与首尾空白 */
function normalize(v: string): string {
  return String(v ?? "").replace(/^v/i, "").trim();
}

/** 取版本段中的前导整数（"3-beta" → 3），非数字段按 0 处理 */
function toNum(s: string): number {
  const m = s.match(/^\d+/);
  return m ? parseInt(m[0], 10) : 0;
}

/**
 * 语义化版本比较（仅比较数值段，适配 x.y.z / x.y / 带后缀）。
 * 返回 >0 表示 a 新于 b；<0 表示 a 旧于 b；0 表示相等。
 */
export function compareVersions(a: string, b: string): number {
  const pa = normalize(a).split(".").map(toNum);
  const pb = normalize(b).split(".").map(toNum);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x > y ? 1 : -1;
  }
  return 0;
}

/** 取当前应用版本（失败兜底 0.0.0，避免 UI 显示异常） */
export async function getAppVersion(): Promise<string> {
  try {
    return await getVersion();
  } catch {
    return "0.0.0";
  }
}

/**
 * 检查 GitHub 最新 release。
 * 注意：releases/latest 默认跳过 pre-release 与 draft，返回稳定版。
 * 未认证请求有速率限制（约 60 次/小时/IP），调用方应自行吞掉异常。
 */
export async function checkForUpdate(current: string): Promise<UpdateInfo> {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/releases/latest`,
    { headers: { Accept: "application/vnd.github+json" } },
  );
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  const data = (await res.json()) as {
    tag_name?: string;
    html_url?: string;
  };
  const latest = normalize(data.tag_name ?? "");
  const url = data.html_url || RELEASES_PAGE;
  return {
    current,
    latest,
    hasUpdate: latest !== "" && compareVersions(latest, current) > 0,
    url,
  };
}

/** 在系统默认浏览器打开地址（releases 页或具体 release） */
export async function openReleases(url: string): Promise<void> {
  await openUrl(url);
}
