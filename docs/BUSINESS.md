# 业务例子与答辩口径

## 例 1：答错再改对，为什么还是扣分？（已实现）

题目中文“苹果”，标准答案 apple。

| 操作 | 接口 / 关键字段 | 分数 / 状态 |
| --- | --- | --- |
| 开始一轮 | start：wordbookId=1、mode=spelling | score=0、currentIndex=0 |
| 输入 aple | answer：answer="aple" | correct=false、firstAttempt=true、scoreDelta=-10、score=-10、wrongCount=1 |
| 输入 apple | answer：answer="apple" | correct=true、firstAttempt=false、scoreDelta=0、score=-10、canAdvance=true |
| 点击下一题 | next：{} | currentIndex=1，开始 book，之后首次答对加 10 |

答辩说法：首次提交衡量记忆效果，重试用于纠错，所以纠正不会抹掉首次错误，也不能靠重复提交加分。空白输入是无效操作，不扣分、不消耗首次机会。

若 10 个词九题首次对、一题首次错：得分 `9×10−1×10=80`，首次正确率 `9÷10=90%`。**分数与正确率是两个指标。**

## 例 2：错题重背为什么只剩一个词？（已实现）

本轮只有 apple 首次答错，其余都首次答对。即使已在原题纠正 apple，轮末 wrongCount 仍为 1。点击 review 后新一轮只有 apple，score 从 0 开始，用拼写模式，避免一个错词无法凑选择题。复习轮首次答对得 10 分、wrongCount=0，显示“没有错题，继续努力”。

答辩说法：原轮衡量第一次掌握程度，复习轮检验巩固效果，两轮分别计分。现在只保存临时轮次，未来再将记录写入 study_sessions、answer_records 和 wrong_words。

## 例 3：book 为什么对应两条中文解释？（示例读取已实现，编辑待开发）

```text
words：id=2，english=book，part_of_speech=n.
word_meanings：word_id=2，meaning=书
word_meanings：word_id=2，meaning=书籍
API：{"id":2,"english":"book","partOfSpeech":"n.","meanings":["书","书籍"]}
```

答辩说法：单词和释义是一对多关系。补充“书籍”只新增一行释义，不复制整条单词；重复补充“书籍”受唯一约束限制。示例 TSV 里两行 book 实际合并为一个单词和两条释义。

## 例 4：同一天打卡两次怎么算？（待开发设计）

用户 1 在 2026-11-09 第一次打卡：新增 `(1, "2026-11-09")`，返回 alreadyCheckedIn=false、totalDays=1。同一天再点一次：不新增，返回 alreadyCheckedIn=true、totalDays 仍为 1。第二天打卡后 totalDays=2。即使没背单词，也允许只打卡。

答辩说法：打卡统计的是不同日期，不是点击次数。用用户和日期的联合主键兜底，重复请求也不会多算。日期由服务器按 Asia/Shanghai 生成，不相信前端随意提交的日期。

## 例 5：两个人的同名词库会互相影响吗？（待开发设计）

用户 A 和 B 都创建“四级词库”，名称相同，但 wordbooks.id 不同，owner_user_id 也不同。A 修改单词时，后端从登录会话取得 A 的用户编号，沿单词→词库检查所有权；不能只凭前端传来的 wordId 执行修改。

答辩说法：词库名称用于展示，编号用于关联，owner_user_id 用于用户隔离。当前只开放公共示例，并未实现账号和私人词库。

## 例 6：导入文件为什么要用事务？（用户文件导入待开发）

用户导入 20 行词库，第 8 行缺少中文。约定整批回滚，返回 `{"error":"导入失败","errors":[{"line":8,"message":"缺少中文释义"}]}`，不会留下前七行的半成品。修好后重传，同词按 merge 合并新释义。

答辩说法：事务保证一次导入要么完整成功，要么全部撤销。当前已用事务保护“首次建表 + 内嵌示例导入”，对用户上传的 TSV 导入接口尚待开发。

## 三句话介绍整个项目

“React 与 Ant Design 负责页面，C++ Drogon 提供接口，SQLite 保存词库。判题和计分由 C++ 后端统一完成，前端只传答案。现阶段已跑通学习与本轮复习，账号、历史成绩和打卡按照已定接口继续开发。”
