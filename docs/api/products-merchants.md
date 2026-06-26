# 商品与店铺

## 商品列表 `GET /products`

查询参数：`keyword`、`category_id`、`merchant_id`、`sort`、`min_price`、`max_price`、`page`、`page_size`

### 响应字段

| 字段 | 类型 | 说明 |
|---|---|---|
| id | number | 商品 ID |
| name | string | 商品名 |
| cover_url | string | 封面图 |
| price_cent | number | 展示价，单位分 |
| market_price_cent | number | 划线价，单位分 |
| merchant_id | number | 店铺 ID |
| merchant_name | string | 店铺名 |
| sales_count | number | 销量 |
| tags | string[] | 展示标签 |

## 商品详情 `GET /products/{id}`

返回商品、SKU、店铺、标签、评价摘要。

### 响应字段

| 字段 | 类型 | 说明 |
|---|---|---|
| id | number | 商品 ID |
| name | string | 商品名 |
| description | string | 图文详情 |
| images | string[] | 商品图 |
| status | string | 商品状态 |
| skus | array | SKU 列表 |
| merchant | object | 店铺摘要 |
| review_summary | object | 评价摘要 |

### SKU 字段

| 字段 | 类型 | 说明 |
|---|---|---|
| id | number | SKU ID |
| name | string | SKU 名称 |
| price_cent | number | 价格 |
| stock | number | 库存 |
| spec_values | object | 规格值 |

## 商品评价 `GET /products/{id}/reviews`

分页返回通过审核的评价列表。

## 店铺主页 `GET /merchants/{id}`

返回店铺信息、公告、在售商品入口。

## 分类 `GET /categories`

返回最多三级分类树。

## 错误码

| code | 场景 |
|---|---|
| 40004 | 商品、店铺、分类不存在 |
| 40005 | 商品未上架，不可展示或购买 |
