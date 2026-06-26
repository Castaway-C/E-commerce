# 编码与协作约定

## 命名

- 后端 Python 文件使用 `snake_case`
- 前端组件使用 `PascalCase`
- API 路径使用小写复数名词，例如 `/products`
- 金额统一使用分作为整数存储和传输，例如 `price_cent`

## 接口

- 用户端接口前缀：`/api/v1`
- 管理端接口前缀：`/api/v1/admin`
- WebSocket 地址前缀：`/ws`
- 统一响应结构：`code`、`message`、`data`
- 分页统一使用：`page`、`page_size`

## 权限

- 普通用户只使用用户端接口。
- 后台管理员只使用管理端接口。
- `merchant_operator` 只能访问本店数据。
- `platform_operator` 可以访问平台级数据。

## 第一阶段实现约定

- 认证 token 中使用 `account_type` 区分 `consumer` 和 `admin`。
- 普通用户表为 `user`，管理员表为 `admin_user`。
- 密码存储使用 SHA-256 摘要 + Bcrypt 加盐哈希。
- 登出黑名单当前使用内存实现，后续接 Redis 时保持接口不变。
- 开发环境允许自动建表，迁移脚本在后续模型稳定后补齐。
- 用户端 token 存储键名为 `user_access_token`、`user_refresh_token`。
- 管理端 token 存储键名为 `admin_access_token`、`admin_refresh_token`。
