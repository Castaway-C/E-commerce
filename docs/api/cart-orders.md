# 购物车与订单

## 当前阶段实现范围

- 已实现购物车增删改查、结算预校验、创建订单、订单列表/详情、取消待支付订单、支付单查询、模拟支付。
- 创建订单会按商家拆分订单，并生成一个支付单。
- 模拟支付成功后，支付单状态变为 `paid`，订单状态从 `pending_payment` 变为 `pending_shipment`。
- 当前基础版直接扣减 MySQL SKU 库存；Redis 预扣、支付超时自动取消、促销/积分抵扣会在后续阶段接入。
- 用户端已提供 `/cart`、`/checkout`、`/orders` 基础页面入口。
- 第四阶段已实现确认收货、评价发布、评价审核、售后申请、售后同意、确认退款完成的基础状态流转。

## 购物车字段

| 字段 | 类型 | 说明 |
|---|---|---|
| sku_id | number | SKU ID |
| product_id | number | 商品 ID |
| quantity | number | 数量 |
| checked | boolean | 是否选中 |
| invalid_reason | string | 失效原因 |

## GET `/cart`

获取当前用户购物车列表。

## POST `/cart`

增加商品到购物车。

### 请求

```json
{ "sku_id": 1, "quantity": 2 }
```

## PUT `/cart/{sku_id}`

修改购物车数量。

### 请求

```json
{ "quantity": 3, "checked": true }
```

## DELETE `/cart/{sku_id}`

删除购物车项。

## POST `/cart/checkout`

返回结算确认信息、优惠计算结果、可用地址列表。

### 请求

```json
{
  "items": [{ "sku_id": 1, "quantity": 2 }],
  "coupon_id": 10,
  "points_used": 100
}
```

## POST `/orders`

创建订单。

### 请求要点

- `client_order_token` 必填，用于幂等
- `shipping_address_id` 当前阶段可选，后续地址模块完成后改为必填
- `coupon_id`、`points_used` 可选

### 响应

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "payment_id": 1,
    "payment_no": "PAY202606250001",
    "order_ids": [1, 2],
    "pay_amount_cent": 9900,
    "expire_at": "2026-06-25T16:15:00+08:00"
  }
}
```

## GET `/orders`

分页获取订单列表。

查询参数：`status`、`page`、`page_size`

## GET `/orders/{id}`

获取订单详情。

## POST `/orders/{id}/cancel`

取消未支付订单。

## POST `/payments/{id}/pay`

模拟支付或发起支付。

当前阶段只实现模拟支付，不接第三方支付。

## POST `/orders/{id}/confirm`

确认收货。

## POST `/orders/{id}/reviews`

发表订单评价。

当前阶段评价默认进入 `pending_audit`，管理端审核通过后才会在商品评价列表公开展示。

## POST `/orders/{id}/refunds`

申请退货退款。

当前阶段售后状态支持：`pending_approval`、`approved`、`rejected`、`received`、`refunded`。

## 管理端售后与评价接口

- `POST /api/v1/admin/orders/{order_id}/ship`：商家发货
- `POST /api/v1/admin/reviews/{review_id}/audit`：评价审核
- `GET /api/v1/admin/refunds`：售后列表
- `POST /api/v1/admin/refunds/{refund_id}/approve`：同意售后
- `POST /api/v1/admin/refunds/{refund_id}/reject`：拒绝售后
- `POST /api/v1/admin/refunds/{refund_id}/receive`：确认收到退货
- `POST /api/v1/admin/refunds/{refund_id}/refund`：确认退款完成

## 订单状态

`pending_payment`、`pending_shipment`、`shipping`、`pending_receipt`、`completed`、`cancelled`、`after_sale`、`closed`

## 错误码

| code | 场景 |
|---|---|
| 40006 | `client_order_token` 重复 |
| 40007 | 库存不足 |
| 40008 | 当前订单状态不允许操作 |
