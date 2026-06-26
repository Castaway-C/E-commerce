# 管理端接口

## 说明

- 前缀：`/api/v1/admin`
- 角色：`platform_operator`、`merchant_operator`
- 普通用户不进入管理端

## 认证与菜单

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/auth/login` | 管理端登录 |
| POST | `/auth/refresh` | 刷新 token |
| POST | `/auth/logout` | 登出 |
| GET | `/auth/me` | 当前管理员 |
| GET | `/auth/menus` | 菜单树和权限点 |

## 商品与店铺

| 方法 | 路径 | platform_operator | merchant_operator |
|---|---|---|---|
| GET | `/products` | 全平台 | 本店 |
| POST | `/products` | 可创建 | 本店创建 |
| PUT | `/products/{id}` | 可编辑 | 本店可编辑 |
| POST | `/products/{id}/audit` | 可审核 | 不可用 |
| POST | `/products/{id}/publish` | 可上架 | 本店可上架 |
| POST | `/products/{id}/unpublish` | 可下架 | 本店可下架 |
| GET | `/merchants` | 可用 | 不可用 |
| POST | `/merchants` | 可用 | 不可用 |

## 订单与售后

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/orders` | 订单列表 |
| GET | `/orders/{id}` | 订单详情 |
| POST | `/orders/{id}/ship` | 发货 |
| GET | `/refunds` | 售后列表 |
| POST | `/refunds/{id}/approve` | 同意售后 |
| POST | `/refunds/{id}/reject` | 拒绝售后 |
| POST | `/refunds/{id}/receive` | 确认收到退货 |
| POST | `/refunds/{id}/refund` | 执行退款 |

## 促销、社区、系统

- 认证与菜单
- 商品审核
- 订单与售后
- 促销管理
- 社区审核
- 用户与商家管理
- 数据看板与导出

## 数据权限

- `merchant_operator` 所有列表自动按 `merchant_id` 过滤。
- `platform_operator` 可查看全平台，并可创建商家和平台运营账号。

## 错误码

| code | 场景 |
|---|---|
| 40002 | 管理端 token 缺失或失效 |
| 40003 | 角色无权限或越权访问其他店铺 |
| 40008 | 审核、上下架、发货等状态不允许 |
