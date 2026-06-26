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

### 当前阶段实现说明

- 已实现管理端登录、刷新、登出、当前管理员、菜单占位接口。
- 管理员账号不走普通用户注册接口，可先通过 `backend/scripts/create_admin.py` 创建初始账号，后续再由平台运营创建。
- `platform_operator` 和 `merchant_operator` 使用同一登录接口，但权限边界由 `role` 和 `merchant_id` 决定。
- 登出已支持 token 拉黑；当前实现为内存黑名单，后续接 Redis TTL 持久化。

### POST `/auth/login`

请求：

```json
{ "username": "admin", "password": "12345678" }
```

响应：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "access_token": "jwt",
    "refresh_token": "jwt",
    "token_type": "Bearer",
    "expires_in": 1800
  }
}
```

### GET `/auth/me`

响应字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| id | number | 管理员 ID |
| username | string | 登录名 |
| real_name | string | 姓名 |
| role | string | platform_operator/merchant_operator |
| merchant_id | number/null | 绑定店铺 ID |

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
