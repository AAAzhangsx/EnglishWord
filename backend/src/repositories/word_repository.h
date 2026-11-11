#pragma once

#include "core/word.h"

#include <drogon/orm/DbClient.h>
#include <json/json.h>

#include <string>
#include <vector>

namespace englishword {

/// 通过 Drogon ORM 数据库客户端执行参数化 SQL，避免自行封装 SQLite C API。
class WordRepository {
public:
    /// 打开 path 对应的 SQLite 文件，初始化版本和公共示例词库；失败抛异常。
    explicit WordRepository(const std::string& path);
    /// 返回公共示例词库的 JSON 数组；后续私有词库查询必须校验用户身份。
    Json::Value listDemoWordbooks() const;
    /// 返回 bookId 对应的公共示例词库单词和全部释义。
    std::vector<Word> listDemoWords(std::int64_t bookId) const;
        /// 返回公共词库和 userId 的私有词库；userId 为 0 表示未登录，只返回公共。
    Json::Value listWordbooksForUser(std::int64_t userId) const;
    /// 创建属于 ownerId 的私有词库并返回新编号。
    std::int64_t createWordbook(const std::string& name, std::int64_t ownerId) const;

private:
    /// 在事务内执行初始迁移，已经初始化的数据库不会重复导入。
    void initialize();
    drogon::orm::DbClientPtr m_client; ///< Drogon 管理的单连接 SQLite 客户端。
};

} // namespace englishword
