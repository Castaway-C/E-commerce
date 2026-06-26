# 社区

## 统一说明

- 帖子支持 `normal`、`grass`、`merchant_ad`
- 统一采用先审后发
- 互动数据包含点赞、评论、标签、商品关联

## 帖子接口

- `GET /community/posts`
- `GET /community/posts/{id}`
- `POST /community/posts`
- `DELETE /community/posts/{id}`
- `POST /community/posts/{id}/like`
- `GET /community/posts/{id}/comments`
- `POST /community/posts/{id}/comments`

## POST `/community/posts`

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

## 话题与用户主页

- `GET /community/tags` 话题标签
- `GET /community/users/{id}` 用户主页

## 错误码

| code | 场景 |
|---|---|
| 40003 | 删除他人帖子或评论 |
| 40005 | 种草帖关联商品未购买 |
| 40008 | 内容状态不允许操作 |
