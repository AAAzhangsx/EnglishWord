#!/usr/bin/env bash
set -euo pipefail

# 根据脚本位置定位项目，保证从任意目录启动时数据库相对路径一致。
project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
server_path="$project_root/build/dev/backend/englishword_server"

if [[ ! -x "$server_path" ]]; then
    echo "尚未找到后端程序，请先按 README 编译：$server_path" >&2
    exit 1
fi

# 当前工作区的 Linux 运行库可缓存于 build/runtime-libs，不提交二进制到 Git。
# 正常通过 vcpkg / 系统安装依赖的同学不需要此目录。
if [[ -d "$project_root/build/runtime-libs" ]]; then
    export LD_LIBRARY_PATH="$project_root/build/runtime-libs${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
fi

cd -- "$project_root"
exec "$server_path" "$@"
