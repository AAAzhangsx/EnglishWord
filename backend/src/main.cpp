#include "controllers/api.h"
#include "repositories/word_repository.h"

#include <drogon/drogon.h>

#include <filesystem>
#include <iostream>
#include <stdexcept>
#include <string>

/// 解析启动参数并运行 HTTP 服务；成功返回 0，启动失败返回 1。
int main(int argc, char* argv[])
{
    try {
        std::string database = "build/runtime/englishword.sqlite"; // 默认本地数据库路径。
        std::string host = "127.0.0.1"; // 默认只监听本机。
        std::string webRoot; // 可选的 React 生产构建目录。
        int port = 8080; // 默认 API 端口。
        for (int index = 1; index < argc; ++index) { // 当前命令行参数索引。
            const std::string argument = argv[index]; // 当前参数名。
            if (argument == "--help") {
                std::cout << "englishword_server [--port 8080] [--host 127.0.0.1] "
                             "[--database path] [--web-root frontend/dist]\n";
                return 0;
            }
            if (index + 1 >= argc) {
                throw std::invalid_argument("参数缺少值：" + argument);
            }
            const std::string value = argv[++index]; // 当前参数对应的值。
            if (argument == "--port") {
                std::size_t parsed = 0; // 已解析的数字字符数。
                port = std::stoi(value, &parsed);
                if (parsed != value.size() || port < 1 || port > 65535) {
                    throw std::invalid_argument("端口必须是 1 到 65535 的整数。");
                }
            } else if (argument == "--host") {
                host = value;
            } else if (argument == "--database") {
                database = value;
            } else if (argument == "--web-root") {
                webRoot = value;
            } else {
                throw std::invalid_argument("未知参数：" + argument);
            }
        }
        const auto parent = std::filesystem::path(database).parent_path(); // 数据库父目录。
        if (!parent.empty()) {
            std::filesystem::create_directories(parent);
        }
        englishword::WordRepository repository(database); // 持久化示例词库。
        englishword::Api api(repository); // HTTP 路由及业务桥接。
        auto& app = drogon::app(); // Drogon 框架单例。
        app.setLogLevel(trantor::Logger::kWarn)
            .setThreadNum(2)
            .setClientMaxBodySize(64 * 1024)
            .enableSession(3600, drogon::Cookie::SameSite::kLax)
            .addListener(host, static_cast<std::uint16_t>(port));
        if (!webRoot.empty()) {
            if (!std::filesystem::is_regular_file(std::filesystem::path(webRoot) / "index.html")) {
                throw std::invalid_argument("web-root 缺少 index.html，请先构建 React 前端。");
            }
            app.setDocumentRoot(webRoot);
            app.setHomePage("index.html");
        }
        api.registerRoutes(app);
        std::cout << "EnglishWord API: http://" << host << ':' << port << "\n"
                  << "Demo mode: accounts and study history are not implemented yet.\n" << std::flush;
        app.run();
    } catch (const std::exception& error) { // 启动错误写入标准错误。
        std::cerr << "启动失败：" << error.what() << '\n';
        return 1;
    }
    return 0;
}
