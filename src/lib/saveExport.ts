import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
// Android 分支使用 tauri-plugin-android-fs（MediaStore 写公共「下载」目录 + 系统分享面板）。
// 注意：该包也导出 writeTextFile，与官方 plugin-fs 同名，故在此别名导入避免冲突。
import {
  createNewPublicFile,
  writeTextFile as afsWriteTextFile,
  showShareFileAppChooser,
  PublicGeneralPurposeDir,
  type FsUri,
} from "tauri-plugin-android-fs-api";

// Tauri Android WebView 的 UA 含 "Android"；用它区分平台，桌面端行为不变。
// 桌面：save() 对话框由用户自选位置 → 官方 fs 写入。
// Android：tauri-plugin-android-fs 经 MediaStore 在公共「下载」目录建文件（不走 SAF，
// 毫秒级），写入文本，再调系统分享面板让用户立即打开/转发；文件已落 Downloads，
// 即便取消分享也可在文件管理器/下载 App 中直接查看。
const isAndroid = /Android/i.test(navigator.userAgent);

// 不同扩展名给不同 MIME，MediaStore 建文件与分享面板才能匹配合适的目标应用。
function mimeForExt(ext: string): string {
  switch (ext.toLowerCase()) {
    case "md":
      return "text/markdown";
    case "html":
      return "text/html";
    default:
      return "text/plain";
  }
}

export interface SaveResult {
  canceled: boolean;
  message: string;
  path: string | null;
}

/**
 * 跨平台保存导出文本。
 *
 * - Android：tauri-plugin-android-fs 经 MediaStore 写入公共「下载」目录（快、用户可见），
 *   再调系统分享面板可立即打开/转发。避免旧 SAF save() 的几十秒卡顿，也避免写应用沙盒
 *   后“文件管理器看不到、只能 adb 取”的问题。
 * - 其它平台：沿用 save() 对话框由用户选择位置，再官方 fs writeTextFile（行为不变）。
 */
export async function saveExportFile(
  content: string,
  defaultName: string,
  ext: string
): Promise<SaveResult> {
  if (isAndroid) {
    try {
      const mime = mimeForExt(ext);
      // 在公共「下载」目录建文件；同名自动追加序号保证唯一；requestPermission 默认 true
      // 会按需请求运行时权限。
      const uri: FsUri = await createNewPublicFile(
        PublicGeneralPurposeDir.Download,
        defaultName,
        mime
      );
      await afsWriteTextFile(uri, content);
      // 尽力调起系统分享面板（可打开/转发/另存到其它位置）；失败不影响已完成的保存。
      try {
        await showShareFileAppChooser(uri);
      } catch {
        // 分享面板失败不致命：文件已存于下载目录。
      }
      return {
        canceled: false,
        path: null,
        message: `已保存到「下载」目录：${defaultName}。可用查看器打开或转发。`,
      };
    } catch (e) {
      return { canceled: false, path: null, message: "保存失败：" + String(e) };
    }
  }

  const path = await save({
    title: "导出分析报告",
    defaultPath: defaultName,
    filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
  });
  if (!path) {
    return { canceled: true, path: null, message: "已取消导出。" };
  }
  await writeTextFile(path, content);
  return { canceled: false, path, message: "已导出到：" + path };
}
