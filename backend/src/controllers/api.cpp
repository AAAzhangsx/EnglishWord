#include "controllers/api.h"

#include <stdexcept>
#include <string>

namespace englishword {
namespace {

/// 业务错误携带 HTTP 状态码。
class ApiError : public std::runtime_error {
public:
    /// status 为 HTTP 状态，message 为可以展示给用户的错误说明。
    ApiError(drogon::HttpStatusCode status, const std::string& message)
        : std::runtime_error(message), status(status) {}
    drogon::HttpStatusCode status; ///< 对应的 HTTP 状态码。
};

/// 验证 request 的 JSON 请求体并返回对象引用，不合法时抛 400 错误。
const Json::Value& body(const drogon::HttpRequestPtr& request)
{
    const auto& json = request->getJsonObject(); // Drogon 解析的请求 JSON。
    if (!json || !json->isObject()) {
        throw ApiError(drogon::k400BadRequest, "请求体必须是 JSON 对象。");
    }
    return *json;
}

/// 将 word 转成词库预览需要的 JSON 对象。
Json::Value wordJson(const Word& word)
{
    Json::Value value; // 单词的公开表示。
    value["id"] = Json::Int64(word.id);
    value["english"] = word.english;
    value["partOfSpeech"] = word.partOfSpeech;
    value["meanings"] = Json::Value(Json::arrayValue);
    for (const auto& meaning : word.meanings) { // 当前中文释义。
        value["meanings"].append(meaning);
    }
    return value;
}

} // namespace

Api::Api(WordRepository& repository) : m_repository(repository) {}

void Api::respond(const Callback& callback, const std::function<Json::Value()>& action)
{
    Json::Value value; // 统一的 JSON 响应。
    auto status = drogon::k200OK; // 默认成功状态。
    try {
        const std::lock_guard<std::mutex> lock(m_mutex); // 保证会话业务操作串行。
        value = action();
    } catch (const ApiError& error) { // 可公开的业务错误。
        status = error.status;
        value["error"] = error.what();
    } catch (const std::invalid_argument& error) { // 输入校验失败。
        status = drogon::k400BadRequest;
        value["error"] = error.what();
    } catch (const std::logic_error& error) { // 当前背诵状态不允许操作。
        status = drogon::k409Conflict;
        value["error"] = error.what();
    } catch (const std::exception& error) { // 内部错误写日志，响应不包含数据库细节。
        LOG_ERROR << error.what();
        status = drogon::k500InternalServerError;
        value["error"] = "服务器内部错误，请查看后端日志。";
    }
    auto response = drogon::HttpResponse::newHttpJsonResponse(value); // Drogon JSON 响应。
    response->setStatusCode(status);
    response->addHeader("Cache-Control", "no-store");
    callback(response);
}

std::shared_ptr<StudyEngine> Api::engine(const drogon::HttpRequestPtr& request) const
{
    const auto current = request->session()->getOptional<std::shared_ptr<StudyEngine>>("study"); // 当前浏览器会话。
    if (!current || !*current) {
        throw ApiError(drogon::k404NotFound, "当前没有背诵任务，请先开始一轮背诵。");
    }
    return *current;
}

Json::Value Api::snapshot(StudyEngine& study) const
{
    Json::Value value; // 当前背诵状态。
    value["mode"] = study.mode() == StudyMode::MultipleChoice ? "choice" : "spelling";
    value["score"] = study.score();
    value["correctCount"] = Json::UInt64(study.correctCount());
    value["totalCount"] = Json::UInt64(study.totalCount());
    value["currentIndex"] = Json::UInt64(study.currentIndex());
    value["finished"] = study.finished();
    value["canAdvance"] = study.canAdvance();
    value["wrongCount"] = Json::UInt64(study.wrongWords().size());
    value["question"] = Json::nullValue;
    if (!study.finished()) {
        const auto& word = study.currentWord(); // 当前待答的单词。
        Json::Value question; // 不含标准答案的题目。
        question["wordId"] = Json::Int64(word.id);
        question["partOfSpeech"] = word.partOfSpeech;
        question["meanings"] = wordJson(word)["meanings"];
        question["choices"] = Json::Value(Json::arrayValue);
        if (study.mode() == StudyMode::MultipleChoice) {
            for (const auto& option : study.choices()) { // 当前题的英文选项。
                question["choices"].append(option);
            }
        }
        value["question"] = question;
    }
    return value;
}

void Api::registerRoutes(drogon::HttpAppFramework& app)
{
    app.registerHandler("/api/health", [this](const drogon::HttpRequestPtr&, Callback&& callback) {
        respond(callback, [] {
            Json::Value value; // 健康检查响应。
            value["status"] = "ok";
            value["mode"] = "demo";
            value["framework"] = "Drogon";
            return value;
        });
    }, {drogon::Get});

    app.registerHandler("/api/wordbooks", [this](const drogon::HttpRequestPtr&, Callback&& callback) {
        respond(callback, [this] {
            Json::Value value; // 词库列表响应。
            value["items"] = m_repository.listDemoWordbooks();
            return value;
        });
    }, {drogon::Get});

    app.registerHandler("/api/wordbooks/{1}/words",
        [this](const drogon::HttpRequestPtr&, Callback&& callback, std::int64_t bookId) {
            respond(callback, [this, bookId] {
                const auto words = m_repository.listDemoWords(bookId); // 当前公共词库的单词。
                if (words.empty()) {
                    throw ApiError(drogon::k404NotFound, "词库不存在或没有单词。");
                }
                Json::Value value; // 词库预览响应。
                value["items"] = Json::Value(Json::arrayValue);
                for (const auto& word : words) { // 当前预览单词。
                    value["items"].append(wordJson(word));
                }
                return value;
            });
        }, {drogon::Get});

    app.registerHandler("/api/study", [this](const drogon::HttpRequestPtr& request, Callback&& callback) {
        respond(callback, [this, &request] { return snapshot(*engine(request)); });
    }, {drogon::Get});

    app.registerHandler("/api/study/start", [this](const drogon::HttpRequestPtr& request, Callback&& callback) {
        respond(callback, [this, &request] {
            const auto& json = body(request); // 创建背诵任务的参数。
            if (!json["wordbookId"].isInt64() || !json["mode"].isString()) {
                throw std::invalid_argument("请提供 wordbookId 和 mode。");
            }
            const auto mode = json["mode"].asString(); // 用户选择的题型。
            if (mode != "choice" && mode != "spelling") {
                throw std::invalid_argument("mode 必须是 choice 或 spelling。");
            }
            auto words = m_repository.listDemoWords(json["wordbookId"].asInt64()); // 所选词库单词。
            if (mode == "choice" && words.size() < 2) {
                throw std::invalid_argument("选择题至少需要两个不同单词。");
            }
            auto study = std::make_shared<StudyEngine>(); // 当前浏览器的一轮背诵。
            study->start(std::move(words), mode == "choice" ? StudyMode::MultipleChoice : StudyMode::Spelling);
            request->session()->modify<std::shared_ptr<StudyEngine>>("study",
                [&study](auto& current) { current = study; });
            return snapshot(*study);
        });
    }, {drogon::Post});

    app.registerHandler("/api/study/answer", [this](const drogon::HttpRequestPtr& request, Callback&& callback) {
        respond(callback, [this, &request] {
            const auto& json = body(request); // 用户提交的答案。
            if (!json["answer"].isString()) {
                throw std::invalid_argument("answer 必须是字符串。");
            }
            auto study = engine(request); // 当前背诵引擎。
            const auto result = study->submit(json["answer"].asString()); // 判题与计分结果。
            auto value = snapshot(*study); // 作答后的背诵状态。
            value["result"]["correct"] = result.correct;
            value["result"]["firstAttempt"] = result.firstAttempt;
            value["result"]["scoreDelta"] = result.scoreDelta;
            value["result"]["message"] = result.correct ? "回答正确，可以进入下一题。" :
                "回答错误，请重试。首字母提示：" + result.expectedAnswer.substr(0, 1);
            return value;
        });
    }, {drogon::Post});

    app.registerHandler("/api/study/next", [this](const drogon::HttpRequestPtr& request, Callback&& callback) {
        respond(callback, [this, &request] {
            auto study = engine(request); // 当前背诵任务。
            study->advance();
            return snapshot(*study);
        });
    }, {drogon::Post});

    app.registerHandler("/api/study/review", [this](const drogon::HttpRequestPtr& request, Callback&& callback) {
        respond(callback, [this, &request] {
            auto previous = engine(request); // 上一轮背诵。
            if (!previous->finished()) {
                throw std::logic_error("请先完成当前轮次。");
            }
            if (previous->wrongWords().empty()) {
                throw std::invalid_argument("没有错题，继续努力！");
            }
            auto study = std::make_shared<StudyEngine>(); // 错题重背采用拼写，兼容只有一个错词。
            study->start(previous->wrongWords(), StudyMode::Spelling);
            request->session()->modify<std::shared_ptr<StudyEngine>>("study",
                [&study](auto& current) { current = study; });
            return snapshot(*study);
        });
    }, {drogon::Post});
}

} // namespace englishword
