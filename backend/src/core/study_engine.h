#pragma once

#include "core/word.h"

#include <cstddef>
#include <random>
#include <vector>

namespace englishword {

/// 管理一轮背诵，不依赖 Qt、数据库或界面。
class StudyEngine {
public:
    /// 创建引擎，初始化随机出题所用的随机数生成器。
    StudyEngine();

    /// 开始新一轮。words 为题目列表，mode 为模式；列表为空或答案重复时抛异常。
    void start(std::vector<Word> words, StudyMode mode);
    /// 返回当前单词的只读引用；未开始或已经完成时抛 std::logic_error。
    const Word& currentWord() const;
    /// 返回当前题最多四个不重复英文选项；已完成时抛 std::logic_error。
    std::vector<std::string> choices();
    /// 提交答案并返回结果；空白输入抛 std::invalid_argument，且不扣分。
    AnswerResult submit(const std::string& answer);
    /// 当前题答对后前进，返回是否仍有下一题；未答对时抛 std::logic_error。
    bool advance();
    /// 返回本轮得分，允许负数。
    int score() const noexcept;
    /// 返回首次作答正确的题数。
    std::size_t correctCount() const noexcept;
    /// 返回题目总数。
    std::size_t totalCount() const noexcept;
    /// 返回当前题索引，从零开始，完成后等于总题数。
    std::size_t currentIndex() const noexcept;
    /// 返回是否尚未开始或已经完成。
    bool finished() const noexcept;
    /// 返回当前题是否已经答对，可以前进。
    bool canAdvance() const noexcept;
    /// 返回当前背诵模式。
    StudyMode mode() const noexcept;
    /// 返回本轮首次答错的单词；重试答对后仍保留，便于开启错题复习。
    const std::vector<Word>& wrongWords() const noexcept;

private:
    std::vector<Word> m_words;               ///< 当前轮次的单词。
    std::vector<Word> m_wrongWords;          ///< 当前轮次错词。
    std::mt19937 m_random;                   ///< 选项洗牌随机数生成器。
    StudyMode m_mode = StudyMode::Spelling;  ///< 当前背诵模式。
    std::size_t m_index = 0;                 ///< 当前题索引。
    std::size_t m_correctCount = 0;          ///< 首次答对题数。
    int m_score = 0;                         ///< 当前轮次得分。
    bool m_attempted = false;               ///< 当前题是否已经提交过答案。
    bool m_solved = false;                  ///< 当前题是否已经答对。
};

} // namespace englishword
