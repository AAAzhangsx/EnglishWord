#include "repositories/user_repository.h"

#include <stdexcept>
#include <utility>

namespace englishword {
namespace {

/// 把一行查询结果转成 User。
User toUser(const drogon::orm::Row& row)
{
    User user;
    user.id = row["id"].as<std::int64_t>();
    user.username = row["username"].as<std::string>();
    user.passwordHash = row["password_hash"].as<std::string>();
    user.createdAt = row["created_at"].as<std::string>();
    return user;
}

} // namespace

UserRepository::UserRepository(const std::string& path)
    : m_client(drogon::orm::DbClient::newSqlite3Client("filename=" + path, 1))
{
    if (!m_client) {
        throw std::runtime_error("Drogon 未启用 SQLite 支持。");
    }
}

std::optional<User> UserRepository::findByUsername(const std::string& username) const
{
    const auto rows = m_client->execSqlSync(
        "SELECT id, username, password_hash, created_at FROM users WHERE username = ?", username);
    if (rows.size() == 0) {
        return std::nullopt;
    }
    return toUser(rows[0]);
}

std::optional<User> UserRepository::findById(std::int64_t id) const
{
    const auto rows = m_client->execSqlSync(
        "SELECT id, username, password_hash, created_at FROM users WHERE id = ?", id);
    if (rows.size() == 0) {
        return std::nullopt;
    }
    return toUser(rows[0]);
}

std::int64_t UserRepository::create(const std::string& username, const std::string& passwordHash) const
{
    m_client->execSqlSync("INSERT INTO users(username, password_hash) VALUES (?, ?)", username,
                          passwordHash);
    const auto rows = m_client->execSqlSync("SELECT last_insert_rowid() AS id");
    return rows[0]["id"].as<std::int64_t>();
}

} // namespace englishword
