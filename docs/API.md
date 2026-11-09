# API 约定

基础路径 `/api`，请求和响应为 JSON。业务错误返回 `{"error":"可展示的说明"}` 和对应 4xx 状态，内部异常返回 500。Drogon 管理 Cookie 会话；本轮学习不跨浏览器共享，不是登录账号。

## 已实现

| 方法 | 路径 | 请求体 | 响应 |
| --- | --- | --- | --- |
| GET | /health | 无 | status、mode、framework |
| GET | /wordbooks | 无 | items：公共词库数组 |
| GET | /wordbooks/{id}/words | 无 | items：单词数组，包含多条 meanings |
| GET | /study | 无 | 当前 StudyState；无任务返回 404 |
| POST | /study/start | wordbookId、mode | 开始或替换当前浏览器的任务 |
| POST | /study/answer | answer 字符串 | StudyState，加 result |
| POST | /study/next | 空对象 | 答对后进入下一题；不允许时返回 409 |
| POST | /study/review | 空对象 | 本轮结束后用错词创建拼写轮次 |

`mode` 为 `choice` 或 `spelling`。选择题至少需要两个不同单词，最多四个选项。空白输入返回 400，不扣分。

```json
{
  "mode": "spelling",
  "score": 0,
  "correctCount": 0,
  "totalCount": 10,
  "currentIndex": 0,
  "wrongCount": 0,
  "finished": false,
  "canAdvance": false,
  "question": {
    "wordId": 1,
    "partOfSpeech": "n.",
    "meanings": ["苹果"],
    "choices": []
  }
}
```

提交答案后的 `result`：

```json
{
  "correct": false,
  "firstAttempt": true,
  "scoreDelta": -10,
  "message": "回答错误，请重试。首字母提示：a"
}
```

`currentIndex` 从 0 开始，结束后等于 `totalCount`，`question` 为 null。标准英文答案不放进拼写题目的响应。演示词库是公开预览数据，不用于正式考试。

## 后续接口草案：尚未注册路由

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| POST | /auth/register | 注册 |
| POST | /auth/login | 登录并更新会话标识 |
| POST | /auth/logout | 注销 |
| GET | /auth/me | 当前用户 |
| POST | /wordbooks | 创建私人词库 |
| POST | /wordbooks/{id}/import | 导入 UTF-8 TSV |
| POST | /wordbooks/{id}/words | 添加单词 |
| PATCH / DELETE | /words/{id} | 修改或删除单词 |
| POST | /words/{id}/meanings | 补充释义 |
| GET | /wrong-words | 用户的持久化错题本 |
| GET | /statistics | 用户历史成绩 |
| POST | /checkins | 当日打卡，重复提交不增加天数 |
| GET | /checkins | 打卡日期与累计天数 |

真实账号上线前，应完成会话认证、对象所有权校验、密码哈希和写操作 CSRF 防护，不能只凭前端提交的 userId 授权。
