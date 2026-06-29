# 社区

## 统一说明

- 帖子支持 `normal`、`grass`、`merchant_ad`
- 统一采用先审后发
- 互动数据包含点赞、评论、标签、商品关联
- 当前已实现发帖、公开列表、详情、点赞、评论、管理端帖子审核、管理端评论审核。
- 种草帖已支持已购商品校验；订单可通过 `source_post_id` 记录种草来源，买家确认收货后会给种草帖作者增加基础积分奖励。
- 当前暂未实现话题标签管理、用户主页、商家广告帖权限细分和完整积分流水。

## 帖子接口

- `GET /community/posts`
- `GET /community/posts/{id}`
- `POST /community/posts`
- `DELETE /community/posts/{id}`
- `POST /community/posts/{id}/like`
- `GET /community/posts/{id}/comments`
- `POST /community/posts/{id}/comments`
- 管理端：`GET /admin/community/posts`
- 管理端：`POST /admin/community/posts/{id}/audit`
- 管理端：`POST /admin/community/posts/{id}/hide`
- 管理端：`GET /admin/community/comments`
- 管理端：`POST /admin/community/comments/{id}/audit`
- 管理端：`POST /admin/community/comments/{id}/hide`

## POST `/community/posts`

发布帖子。帖子创建后状态为 `pending_audit`，需要管理端审核通过后才会出现在公开列表。

### 请求

```json
{
  "type": "grass",
  "title": "零食测评",
  "content": "内容正文",
  "image_urls": ["/static/uploads/a.jpg"],
  "product_ids": [1],
  "topic_tags": ["零食测评"]
}
```

种草帖 `type=grass` 必须关联 `product_ids`，并且当前用户必须存在已完成订单购买过这些商品。

## 种草来源下单

创建订单时可传入 `source_post_id`：

```json
{
  "client_order_token": "unique-token",
  "source_post_id": 1
}
```

规则：

- 来源帖子必须是已发布的 `grass` 种草帖。
- 来源帖子必须关联本次购买的商品。
- 买家不能使用自己的种草帖作为来源。
- 买家确认收货后，系统给种草帖作者增加基础积分奖励，当前基础版为 10 积分。
- 当前已记录奖励去重，避免同一订单重复发放；奖励会通过统一积分服务写入 `points_log` 积分流水。

## 帖子字段

| 字段 | 类型 | 说明 |
|---|---|---|
| id | number | 帖子 ID |
| type | string | normal/grass/merchant_ad |
| status | string | pending_audit/published/rejected/hidden |
| author | object | 作者摘要 |
| products | array | 关联商品 |
| like_count | number | 点赞数 |
| comment_count | number | 评论数 |

## POST `/community/posts/{id}/like`

对已发布帖子点赞或取消点赞。同一用户重复调用会切换状态。

响应：

```json
{
  "code": 0,
  "message": "ok",
  "data": { "liked": true, "like_count": 1 }
}
```

## POST `/community/posts/{id}/comments`

发表评论。评论创建后状态为 `pending_audit`，管理端审核通过后才会在公开评论列表展示。

## 管理端审核

### GET `/admin/community/posts`

查询帖子审核列表。

查询参数：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| status | string | 否 | 默认 `pending_audit`，可选 `published`、`rejected`、`hidden` |
| page | number | 否 | 页码，默认 1 |
| page_size | number | 否 | 每页数量，默认 20 |

### POST `/admin/community/posts/{id}/audit`

```json
{ "approved": true }
```

`approved=true` 时帖子状态变为 `published`，否则变为 `rejected`。

### GET `/admin/community/comments`

查询评论审核列表。

查询参数：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| post_id | number | 否 | 传入时只查询某个帖子评论，不传时查询全站评论 |
| status | string | 否 | 默认 `pending_audit`，可选 `published`、`rejected`、`hidden` |
| page | number | 否 | 页码，默认 1 |
| page_size | number | 否 | 每页数量，默认 20 |

### POST `/admin/community/comments/{id}/audit`

```json
{ "approved": true }
```

`approved=true` 时评论状态变为 `published`，否则变为 `rejected`。

## 话题与用户主页

- `GET /community/tags` 话题标签，待实现
- `GET /community/users/{id}` 用户主页，待实现

## 错误码

| code | 场景 |
|---|---|
| 40003 | 删除他人帖子或评论 |
| 40005 | 种草帖关联商品未购买 |
| 40008 | 内容状态不允许操作 |
