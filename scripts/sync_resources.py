#!/usr/bin/env python3
"""打包资源同步脚本（语料更新后必跑）。

做两件事：
1. 把 corpus-tracer 的主库/矩阵同步到 src-tauri/resources/（内容一致则跳过，幂等）；
2. 重算 resources/resources.version 内容指纹清单——App 启动时用它和已安装副本
   比对，不一致则整体重拷（见 src-tauri/src/lib.rs 的 ensure_bundled_resources）。

新增随包资源时：tauri.conf.json 的 bundle.resources 与 lib.rs 的 items 两处清单
仍要同步维护，并把新文件加入下方 MANIFEST_FILES。
"""

import hashlib
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]  # bazi-ui/scripts/ -> 仓库组根目录
CORPUS = ROOT / "corpus-tracer"
RES = ROOT / "bazi-ui" / "src-tauri" / "resources"

# corpus-tracer 源 -> resources 目标（均为相对路径）
COPIES = {
    "corpus.db": "corpus.db",
    "shensha.db": "shensha.db",
    "cross_pillar_matrix.json": "cross_pillar_matrix.json",
}

# 清单覆盖的随包文件（相对 resources/）；清单自身除外
MANIFEST_FILES = [
    "corpus.db",
    "shensha.db",
    "cross_pillar_matrix.json",
    "prompts/prompt_friendly.md",
]


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> int:
    for src_rel, dst_rel in COPIES.items():
        src = CORPUS / src_rel
        dst = RES / dst_rel
        if not src.is_file():
            print(f"[sync] 源缺失：{src}", file=sys.stderr)
            return 1
        if dst.is_file() and sha256(src) == sha256(dst):
            print(f"[sync] 已一致：{dst_rel}")
        else:
            dst.write_bytes(src.read_bytes())
            print(f"[sync] 已更新：{dst_rel}（{src.stat().st_size:,} 字节）")

    lines = []
    for rel in MANIFEST_FILES:
        p = RES / rel
        if not p.is_file():
            print(f"[sync] 清单文件缺失：{p}", file=sys.stderr)
            return 1
        lines.append(f"{rel}\t{sha256(p)}\t{p.stat().st_size}")
    manifest = RES / "resources.version"
    old = manifest.read_text(encoding="utf-8") if manifest.is_file() else ""
    new = "\n".join(lines) + "\n"
    if new != old:
        manifest.write_text(new, encoding="utf-8", newline="\n")
        print(f"[sync] 清单已更新：{manifest.name}")
    else:
        print(f"[sync] 清单无变化")
    return 0


if __name__ == "__main__":
    sys.exit(main())
