# 编码与协作约定

## 命名

- 后端 Python 文件使用 `snake_case`。
- 前端组件使用 `PascalCase`。
- API 路径使用小写复数名词，例如 `/products`。
- 金额在后端统一使用“分”作为整数存储和传输，例如 `price_cent`。
- 前端展示和输入统一使用“元”，提交接口前转换为“分”。

## 接口

- 用户端接口前缀：`/api/v1`。
- 管理端接口前缀：`/api/v1/admin`。
- WebSocket 地址前缀：`/ws`。
- 统一响应结构：`code`、`message`、`data`。
- 分页统一使用：`page`、`page_size`，返回 `list`、`page`、`page_size`、`total`。
- 接口字段、状态、错误码或权限变化时，同步更新 `docs/api/*.md`。

## 权限

- 普通用户只使用用户端接口。
- 后台管理员只使用管理端接口。
- `platform_operator` 可以访问平台级数据。
- `merchant_pending` 只允许查看和重新提交自己的商家入驻资料。
- `merchant_operator` 只能访问本店数据。
- 平台不能手动创建店铺或商品；店铺来自商家入驻审核通过，商品由商家创建。
- 新增管理端接口必须先判断是否需要按 `merchant_id` 限制。

## 前后端同步

- 后端扩展新功能时，前端必须同轮添加调用入口或页面入口。
- 一个功能不能只靠接口返回 JSON 验收，正常信息必须展示在页面业务区。
- 只有项目负责人明确要求时，才可以临时只做后端或只做前端。
- 后续开发按完整需求实现，不再交付只有占位、半流程或临时按钮的功能。

## 认证与会话

- 认证 token 中使用 `account_type` 区分 `consumer` 和 `admin`。
- 普通用户表为 `user`，管理员表为 `admin_user`。
- 密码存储使用 SHA-256 摘要 + Bcrypt 加盐哈希。
- 登出黑名单当前使用内存实现，后续接 Redis 时保持接口不变。
- 用户端 token 存储键名为 `user_access_token`、`user_refresh_token`。
- 管理端允许平台账号和商家账号同时登录：
  - 平台端 token：`platform_admin_access_token`、`platform_admin_refresh_token`。
  - 商家端 token：`merchant_admin_access_token`、`merchant_admin_refresh_token`。

## 状态治理

- 当前只有商家入驻需要事前审核。
- 商品、帖子、评论、评价发布后默认公开或可售，平台保留隐藏、下架、禁用和监管能力。
- 状态机变化必须写入接口文档，必要时补测试。
- 订单、售后、库存、积分、优惠券等高风险状态变化应集中在 service 中处理。

## 数据库

- 开发环境允许 ORM 自动建表。
- 给旧表新增字段时，必须考虑 SQLite 开发库兼容；必要时同步 `backend/app/db/session.py` 的补列逻辑。
- 模型稳定后逐步补齐 Alembic 迁移。

## 文档

- `需求规格说明书.md`：功能目标和验收依据。
- `实现设计说明书.md`：编码设计依据。
- `docs/development-roadmap.md`：后续全量开发计划。
- `docs/dev-setup.md`：启动、清库、账号、联调和验收说明。
- `AGENTS.md`：AI 协作、项目状态和上下文恢复说明。
