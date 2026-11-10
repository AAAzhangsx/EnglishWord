# 本地地址与启动

## 当前电脑的项目地址

- Windows：`C:\Users\11192\Documents\ChatGPT\EnglishWord`
- WSL：`/mnt/c/Users/11192/Documents/ChatGPT/EnglishWord`
- GitHub：<https://github.com/yulian-art/EnglishWord>
- 默认 SQLite：项目下 `build/runtime/englishword.sqlite`，启动后自动创建。

## 当前工作区：从 PowerShell 启动（推荐）

如果提示符以 `PS C:\...>` 开头，就在 PowerShell 中直接执行下面两条命令，不要先 `cd /mnt/c/...`。

终端一，启动已经编译好的 WSL 后端：

```powershell
wsl.exe --cd "C:\Users\11192\Documents\ChatGPT\EnglishWord" --exec bash scripts/start-backend.sh --port 8080
```

另开一个 PowerShell 终端，启动 WSL 中的 React 开发服务：

```powershell
wsl.exe --cd "C:\Users\11192\Documents\ChatGPT\EnglishWord\frontend" --exec npm run dev
```

打开 <http://127.0.0.1:5173>。这两条命令不依赖 PowerShell 当前所在目录，`wsl.exe` 会设置正确的 Linux 工作目录。Ctrl+C 停止相应服务。

PowerShell 中的 `/mnt/c/...` 会被当作当前 Windows 盘符下的路径，例如 `C:\mnt\c\...`，与 WSL 的 `/mnt/c/...` 不是同一位置。单独调用 `bash` 也不会自动纠正错误的工作目录。

## 已进入 WSL 终端时的启动方式

后端已编译，React 依赖已安装。后端脚本会自动加载本地缓存的 Linux 运行库。

终端一，启动 C++ API：

```bash
cd /mnt/c/Users/11192/Documents/ChatGPT/EnglishWord
bash scripts/start-backend.sh --port 8080
```

终端二，启动 React 热更新：

```bash
cd /mnt/c/Users/11192/Documents/ChatGPT/EnglishWord/frontend
npm run dev
```

打开 <http://127.0.0.1:5173>。API 健康检查：<http://127.0.0.1:8080/api/health>。两个终端分别用 Ctrl+C 停止。若 8080 已占用，先停止之前启动的后端；不要重复启动。Vite 代理默认指向 8080，改后端端口时也要改 frontend/vite.config.ts。

## 一次启动演示版（不用前端热更新）

构建过 React 后，在项目根目录执行：

```bash
npm --prefix frontend run build
bash scripts/start-backend.sh --port 8080 --web-root frontend/dist
```

打开 <http://127.0.0.1:8080>，同一个 C++ 服务同时提供页面和 API。与上一种方式二选一，不要让两个后端占同一个端口。

## 新同学 / Windows 原生开发

新克隆不包含 build、node_modules 和运行库缓存。先按 [README 的本地开发](../README.md#本地开发) 安装 vcpkg、编译 C++，并在 frontend 中运行 `npm ci`。

Windows PowerShell 编译完成后启动两个终端：

```powershell
# 终端一，Visual Studio 多配置构建
cd C:\Users\11192\Documents\ChatGPT\EnglishWord
.\build\dev\backend\Debug\englishword_server.exe --port 8080
```

```powershell
# 终端二
cd C:\Users\11192\Documents\ChatGPT\EnglishWord\frontend
npm run dev
```

Windows 原生 exe 与当前 WSL 编译出的 Linux 程序不同，需要各自编译。使用单配置生成器时，Windows exe 在 build/dev/backend 下，没有 Debug 子目录。

## 用 curl 理解接口（WSL / Bash）

在后端运行时依次执行。Cookie 文件用来保持同一轮任务：

```bash
curl http://127.0.0.1:8080/api/wordbooks
curl http://127.0.0.1:8080/api/wordbooks/1/words

curl -c /tmp/englishword-cookies.txt -b /tmp/englishword-cookies.txt \
  -H 'Content-Type: application/json' \
  -d '{"wordbookId":1,"mode":"spelling"}' \
  http://127.0.0.1:8080/api/study/start

curl -c /tmp/englishword-cookies.txt -b /tmp/englishword-cookies.txt \
  -H 'Content-Type: application/json' -d '{"answer":"aple"}' \
  http://127.0.0.1:8080/api/study/answer

curl -c /tmp/englishword-cookies.txt -b /tmp/englishword-cookies.txt \
  -H 'Content-Type: application/json' -d '{"answer":"apple"}' \
  http://127.0.0.1:8080/api/study/answer

curl -c /tmp/englishword-cookies.txt -b /tmp/englishword-cookies.txt \
  -H 'Content-Type: application/json' -d '{}' \
  http://127.0.0.1:8080/api/study/next
```

此例假定使用随项目创建的原始示例词库，第一个词为 apple。请求、响应字段详见 [API.md](API.md)。
