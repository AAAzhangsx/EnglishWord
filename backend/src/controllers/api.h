#pragma once

#include "core/study_engine.h"
#include "repositories/word_repository.h"

#include <drogon/drogon.h>

#include <functional>
#include <memory>
#include <mutex>

namespace englishword {

/// HTTP 控制器集合。路由、Cookie 会话、JSON 编解码由 Drogon 提供。
class Api {
public:
    /// repository 为数据访问对象，必须在服务器关闭之后才销毁。
    explicit Api(WordRepository& repository);
    /// 将健康检查、词库和示例背诵接口注册到 app。
    void registerRoutes(drogon::HttpAppFramework& app);

private:
    using Callback = std::function<void(const drogon::HttpResponsePtr&)>;
    /// 调用业务 action 并统一处理异常，callback 返回 HTTP 响应。
    void respond(const Callback& callback, const std::function<Json::Value()>& action);
    /// 从 request 的 Drogon 会话读取当前背诵引擎，不存在时抛异常。
    std::shared_ptr<StudyEngine> engine(const drogon::HttpRequestPtr& request) const;
    /// 返回引擎的当前状态，隐藏未作答题目的英文答案。
    Json::Value snapshot(StudyEngine& engine) const;

    WordRepository& m_repository; ///< 非拥有的数据库仓储引用。
    std::mutex m_mutex;           ///< 序列化示例业务访问，防止同会话并发作答重复计分。
};

} // namespace englishword
