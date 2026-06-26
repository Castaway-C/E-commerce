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

