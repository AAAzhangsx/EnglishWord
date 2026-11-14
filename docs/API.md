# API 规范（字段速查）

基础地址：`http://127.0.0.1:8080/api`。字段使用 camelCase，数据库使用 snake_case。integer 是整数，string[] 是字符串数组。

有请求体时设置 `Content-Type: application/json`。浏览器自动携带 Cookie，curl 需要保存 Cookie。前端不传 userId、标准答案、分数，由后端识别身份、判题和计分。

当前请求体上限 64 KiB，超过时由框架拒绝。

## 1. 已实现的 8 个接口

请求示例中的字段均必传；GET 无请求体。当前成功状态均为 200。

| 方法 / 路径（省略 /api） | 传什么 | 返回什么 | 主要业务错误 |
| --- | --- | --- | --- |
| GET /health | 无 | `{"status":"ok","mode":"demo","framework":"Drogon"}`，三项均为 string | 内部异常 500 |
| GET /wordbooks | 无 | `{"items": Wordbook[]}` | 内部异常 500 |
| GET /wordbooks/{id}/words | 路径 id: integer，词库编号 | `{"items": Word[]}` | 词库不存在或为空 404 |
| GET /study | 无，靠 Cookie 找当前任务 | StudyState | 无任务 404 |
| POST /study/start | `{"wordbookId":1,"mode":"spelling"}` | StudyState，替换当前任务，分数归零 | 空词库、无效模式或字段 400 |
| POST /study/answer | `{"answer":"apple"}`，answer: string | StudyState，额外含 result: AnswerResult | 空白或字段错误 400，无任务 404，轮次已结束 409 |
| POST /study/next | `{}`，无业务字段 | StudyState，移动到下一题 | 无任务 404，当前题未答对或已结束 409 |
| POST /study/review | `{}`，无业务字段 | 新一轮 StudyState，只含上一轮错词，采用拼写模式 | 无错词 400，无任务 404，上一轮未结束 409 |

start.wordbookId 是 integer；start.mode 是 string，只允许 choice（看中文选英文）和 spelling（看中文拼写）和meaning(看英文写中文)。选择题至少需要两个不同单词，最多四个选项。不存在的词库在 start 中也按空词库返回 400。

### Wordbook：词库

| 字段 | 类型 | 含义 / 例子 |
| --- | --- | --- |
| id | integer | 词库编号，例如 1 |
| name | string | 词库名称，例如“入门示例词库” |
| wordCount | integer | 不重复单词数，例如 10 |
| isDemo | boolean | 是否公共示例，目前恒为 true |

### Word：预览用单词

| 字段 | 类型 | 含义 / 例子 |
| --- | --- | --- |
| id | integer | 单词编号，例如 2 |
| english | string | 英文，例如 "book" |
| partOfSpeech | string | 词性，例如 "n." |
| meanings | string[] | 多条释义，例如 ["书", "书籍"] |

### StudyState：背诵接口共用的返回结构

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| mode | string | choice / spelling |
| score | integer | 本轮分数，允许负数 |
| correctCount | integer | 首次答对题数，重试答对不计入 |
| totalCount | integer | 本轮总题数 |
| currentIndex | integer | 当前题下标，从 0 开始，结束时等于 totalCount |
| wrongCount | integer | 本轮首次答错的单词数，纠正后仍保留供轮末复习 |
| finished | boolean | 本轮是否全部完成 |
| canAdvance | boolean | 当前题是否已答对，决定“下一题”能否点击 |
| question | Question / null | 当前题目，结束后为 null |
| result | AnswerResult，可省略 | **只有 answer 接口成功响应包含**；GET /study 不返回历史反馈 |

Question 的字段：

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| wordId | integer | 当前题对应的单词编号 |
| partOfSpeech | string | 词性，例如 "n." |
| meanings | string[] | 提示中文，例如 ["苹果"] |
| english | string[] |提示英文,例如["apple"] |
| choices | string[] | 选择题选项，提交选项文本作为 answer；拼写题为 [] |

题目不含独立的标准英文(或中文,取决于模式)答案字段。选择题选项顺序可能随响应改变，前端不能提交选项序号。

AnswerResult 的字段：

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| correct | boolean | **本次**输入是否正确 |
| firstAttempt | boolean | 是否当前题首次提交有效答案 |
| scoreDelta | integer | 首次对 +10、首次错 -10、即时重试 0 |
| message | string | 反馈文字，错误时带首字母提示(非meaning模式) |

### 一个完整返回例子

POST /study/answer，请求 `{"answer":"aple"}`，首次答错：

```json
{
  "mode": "spelling",
  "score": -10,
  "correctCount": 0,
  "totalCount": 10,
  "currentIndex": 0,
  "wrongCount": 1,
  "finished": false,
  "canAdvance": false,
  "question": {"wordId": 1, "partOfSpeech": "n.", "meanings": ["苹果"], "choices": []},
  "result": {"correct": false, "firstAttempt": true, "scoreDelta": -10, "message": "回答错误，请重试。首字母提示：a"}
}
```

再提交 `{"answer":"apple"}`：correct=true、firstAttempt=false、scoreDelta=0、score=-10、canAdvance=true，此时才调用 next。空白输入返回 400，不占用首次作答机会。

业务错误格式：`{"error":"请先正确回答当前题目。"}`，error: string。400 表示参数错误，404 表示资源或任务不存在，409 表示操作顺序不对，500 表示内部错误。未注册路由等框架错误不保证采用此 JSON 格式。

## 2. 待开发接口草案（不能用于当前联调）

下表约定未来字段。示例值说明类型，? 表示可选。其余字段必传；路径 id 是整数；私有接口从登录 Cookie 识别用户。

| 方法 / 路径（省略 /api） | 请求字段 / 示例 | 成功返回字段 / 示例 |
| --- | --- | --- |
| POST /auth/register | `{"username":"xiaoming","password":"example-password"}` | `{"user":{"id":1,"username":"xiaoming","createdAt":"2026-11-09T10:00:00Z"}}` |
| POST /auth/login | 同注册请求 | 同上，响应头另设置登录 Cookie，不返回 Token |
| POST /auth/logout | `{}` | `{"success":true}` |
| GET /auth/me | 无 | `{"user": User}`，User 字段同注册返回 |
| POST /wordbooks | `{"name":"四级词库"}` | `{"id":2,"name":"四级词库","wordCount":0,"isDemo":false}` |
| POST /wordbooks/{id}/import | `{"content":"english\tpos\tmeaning\napple\tn.\t苹果","duplicatePolicy":"merge"}` | `{"importedCount":1,"mergedCount":0,"skippedCount":0}` |
| POST /wordbooks/{id}/words | `{"english":"book","partOfSpeech":"n.","meanings":["书"]}` | Word |
| PATCH /words/{id} | english?: string、partOfSpeech?: string，至少一个，例如 `{"partOfSpeech":"n./v."}` | 更新后的 Word |
| DELETE /words/{id} | 无 | `{"success":true}` |
| POST /words/{id}/meanings | `{"meaning":"书籍"}`，meaning: string | 补充后的 Word |
| GET /wrong-words | `?mastered=false`，可选 boolean，不传查全部 | `{"items":[{"word":Word,"wrongCount":2,"mastered":false,"updatedAt":"2026-11-09T10:00:00Z"}]}` |
| GET /statistics | 无 | `{"totalScore":80,"sessionCount":1,"firstAttemptCount":10,"correctCount":9,"accuracy":0.9,"passThreshold":0.8,"passed":true}` |
| POST /checkins | `{}`，日期由服务器生成 | `{"date":"2026-11-09","alreadyCheckedIn":false,"totalDays":1}` |
| GET /checkins | 无 | `{"dates":["2026-11-09"],"totalDays":1}` |

补充约定：

- 注册/登录的 username、password 均为 string；User.createdAt、updatedAt 是 UTC 时间字符串。密码不出现在响应中。
- 导入 content 为 UTF-8 TSV 字符串，duplicatePolicy 为 merge（同词合并新释义）或 skip（跳过同词）。三个 Count 均为 integer。有非法行整批回滚，返回 400：`{"error":"导入失败","errors":[{"line":2,"message":"缺少中文释义"}]}`。
- Word.meanings 至少一条非空释义；重复补充同一释义不新增记录。同一词库的英文忽略 ASCII 大小写去重。
- statistics 中分数、次数是 integer，accuracy、passThreshold 为 0～1 的 number，passed 为 boolean；无有效作答时 accuracy=0、passed=false。示例的 80 分与 90% 正确率不矛盾：九对一错为 9×10−10=80。
- checkin.date、dates[] 为 YYYY-MM-DD string，totalDays: integer。按 Asia/Shanghai 取当天；重复提交返回 alreadyCheckedIn=true，totalDays 不增加。
- 私有接口未登录返回 401，无权访问其他用户对象返回 403，用户名重复返回 409。过关阈值 80% 是待老师确认的约定。

## 3. 调用与答辩

顺序：wordbooks → words（预览）→ study/start → study/answer → study/next → … → study/review。

“为什么不在前端算分？”——前端只传 answer，后端检查当前题和首次作答状态，避免修改网页或重复提交刷分。

“为什么刷新后还能继续？”——Cookie 标识当前浏览器，Drogon 会话保存本轮状态，刷新后 GET /study 恢复。**闲置一小时或后端重启会清空，当前还不是历史成绩持久化。**

更多例子见 [BUSINESS.md](BUSINESS.md)，数据库对应关系见 [DATABASE.md](DATABASE.md)，启动见 [LOCAL.md](LOCAL.md)。
