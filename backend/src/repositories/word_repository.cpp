#include "repositories/word_repository.h"
#include "resources.h"

#include <sstream>
#include <stdexcept>
#include <utility>

namespace englishword {

WordRepository::WordRepository(const std::string& path)
    : m_client(drogon::orm::DbClient::newSqlite3Client("filename=" + path, 1))
{
    if (!m_client) {
        throw std::runtime_error("Drogon 未启用 SQLite 支持。");
    }
    initialize();
}

void WordRepository::initialize()
{
    m_client->execSqlSync("PRAGMA foreign_keys = ON");
    const auto result = m_client->execSqlSync("PRAGMA user_version"); // 当前数据库版本。
    const auto version = result[0][0].as<int>(); // 已应用的迁移编号。
    if (version > 1) {
        throw std::runtime_error("数据库版本高于当前程序支持的版本。");
    }
    if (version == 1) {
        return;
    }
    auto transaction = m_client->newTransaction(); // Drogon 事务，作用域结束时提交。
    try {
        std::istringstream migration(resources::schema); // 简单 DDL 脚本，不包含触发器。
        std::string statement; // 当前 SQL 语句。
        while (std::getline(migration, statement, ';')) {
            if (statement.find_first_not_of(" \t\r\n") != std::string::npos) {
                transaction->execSqlSync(statement);
            }
        }
        transaction->execSqlSync("INSERT INTO wordbooks(name) VALUES (?)", "入门示例词库");
        const auto bookId = transaction->execSqlSync("SELECT last_insert_rowid() AS id")[0]["id"]
                                .as<std::int64_t>(); // 公共示例词库编号。
        std::istringstream source(resources::demoTsv); // UTF-8 示例 TSV。
        std::string line; // 当前词库数据行。
        std::getline(source, line); // 跳过表头。
        while (std::getline(source, line)) {
            if (line.empty()) {
                continue;
            }
            std::istringstream row(line); // 按制表符解析的当前行。
            std::string english, partOfSpeech, meaning; // 英文、词性和中文释义。
            if (!std::getline(row, english, '\t') || !std::getline(row, partOfSpeech, '\t') ||
                !std::getline(row, meaning)) {
                throw std::runtime_error("内嵌示例词库格式错误。");
            }
            transaction->execSqlSync(
                "INSERT OR IGNORE INTO words(wordbook_id, english, part_of_speech) VALUES (?, ?, ?)",
                bookId, english, partOfSpeech);
            const auto wordId = transaction->execSqlSync(
                "SELECT id FROM words WHERE wordbook_id = ? AND english = ?", bookId, english)
                                    [0]["id"].as<std::int64_t>(); // 已有或新建的单词编号。
            transaction->execSqlSync("INSERT OR IGNORE INTO word_meanings(word_id, meaning) VALUES (?, ?)",
                                     wordId, meaning);
        }
        transaction->execSqlSync("PRAGMA user_version = 1");
    } catch (...) {
        transaction->rollback();
        throw;
    }
    transaction.reset(); // 提交事务并将后续数据库操作排在提交之后。
    m_client->execSqlSync("SELECT 1");
}

Json::Value WordRepository::listDemoWordbooks() const
{
    const auto rows = m_client->execSqlSync(
        "SELECT b.id, b.name, COUNT(w.id) AS word_count FROM wordbooks b "
        "LEFT JOIN words w ON w.wordbook_id = b.id WHERE b.owner_user_id IS NULL "
        "GROUP BY b.id, b.name ORDER BY b.id"); // 公共词库和单词数量。
    Json::Value books(Json::arrayValue); // 返回给 API 的词库数组。
    for (const auto& row : rows) { // 当前词库。
        Json::Value book; // 当前词库的 JSON 表示。
        book["id"] = Json::Int64(row["id"].as<std::int64_t>());
        book["name"] = row["name"].as<std::string>();
        book["wordCount"] = row["word_count"].as<int>();
        book["isDemo"] = true;
        books.append(book);
    }
    return books;
}

std::vector<Word> WordRepository::listDemoWords(std::int64_t bookId) const
{
    const auto rows = m_client->execSqlSync(
        "SELECT w.id, w.english, w.part_of_speech, m.meaning FROM words w "
        "JOIN wordbooks b ON b.id = w.wordbook_id "
        "LEFT JOIN word_meanings m ON m.word_id = w.id "
        "WHERE b.id = ? AND b.owner_user_id IS NULL ORDER BY w.id, m.id", bookId); // 参数化查询。
    std::vector<Word> words; // 组合多释义后的单词实体。
    for (const auto& row : rows) { // 单词和单条释义的查询行。
        const auto id = row["id"].as<std::int64_t>(); // 当前行的单词编号。
        if (words.empty() || words.back().id != id) {
            Word word; // 首次遇到的单词。
            word.id = id;
            word.english = row["english"].as<std::string>();
            word.partOfSpeech = row["part_of_speech"].as<std::string>();
            words.push_back(std::move(word));
        }
        if (!row["meaning"].isNull()) {
            words.back().meanings.push_back(row["meaning"].as<std::string>());
        }
    }
    return words;
}

} // namespace englishword
