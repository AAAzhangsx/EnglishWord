#include "repositories/word_repository.h"

#include <chrono>
#include <filesystem>
#include <iostream>
#include <stdexcept>

/// 验证迁移、示例导入、多释义和重启幂等性；通过返回零。
int main()
{
    const auto unique = std::chrono::steady_clock::now().time_since_epoch().count(); // 临时库唯一后缀。
    const auto path = std::filesystem::temp_directory_path() /
                      ("englishword-test-" + std::to_string(unique) + ".sqlite"); // 隔离测试文件。
    try {
        for (int run = 0; run < 2; ++run) { // 两次打开模拟重启，不能重复导入。
            englishword::WordRepository repository(path.string()); // 当前数据库客户端。
            const auto books = repository.listDemoWordbooks(); // 公共词库列表。
            if (books.size() != 1 || books[0]["wordCount"].asInt() != 10) {
                throw std::runtime_error("示例词库应包含十个唯一单词。");
            }
            const auto words = repository.listDemoWords(books[0]["id"].asInt64()); // 示例单词。
            bool foundMultipleMeanings = false; // 是否找到补充释义样本。
            for (const auto& word : words) { // 当前单词。
                if (word.english == "book" && word.meanings.size() == 2) {
                    foundMultipleMeanings = true;
                }
            }
            if (!foundMultipleMeanings || !repository.listDemoWords(-1).empty()) {
                throw std::runtime_error("多释义或不存在的词库查询不正确。");
            }
        }
        std::filesystem::remove(path);
        std::cout << "Database migration and persistence passed.\n";
    } catch (const std::exception& error) { // 测试失败原因。
        std::filesystem::remove(path);
        std::cerr << error.what() << '\n';
        return 1;
    }
    return 0;
}
