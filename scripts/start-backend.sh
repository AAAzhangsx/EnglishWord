#!/usr/bin/env bash
set -euo pipefail

# 根据脚本位置定位项目，保证从任意目录启动时数据库相对路径一致。
project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"

# 项目里可能同时存在多份构建产物（WSL Release、WSL Debug、Windows 多配置）。
# 这里默认选用最近编译的那一份，避免误用旧程序打开已被新版本迁移过的数据库：
# 旧程序只认识旧 schema，启动时会报“数据库版本高于当前程序支持的版本”。
# 需要固定某一份时，用 ENGLISHWORD_SERVER=/绝对路径 覆盖。
server_path="${ENGLISHWORD_SERVER:-}"
if [[ -z "$server_path" ]]; then
    for candidate in \
        "$project_root/build/wsl/backend/englishword_server" \
        "$project_root/build/dev/backend/englishword_server" \
        "$project_root/build/dev/backend/Debug/englishword_server.exe" \
        "$project_root/build/dev/backend/Release/englishword_server.exe" \
        "$project_root/build/dev/backend/englishword_server.exe"; do
        # 不用 -x 判断：NTFS 挂载常常没有执行位，WSL 下 /mnt/c 又默认全可执行。
        [[ -f "$candidate" ]] || continue
        # -nt 比较修改时间，等价于“取最新的构建”。
        if [[ -z "$server_path" || "$candidate" -nt "$server_path" ]]; then
            server_path="$candidate"
        fi
    done
fi

if [[ -z "$server_path" || ! -f "$server_path" ]]; then
    echo "尚未找到后端程序，请先按 README 编译：$project_root/build/dev/backend/englishword_server" >&2
    exit 1
fi

if [[ ! -x "$server_path" ]]; then
    chmod +x -- "$server_path" 2>/dev/null || {
        echo "没有执行权限：$server_path" >&2
        exit 1
    }
fi

echo "后端程序：${server_path#"$project_root"/}"

# 当前工作区的 Linux 运行库可缓存于 build/runtime-libs，不提交二进制到 Git。
# 正常通过 vcpkg / 系统安装依赖的同学不需要此目录。
if [[ -d "$project_root/build/runtime-libs" ]]; then
    export LD_LIBRARY_PATH="$project_root/build/runtime-libs${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
fi

cd -- "$project_root"
exec "$server_path" "$@"
