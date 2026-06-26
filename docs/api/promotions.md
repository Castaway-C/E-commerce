# 促销

## 优惠券

- `GET /promotions/coupons` 可领取优惠券列表
- `POST /promotions/coupons/{id}/claim` 领取优惠券
- `GET /promotions/my-coupons` 我的优惠券

### 优惠券字段

| 字段 | 类型 | 说明 |
|---|---|---|
| id | number | 优惠券模板或用户券 ID |
| name | string | 名称 |
| discount_type | string | amount/percent |
| discount_value | number | 优惠值 |
| min_amount_cent | number | 使用门槛 |
| scope_type | string | all/merchant/category/product/sku |
| status | string | unused/used/expired/void |

## 满减

- `GET /promotions/full-discounts/active` 当前活动

### 满减字段

| 字段 | 类型 | 说明 |
|---|---|---|
| id | number | 活动 ID |
| name | string | 活动名 |
| rule_type | string | amount/quantity |
| threshold | number | 门槛 |
| discount_cent | number | 优惠金额 |

## 限时特价

- `GET /promotions/flash` 列表
- `GET /promotions/flash/{id}` 详情

### 限时特价字段

| 字段 | 类型 | 说明 |
|---|---|---|
| activity_id | number | 活动 ID |
| sku_id | number | SKU ID |
| activity_price_cent | number | 活动价 |
| start_at | string | 开始时间 |
| end_at | string | 结束时间 |

## 拼团

- `POST /promotions/group-buy/{activity_id}/start` 发起拼团
- `POST /promotions/group-buy/{group_order_id}/join` 参团

## 价格计算顺序

限时特价/拼团价 -> 满减满折 -> 优惠券 -> 积分抵扣

## 错误码

| code | 场景 |
|---|---|
| 40004 | 活动或优惠券不存在 |
| 40005 | 不满足领取或使用条件 |
| 40008 | 活动未开始、已结束或状态不可用 |
