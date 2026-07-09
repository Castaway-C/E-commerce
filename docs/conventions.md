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
- 后续新增或调整后端接口时，同步检查前端调用入口和页面展示。

## 权限

- 普通用户只使用用户端接口。
- 平台运营和商家运营使用管理端接口。
- `platform_operator` 可以访问平台级数据。
- `merchant_pending` 只允许查看和重新提交自己的商家入驻资料。
- `merchant_operator` 只能访问本店数据。
- 店铺来自商家入驻审核通过，商品由商家创建。
- 新增管理端接口需要判断是否涉及 `merchant_id` 数据隔离。
- 报表和客服接口也必须遵循权限边界：平台看全局，商家看本店，普通用户看自己的数据和会话。

## 前后端同步

- 后端扩展新功能时，前端同轮补充调用入口或页面入口。
- 正常业务结果展示在页面业务区，接口 JSON 返回主要用于排查。
- 前端交互优化时，也要确认不会破坏接口契约和关键业务流程。

## 认证与会话

- 认证 token 中使用 `account_type` 区分 `consumer` 和 `admin`。
- 普通用户表为 `user`，管理员表为 `admin_user`。
- 密码存储使用 SHA-256 摘要 + Bcrypt 加盐哈希。
- 用户端 token 存储键名为 `user_access_token`、`user_refresh_token`。
- 管理端允许平台账号和商家账号同时登录：
  - 平台端 token：`platform_admin_access_token`、`platform_admin_refresh_token`。
  - 商家端 token：`merchant_admin_access_token`、`merchant_admin_refresh_token`。

## 支付

- 当前支付链路为支付宝沙箱扫码支付。
- 支付成功以后端验签通知或后端主动查询结果为准，前端展示结果不能作为最终支付凭据。
- 支付二维码生成期间前端应锁定按钮，避免重复预创建导致旧二维码失效。

## 状态治理

- 商家入驻采用平台审核。
- 商品、帖子、评论、评价发布后由平台进行治理。
- 状态机变化写入接口文档，必要时补测试。
- 订单、售后、库存、积分、优惠券等关键状态变化集中在 service 中处理。

## 数据库

- 开发环境默认使用 MySQL。
- 开发期允许 ORM 自动建表。
- 给旧表新增字段时，默认按 MySQL 开发库处理；必要时提供清库重建步骤或 Alembic 迁移脚本。
- `backend/app/db/session.py` 中的 SQLite 补列逻辑仅作历史兼容。
- 模型稳定后可逐步补齐 Alembic 迁移。

## 文档

- `AGENTS.md`：当前项目状态、关键约定和上下文恢复说明。
- `docs/final-requirements.md`：当前最终版需求说明。
- `docs/final-design.md`：当前最终版实现设计说明。
- `docs/dev-setup.md`：启动、清库、账号、联调和验收说明。
- `docs/api/*.md`：接口契约。
- `docs/project-summary.md`、`docs/defense-guide.md`：总结、答辩和讲解材料。
- `需求规格说明书.md`、`实现设计说明书.md`：早期历史资料。
