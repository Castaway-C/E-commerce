# 商品与店铺

## 当前阶段实现范围

- 已实现店铺、分类、商品、SKU、商品图片的基础模型。
- 用户端已实现商品列表、商品详情、分类列表、店铺详情、店铺商品列表。
- 管理端已实现创建店铺、创建分类、创建商品、商品列表、商品详情、上架、下架。
- 前端已提供用户端 `/products` 商品列表入口，管理端 `/products` 快速创建商品入口。
- 商品审核流程暂未实现；当前管理端创建商品后为 `draft`，调用上架接口后进入 `on_sale`。

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

当前阶段返回扁平分类列表，字段包含 `id`、`name`、`parent_id`、`sort_order`，后续前端可按 `parent_id` 组装树。

## 管理端接口

所有接口前缀为 `/api/v1/admin`，需要管理员 token。

### POST `/merchants`

创建店铺。

```json
{
  "name": "测试店铺",
  "logo_url": "/static/uploads/logo.jpg",
  "announcement": "店铺公告"
}
```

### POST `/categories`

创建分类。

```json
{
  "name": "零食",
  "parent_id": null,
  "sort_order": 0
}
```

### POST `/products`

创建商品，默认状态为 `draft`。

```json
{
  "merchant_id": 1,
  "category_id": 1,
  "name": "每日坚果",
  "description": "商品详情",
  "cover_url": "/static/uploads/cover.jpg",
  "image_urls": ["/static/uploads/cover.jpg"],
  "skus": [
    {
      "name": "默认规格",
      "price_cent": 9900,
      "market_price_cent": 12900,
      "stock": 100,
      "spec_values": { "规格": "500g" }
    }
  ]
}
```

### 商品状态

- `draft`：草稿
- `on_sale`：在售
- `off_sale`：下架

### 上下架

- `POST /admin/products/{product_id}/publish`
- `POST /admin/products/{product_id}/unpublish`

## 错误码

| code | 场景 |
|---|---|
| 40004 | 商品、店铺、分类不存在 |
| 40005 | 商品未上架，不可展示或购买 |
