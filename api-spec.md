## 1. 接口总约定

### 1.1 基础路径

所有接口统一以前缀：

`/plan`

---

### 1.2 返回格式

所有接口成功时统一返回：

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {}
}
```

失败时统一返回：

```json
{
  "code": 400,
  "message": "错误提示信息",
  "data": null
}
```

---

### 1.3 认证方式

除登录/注册外，其他接口统一采用：

`Authorization: Bearer <token>`

---

## 2. 错误码

| code | 含义 |
| --- | --- |
| 200 | 成功 |
| 400 | 参数错误 |
| 401 | 未登录或 token 失效 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 409 | 数据冲突 |
| 500 | 服务异常 |

---

## 3. 用户角色

| role | 含义 |
| --- | --- |
| user | 普通用户 |
| admin | 管理员 |

---

## 4. 通用字段说明

### 4.1 优先级 priority

| 值 | 含义 |
| --- | --- |
| high | 高优先级 |
| medium | 中优先级 |
| low | 低优先级 |

### 4.2 来源 source

| 值 | 含义 |
| --- | --- |
| manual | 手动创建 |
| ai | AI 建议后确认添加 |

---

## 5. 认证模块

### 5.1 POST /plan/auth/register — 注册

#### 接口说明
- 用户注册账号。
- 注册成功后直接返回登录态信息。

#### 请求参数

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| username | string | 是 | 用户名 |
| email | string | 是 | 邮箱 |
| password | string | 是 | 密码 |

#### 返回数据

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| id | number | 用户 ID |
| username | string | 用户名 |
| token | string | 登录 token |
| role | string | 用户角色，取值为 user / admin |

#### 是否需要鉴权
- 不需要。

#### 可能的错误情况
- 用户名已存在。
- 邮箱已存在。
- 参数缺失。
- 邮箱格式不正确。
- 密码长度不足。

### 5.2 POST /plan/auth/login — 登录

#### 接口说明
- 用户使用邮箱和密码登录。
- 登录成功后返回 token。

#### 请求参数

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| email | string | 是 | 邮箱 |
| password | string | 是 | 密码 |

#### 返回数据

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| id | number | 用户 ID |
| username | string | 用户名 |
| token | string | 登录 token |
| role | string | 用户角色，取值为 user / admin |

#### 是否需要鉴权
- 不需要。

#### 可能的错误情况
- 用户不存在。
- 密码错误。
- 参数缺失。
- 邮箱格式不正确。

---

## 9. 今日任务模块

### 9.1 GET /plan/today-tasks — 获取今日任务列表

#### 接口说明
- 获取当前登录用户的今日任务列表。
- 默认查询当天任务。

#### 请求参数

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| taskDate | string | 否 | 任务日期，格式 `YYYY-MM-DD`，不传则默认当天 |
| isCompleted | boolean | 否 | 是否按完成状态筛选 |

#### 返回数据

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| list | array | 今日任务列表 |
| total | number | 当前返回任务总数 |

`list` 中每项包含：

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| id | number | 任务 ID |
| title | string | 任务标题 |
| description | string | null | 任务描述 |
| priority | string | 优先级：high / medium / low |
| isCompleted | boolean | 是否完成 |
| taskDate | string | 当前所属任务日期 |
| originalDate | string | 最初所属日期 |
| carryOverCount | number | 顺延次数 |
| sortOrder | number | 排序值 |
| source | string | 来源：manual / ai |
| createdAt | string | 创建时间 |
| updatedAt | string | 更新时间 |

#### 是否需要鉴权
- 需要。

### 9.2 POST /plan/today-tasks — 新增今日任务

#### 接口说明
- 新增一条今日任务。
- 创建时由后端自动写入 `originalDate = taskDate`。
- 当日任务数达到上限时不可继续新增。
- 当用户确认AI建议并添加任务时，前端应传 `source=ai`；手动创建时传 `source=manual` 或不传。

#### 请求参数

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| title | string | 是 | 任务标题 |
| description | string | 否 | 任务描述 |
| priority | string | 是 | 优先级：high / medium / low |
| taskDate | string | 否 | 任务日期，格式 `YYYY-MM-DD`，不传默认当天 |
| sortOrder | number | 否 | 排序值 |
| source | string | 否 | 来源：manual / ai，默认 manual |

#### 返回数据

`data` 返回新建的今日任务完整对象（字段同 9.1 list 项）。

#### 是否需要鉴权
- 需要。

#### 可能的错误情况
- 今日任务已达到 5 个上限。
- 优先级不合法。

### 9.3 PUT /plan/today-tasks/{id} — 修改今日任务

#### 接口说明
- 修改指定今日任务。
- 支持修改标题、描述、优先级、完成状态、排序值等内容。

#### 请求参数

路径参数：

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | number | 是 | 任务 ID |

Body 参数（均为可选）：

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| title | string | 否 | 任务标题 |
| description | string | 否 | 任务描述 |
| priority | string | 否 | 优先级：high / medium / low |
| isCompleted | boolean | 否 | 是否完成 |
| sortOrder | number | 否 | 排序值 |

#### 返回数据

`data` 返回更新后的今日任务完整对象。

#### 是否需要鉴权
- 需要。

#### 可能的错误情况
- 任务不存在。
- 无权限修改该任务。

### 9.4 DELETE /plan/today-tasks/{id} — 删除单个今日任务

#### 接口说明
- 删除指定今日任务。

#### 请求参数

路径参数：

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | number | 是 | 任务 ID |

#### 返回数据

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| id | number | 被删除的任务 ID |

#### 是否需要鉴权
- 需要。

### 9.5 POST /plan/today-tasks/clear — 清空今日任务

#### 接口说明
- 清空当前登录用户指定日期下的今日任务。
- 该操作应配合前端二次确认后再调用。

#### 请求参数

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| taskDate | string | 否 | 任务日期，格式 `YYYY-MM-DD`，不传默认当天 |

#### 返回数据

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| deletedCount | number | 删除的任务数量 |

#### 是否需要鉴权
- 需要。

#### 可能的错误情况
- 没有可清空的任务。

### 9.6 POST /plan/today-tasks/ai-generate — AI 生成今日任务

#### 接口说明
- 用户输入一句话，由 AI 自动生成今日任务推荐。
- 推荐数量默认生成 5 个。
- AI 生成结果受用户自定义提示词影响。
- AI生成结果仅作为建议返回，不直接写入数据库，需用户确认后再调用新增接口逐个添加。

#### 请求参数

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| prompt | string | 是 | 用户输入的一句话需求 |
| taskDate | string | 否 | 任务日期，格式 `YYYY-MM-DD`，不传默认当天 |
| count | number | 否 | 生成数量，默认 5 |

#### 返回数据

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| list | array | AI 生成的任务列表 |
| count | number | 实际生成数量 |

`list` 中每项包含：

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| title | string | 任务标题 |
| description | string | 任务描述 |
| priority | string | 优先级 |
| source | string | 来源，固定为 ai |

#### 是否需要鉴权
- 需要。

---

## 10. 长期任务模块

### 10.1 GET /plan/long-tasks — 获取长期任务列表

#### 接口说明
- 获取当前登录用户的长期任务列表。
- 可按完成状态筛选。

#### 请求参数

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| isCompleted | boolean | 否 | 是否按完成状态筛选 |

#### 返回数据

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| list | array | 长期任务列表 |
| total | number | 当前返回任务总数 |

`list` 中每项包含：

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| id | number | 任务 ID |
| title | string | 任务标题 |
| description | string | null | 任务描述 |
| priority | string | 优先级：high / medium / low |
| isCompleted | boolean | 是否完成 |
| startDate | string | 开始日期 |
| source | string | 来源：manual / ai |
| isCheckedToday | boolean | 今日是否已打卡 |
| createdAt | string | 创建时间 |
| updatedAt | string | 更新时间 |

#### 是否需要鉴权
- 需要。

### 10.2 POST /plan/long-tasks — 新增长期任务

#### 接口说明
- 新增一条长期任务。
- `startDate` 不传时由后端默认写入当天日期。
- 当用户确认AI建议并添加任务时，前端应传 `source=ai`；手动创建时传 `source=manual` 或不传。

#### 请求参数

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| title | string | 是 | 任务标题 |
| description | string | 否 | 任务描述 |
| priority | string | 是 | 优先级：high / medium / low |
| startDate | string | 否 | 开始日期，格式 `YYYY-MM-DD`，不传默认当天 |
| source | string | 否 | 来源：manual / ai，默认 manual |

#### 返回数据

`data` 返回新建的长期任务完整对象（字段同 10.1 list 项）。

#### 是否需要鉴权
- 需要。

### 10.3 PUT /plan/long-tasks/{id} — 修改长期任务

#### 接口说明
- 修改指定长期任务。

#### 请求参数

路径参数：

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | number | 是 | 任务 ID |

Body 参数（均为可选）：

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| title | string | 否 | 任务标题 |
| description | string | 否 | 任务描述 |
| priority | string | 否 | 优先级：high / medium / low |
| startDate | string | 否 | 开始日期，格式 `YYYY-MM-DD` |
| isCompleted | boolean | 否 | 是否完成 |

#### 返回数据

`data` 返回更新后的长期任务完整对象。

#### 是否需要鉴权
- 需要。

### 10.4 DELETE /plan/long-tasks/{id} — 删除长期任务

#### 接口说明
- 删除指定长期任务。
- 删除长期任务后，关联的每日计划和打卡记录一并清理（数据库级联删除）。

#### 请求参数

路径参数：

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | number | 是 | 任务 ID |

#### 返回数据

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| id | number | 被删除的任务 ID |

#### 是否需要鉴权
- 需要。

### 10.5 POST /plan/long-tasks/clear — 清空长期任务

#### 接口说明
- 清空当前登录用户的长期任务。
- 该操作应配合前端二次确认后再调用。
- 关联的每日计划和打卡记录一并清理。

#### 请求参数
- 无 Body。

#### 返回数据

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| deletedCount | number | 删除的长期任务数量 |

#### 是否需要鉴权
- 需要。

#### 可能的错误情况
- 没有可清空的长期任务。

### 10.6 POST /plan/long-tasks/ai-generate — AI 生成长期任务

#### 接口说明
- 用户输入一句话，由 AI 自动生成长期任务建议。
- AI生成结果仅作为建议返回，不直接写入数据库。

#### 请求参数

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| prompt | string | 是 | 用户输入的一句话需求 |
| count | number | 否 | 生成数量，默认 5 |

#### 返回数据

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| list | array | AI 生成的长期任务列表 |
| count | number | 实际生成数量 |

`list` 中每项包含：

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| title | string | 任务标题 |
| description | string | 任务描述 |
| priority | string | 优先级 |
| source | string | 来源，固定为 ai |

#### 是否需要鉴权
- 需要。

### 10.7 POST /plan/long-tasks/{id}/checkin — 长期任务每日打卡

#### 接口说明
- 为指定长期任务打卡或取消打卡（toggle 逻辑）。
- 当天已打卡则删除打卡记录（取消），未打卡则创建打卡记录。
- 打卡日期不传默认当天。

#### 请求参数

路径参数：

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | number | 是 | 长期任务 ID |

Body 参数：

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| date | string | 否 | 打卡日期，格式 `YYYY-MM-DD`，不传默认当天 |

#### 返回数据

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| longTaskId | number | 长期任务 ID |
| checkDate | string | 打卡日期 |
| checked | boolean | 打卡后的状态：true=已打卡，false=已取消 |

#### 是否需要鉴权
- 需要。

#### 可能的错误情况
- 长期任务不存在。
- 无权限操作该长期任务。

---

## 11. 每日计划模块

### 11.1 GET /plan/long-tasks/{id}/daily-plans — 获取某个长期任务的每日计划列表

#### 接口说明
- 获取指定长期任务下的每日计划列表。
- 仅允许查看当前登录用户自己的长期任务及其关联计划。

#### 请求参数

路径参数：

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | number | 是 | 长期任务 ID |

#### 返回数据

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| list | array | 每日计划列表 |
| total | number | 当前返回计划总数 |

`list` 中每项包含：

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| id | number | 每日计划 ID |
| longTaskId | number | 关联的长期任务 ID |
| content | string | 计划内容 |
| planDate | string | 计划日期 |
| isCompleted | boolean | 是否完成 |
| createdAt | string | 创建时间 |
| updatedAt | string | 更新时间 |

#### 是否需要鉴权
- 需要。

### 11.2 POST /plan/long-tasks/{id}/daily-plans — 给长期任务添加每日计划

#### 接口说明
- 为指定长期任务新增一条每日计划。
- 同一长期任务下，同一天的相同内容不应重复添加。

#### 请求参数

路径参数：

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | number | 是 | 长期任务 ID |

Body 参数：

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| content | string | 是 | 计划内容（最长 255 字符） |
| planDate | string | 是 | 计划日期，格式 `YYYY-MM-DD` |

#### 返回数据

`data` 返回新建的每日计划完整对象。

#### 是否需要鉴权
- 需要。

#### 可能的错误情况
- 长期任务不存在。
- 无权限操作该长期任务。
- 计划内容重复。

### 11.3 PUT /plan/daily-plans/{id} — 修改某条每日计划

#### 接口说明
- 修改指定每日计划。

#### 请求参数

路径参数：

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | number | 是 | 每日计划 ID |

Body 参数（均为可选）：

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| content | string | 否 | 计划内容（最长 255 字符） |
| planDate | string | 否 | 计划日期，格式 `YYYY-MM-DD` |
| isCompleted | boolean | 否 | 是否完成 |

#### 返回数据

`data` 返回更新后的每日计划完整对象。

#### 是否需要鉴权
- 需要。

### 11.4 DELETE /plan/daily-plans/{id} — 删除某条每日计划

#### 接口说明
- 删除指定每日计划。

#### 请求参数

路径参数：

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | number | 是 | 每日计划 ID |

#### 返回数据

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| id | number | 被删除的每日计划 ID |

#### 是否需要鉴权
- 需要。

### 11.5 POST /plan/long-tasks/{id}/daily-plans/ai-generate — AI 生成每日计划

#### 接口说明
- 用户基于某个长期任务生成每日计划建议。
- AI 生成结果仅作为建议返回，不直接写入数据库。

#### 请求参数

路径参数：

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | number | 是 | 长期任务 ID |

Body 参数：

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| prompt | string | 是 | 用户输入的一句话需求 |
| count | number | 否 | 生成数量，默认 5 |

#### 返回数据

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| list | array | AI 生成的每日计划列表 |
| count | number | 实际生成数量 |

`list` 中每项包含：

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| content | string | 计划内容 |
| planDate | string | 计划日期 |

#### 是否需要鉴权
- 需要。

---

## 12. 我的页面模块

### 12.1 GET /plan/profile — 获取我的信息

#### 接口说明
- 获取当前登录用户的个人信息。
- 用于"我的"页面初始化展示。

#### 请求参数
- 无。

#### 返回数据

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| id | number | 用户 ID |
| username | string | 用户名 |
| email | string | 邮箱 |
| avatar | string | null | 头像地址（相对路径，前端需拼接 baseURL） |
| role | string | 用户角色：user / admin |
| aiPrompt | string | null | 用户自定义 AI 提示词 |
| aiProvider | string | null | AI 厂商 |
| aiModel | string | null | AI 模型名 |
| aiBaseUrl | string | null | AI API 地址 |
| createdAt | string | 注册时间 |

#### 是否需要鉴权
- 需要。

### 12.2 PUT /plan/profile — 修改我的基本信息

#### 接口说明
- 修改当前登录用户的用户名和邮箱。

#### 请求参数

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| username | string | 否 | 用户名 |
| email | string | 否 | 邮箱 |

#### 返回数据

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| id | number | 用户 ID |
| username | string | 更新后的用户名 |
| email | string | 更新后的邮箱 |
| updatedAt | string | 更新时间 |

#### 是否需要鉴权
- 需要。

### 12.3 POST /plan/profile/avatar — 上传头像

#### 接口说明
- 上传并更新当前登录用户头像。
- 请求方式采用 `multipart/form-data`。
- 支持 JPEG / PNG / WebP，最大 2MB。

#### 请求参数

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| file | file | 是 | 头像文件（jpg/png/webp，2MB 上限） |

#### 返回数据

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| avatar | string | null | 更新后的头像地址（相对路径） |
| updatedAt | string | 更新时间 |

#### 是否需要鉴权
- 需要。

### 12.4 PUT /plan/profile/ai-prompt — 修改我的 AI 提示词

#### 接口说明
- 修改当前登录用户的 AI 提示词配置。
- 后续所有 AI 建议生成接口默认读取该提示词作为用户个性化配置。
- aiPrompt 为可选字段，空值时不更新原值。

#### 请求参数

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| aiPrompt | string | 否 | 用户自定义 AI 提示词 |

#### 返回数据

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| aiPrompt | string | 更新后的 AI 提示词 |
| updatedAt | string | 更新时间 |

#### 是否需要鉴权
- 需要。

### 12.5 PUT /plan/profile/ai-config — 修改我的 AI 接入配置

#### 接口说明
- 修改当前登录用户的 AI 接入配置。
- provider、model、baseUrl 支持留空，空值时不更新原值；apiKey 为可选字段。
- 后端会对 baseUrl 做标准化处理：去末尾斜杠 + 截掉 /chat/completions 后缀。

#### 请求参数

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| provider | string | 否 | 模型厂商，如 openai / anthropic |
| model | string | 否 | 模型名，如 gpt-4o / claude-3.5-sonnet |
| baseUrl | string | 否 | 自定义 API 地址 |
| apiKey | string | 否 | 用户自己的 API Key |

#### 返回数据

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| provider | string | null | 更新后的模型厂商 |
| model | string | null | 更新后的模型名 |
| baseUrl | string | null | 更新后的 API 地址 |
| apiKey | string | 更新后的 API Key |
| updatedAt | string | 更新时间 |

#### 是否需要鉴权
- 需要。

### 12.6 PUT /plan/profile/password — 修改密码

#### 接口说明
- 修改当前登录用户的密码。
- 需要验证旧密码。

#### 请求参数

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| currentPassword | string | 是 | 当前密码 |
| newPassword | string | 是 | 新密码 |

#### 返回数据

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| updatedAt | string | 更新时间 |

#### 是否需要鉴权
- 需要。

#### 可能的错误情况
- 当前密码错误。
- 新密码格式不合法。

### 12.7 GET /plan/profile/stats — 获取我的统计数据

#### 接口说明
- 获取当前登录用户的统计数据。
- 统计覆盖 today_tasks、long_tasks 与 daily_plans。
- 支持 3 种时间维度：周（weekly）、月（monthly）、年（yearly）。
- 不传 `periodType` 时只返回汇总数字，`trend` 为空数组。

#### 请求参数

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| periodType | string | 否 | 时间维度：weekly / monthly / yearly；不传默认只返回汇总 |
| date | string | 否 | 基准日期，格式 `YYYY-MM-DD`，不传默认当天 |

#### 返回数据

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| totalTaskCount | number | 总任务数 |
| completedTaskCount | number | 已完成任务数 |
| completionRate | number | 完成率 |
| weekCompletedTasks | number | 本周完成任务数 |
| todayTasksCompletionRate | number | 今日任务完成率 |
| trend | array | 趋势数据，不传 periodType 时为空数组 |

`trend` 中每项包含：

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| date | string | 统计日期 |
| completedCount | number | 对应日期的完成数量 |

#### 是否需要鉴权
- 需要。

---

## 13. 管理员模块

> 所有管理员接口需要同时通过 JWT 鉴权和管理员权限守卫（role === 'admin'）。

### 13.1 GET /plan/admin/users — 获取用户列表

#### 接口说明
- 管理员获取系统用户列表。
- 支持按用户名/邮箱关键字和角色筛选。
- 支持分页。

#### 请求参数

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| keyword | string | 否 | 用户名或邮箱关键字 |
| role | string | 否 | 角色筛选：user / admin |
| page | number | 否 | 页码，默认 1 |
| pageSize | number | 否 | 每页数量，默认 10 |

#### 返回数据

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| list | array | 用户列表 |
| total | number | 用户总数 |
| page | number | 当前页码 |
| pageSize | number | 当前每页数量 |

`list` 中每项包含：

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| id | number | 用户 ID |
| username | string | 用户名 |
| email | string | 邮箱 |
| role | string | 用户角色 |
| status | string | 用户状态：active / disabled |
| createdAt | string | 注册时间 |

> ⚠️ 当前 status 固定返回 active，待补正式 status 字段后改为真实值。

#### 是否需要鉴权
- 需要，且必须为管理员。

### 13.2 GET /plan/admin/users/{id} — 获取指定用户详情

#### 接口说明
- 管理员查看指定用户的详细信息。

#### 请求参数

路径参数：

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | number | 是 | 用户 ID |

#### 返回数据

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| id | number | 用户 ID |
| username | string | 用户名 |
| email | string | 邮箱 |
| avatar | string | null | 头像地址 |
| role | string | 用户角色 |
| status | string | 用户状态 |
| aiPrompt | string | null | 用户 AI 提示词 |
| createdAt | string | 注册时间 |
| updatedAt | string | 更新时间 |

#### 是否需要鉴权
- 需要，且必须为管理员。

### 13.3 GET /plan/admin/users/{id}/stats — 获取指定用户统计数据

#### 接口说明
- 管理员查看指定用户的统计数据。
- 时间维度规则与 `GET /plan/profile/stats` 保持一致。

#### 请求参数

路径参数：

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | number | 是 | 用户 ID |

Query 参数：同 `GET /plan/profile/stats`。

#### 返回数据

同 `GET /plan/profile/stats`。

#### 是否需要鉴权
- 需要，且必须为管理员。

### 13.4 PUT /plan/admin/users/{id} — 管理员修改用户信息

#### 接口说明
- 管理员修改指定用户的信息。
- 当前主要用于修改用户角色。
- 所有字段均为可选，不传的字段不更新。
- 不允许修改自己的账号。

#### 请求参数

路径参数：

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | number | 是 | 用户 ID |

Body 参数（均为可选）：

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| username | string | 否 | 用户名 |
| email | string | 否 | 邮箱 |
| role | string | 否 | 角色：user / admin |

#### 返回数据

`data` 返回更新后的用户对象。

#### 是否需要鉴权
- 需要，且必须为管理员。

#### 可能的错误情况
- 不能修改自己的账号。

### 13.5 PATCH /plan/admin/users/{id}/status — 切换用户状态

#### 接口说明
- 管理员切换指定用户的启用/禁用状态。
- 不允许禁用自己的账号。

#### 请求参数

路径参数：

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | number | 是 | 用户 ID |

Body 参数：

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| status | string | 是 | 目标状态：active / disabled |

#### 返回数据

`data` 返回更新后的用户对象。

#### 是否需要鉴权
- 需要，且必须为管理员。

#### 可能的错误情况
- 不能禁用自己的账号。

### 13.6 DELETE /plan/admin/users/{id} — 删除用户

#### 接口说明
- 管理员删除指定用户。
- 不允许删除自己的账号。
- 删除用户后，关联的今日任务、长期任务、每日计划、打卡记录一并清理（数据库级联删除）。

#### 请求参数

路径参数：

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | number | 是 | 用户 ID |

#### 返回数据

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| id | number | 被删除的用户 ID |

#### 是否需要鉴权
- 需要，且必须为管理员。

#### 可能的错误情况
- 不能删除自己的账号。

### 13.7 POST /plan/admin/users/{id}/reset-password — 重置用户密码

#### 接口说明
- 管理员重置指定用户的密码。
- 不允许重置自己的密码。

#### 请求参数

路径参数：

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | number | 是 | 用户 ID |

Body 参数：

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| newPassword | string | 是 | 新密码 |

#### 返回数据

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| id | number | 用户 ID |
| updatedAt | string | 更新时间 |

#### 是否需要鉴权
- 需要，且必须为管理员。

#### 可能的错误情况
- 不能重置自己的密码。
