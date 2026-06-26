# 上传接口

## POST `/upload/image`

上传图片文件，返回可访问地址。

### 请求

- `multipart/form-data`
- 字段：`file`

### 响应

```json
{ "code": 0, "message": "ok", "data": { "url": "/static/uploads/xxx.jpg" } }
```

## 约束

- 校验 MIME 类型
- 校验文件大小
- 文件名需随机化
- 默认支持：`image/jpeg`、`image/png`、`image/webp`
- 单文件大小建议限制为 5MB
- 用户端上传用于头像、评价、社区图片；管理端上传用于商品、店铺、活动图片

## 错误码

| code | 场景 |
|---|---|
| 40009 | 文件类型、大小或内容不合法 |
| 50000 | 保存失败 |
