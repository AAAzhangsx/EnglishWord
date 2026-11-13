#pragma once

#include <cstdint>
#include <string>
#include <vector>

namespace englishword {

/// 单词实体；业务层使用标准 C++ 类型，便于独立测试和以后更换界面。
struct Word {
    std::int64_t id = 0;                 ///< 数据库单词编号。
    std::string english;                 ///< UTF-8 英文拼写。
    std::string partOfSpeech;            ///< 词性，例如 n.、v.。
    std::vector<std::string> meanings;    ///< UTF-8 中文释义，可补充多条。
};

/// 当前提供看中文选英文和看中文拼写两种演示模式。
enum class StudyMode { MultipleChoice, Spelling, Meaning };

/// 一次提交的结果，由界面决定如何展示。
struct AnswerResult {
    bool correct = false;                ///< 此次输入是否正确。
    bool firstAttempt = false;           ///< 是否为当前题首次提交。
    int scoreDelta = 0;                  ///< 本次得分变化，重试为零。
    std::string expectedAnswer;          ///< 正确英文答案。
};

} // namespace englishword
