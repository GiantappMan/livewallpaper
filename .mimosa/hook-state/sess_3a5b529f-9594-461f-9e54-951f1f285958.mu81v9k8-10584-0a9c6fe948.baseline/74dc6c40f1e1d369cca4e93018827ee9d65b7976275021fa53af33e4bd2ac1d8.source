#!/usr/bin/env bash
# 把仓库里的皮肤目录联接（junction）进应用数据目录，开启热更新开发：
#   scripts/link-skin.sh examples/skin-dev
# 之后修改皮肤源码，运行中的应用自动刷新（依赖应用内置的 skins 目录监听）。
# Windows 用 junction（无需管理员权限）；其他平台用符号链接。
set -euo pipefail

SRC="${1:?用法: scripts/link-skin.sh <皮肤目录，如 examples/skin-dev>}"
cd "$(dirname "$0")/.."

if [ ! -f "$SRC/skin.json" ]; then
  echo "错误: $SRC 下没有 skin.json" >&2
  exit 1
fi

# 链接名取清单里的 id（应用以目录名拼路径，须与 id 一致）
ID=$(sed -n 's/.*"id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$SRC/skin.json" | head -1)
if [ -z "$ID" ]; then
  echo "错误: 无法从 $SRC/skin.json 读取 id" >&2
  exit 1
fi

DATA_DIR="${LOCALAPPDATA:-$HOME/AppData/Local}/LiveWallpaper4"
DEST="$DATA_DIR/skins/$ID"
mkdir -p "$DATA_DIR/skins"

if [ -e "$DEST" ] || [ -L "$DEST" ]; then
  echo "跳过: $DEST 已存在（如需重建请先手动删除）"
  exit 0
fi

SRC_ABS=$(cd "$SRC" && pwd)
if [ "$(uname -s)" = "Windows_NT" ] || [ -n "${LOCALAPPDATA:-}" ]; then
  cmd //C mklink //J "$(cygpath -w "$DEST")" "$(cygpath -w "$SRC_ABS")" >/dev/null
else
  ln -s "$SRC_ABS" "$DEST"
fi
echo "已联接: $DEST -> $SRC_ABS"
echo "启动应用并在 设置->外观->皮肤 里应用「$ID」后，改 $SRC 内文件即可自动刷新。"
