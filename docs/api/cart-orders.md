# 购物车与订单

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
- `shipping_address_id` 必填
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

## POST `/orders/{id}/confirm`

确认收货。

## POST `/orders/{id}/reviews`

发表订单评价。

## POST `/orders/{id}/refunds`

申请退货退款。

## 订单状态

`pending_payment`、`pending_shipment`、`shipping`、`pending_receipt`、`completed`、`cancelled`、`after_sale`、`closed`

## 错误码

| code | 场景 |
|---|---|
| 40006 | `client_order_token` 重复 |
| 40007 | 库存不足 |
| 40008 | 当前订单状态不允许操作 |
