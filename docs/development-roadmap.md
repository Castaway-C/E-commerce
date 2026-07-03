# 协作移交与后续迭代路线图

当前项目已经具备基础电商闭环和联调用前端工作台。后续开发目标从“补基础链路”转为“按模块完整实现需求，并交付可验收页面、接口文档和测试”。

## 开发交付标准

每个后续功能至少同时完成：

- 后端：模型、schema、service、router、权限判断、错误码和关键测试。
- 前端：用户端或管理端可发现的菜单、页面、表单、列表、状态提示和接口调用。
- 文档：同步更新 `docs/api/*.md`，必要时更新 `实现设计说明书.md`、`需求规格说明书.md`、`docs/dev-setup.md`、`AGENTS.md`。
- 验收：给出可手工走通的流程，重要状态和异常有测试或说明。

除非负责人明确要求，否则不要只新增后端接口而不接前端，也不要只做页面静态占位。

## 当前已完成基线

- 用户、平台、商家账号与 token 分离。
- 商家自助入驻、平台审核、店铺自动创建。
- 分类、商品、SKU、图片、库存、店铺主页、收藏、关注。
- 购物车、跨店订单、支付宝沙箱扫码支付、发货、确认收货、评价。
- 优惠券、满减、积分抵扣、积分流水和基础会员配置。
- 售后按订单明细和数量处理，商家和平台可处理售后。
- 社区分区、帖子、评论、点赞、话题、用户主页、关联商品卡片、内容隐藏。
- 种草来源加购与确认收货后的双向积分奖励。
- 拼团基础链路：商家配置、用户开团/参团、支付宝支付、成团后进入待发货。
- 用户端、平台端、商家端均有联调工作台页面，可测试主要功能。

## 三人协作建议

建议按模块纵向切分，而不是长期按“只写后端/只写前端”切分。

- 成员 A 主看后端模型、service、测试和接口文档。
- 成员 B 主看用户端页面、用户流程和用户体验。
- 成员 C 主看管理端页面、运营流程、权限联调和项目文档。

每个功能开始前先写小范围设计说明：本次涉及哪些接口、哪些页面、哪些状态、哪些权限、哪些文档。完成后一起按验收流程走一遍。

## 1. 前端最终迭代

当前前端是联调工作台。移交后需要拆成正式 PC 端页面，保持清晰、美观、易用，并完整覆盖现有后端能力。

### 用户端页面

- 首页：搜索、分类、推荐、热门商品、拼团专区、社区入口。
- 商品列表：关键词、分类树、价格区间、排序、营销标签、分页。
- 商品详情：左图右文、SKU、销售价、划线价、库存、店铺入口、评价、收藏、普通加购、种草来源加购。
- 店铺页：店铺 Logo、公告、关注、店铺商品、店铺活动、商家动态。
- 购物车：失效商品、数量修改、删除、满减、优惠券、积分、价格明细。
- 结算和支付：地址选择、优惠选择、积分抵扣、支付宝二维码、支付状态同步。
- 订单中心：订单筛选、支付、取消、确认收货、评价、售后申请、售后详情。
- 用户中心：头像、昵称、手机号、地址、收藏、关注店铺、积分流水、会员等级。
- 社区：综合广场、种草专区、商家动态、求助、体验分享、话题页、用户主页。
- 拼团：拼团活动列表、活动详情、正在拼的团、开团、参团、积分抵扣。

### 管理端页面

- 平台端：商家入驻、分类、商品监管、订单、售后、促销、拼团监管、社区治理、用户、操作日志、数据看板。
- 商家端：店铺资料、商品和 SKU、库存、订单发货、售后处理、优惠券、满减、拼团活动、商家动态、本店经营概览。

### 前端迁移原则

- 当前联调页是功能清单，不要直接删除其中的接口调用。
- 业务信息必须显示在业务区，不依赖接口 JSON 返回区。
- 用户、平台、商家登录态必须分离，允许平台和商家账号同时登录。
- 有 ID 的对象继续直接展示 ID，方便测试和排查。
- 表单中能用选择器的不要要求手输 ID；必须批量输入时兼容中文逗号、英文逗号、分号和空白。

## 2. 后台报表数据可视化

目标：为平台和商家提供经营分析页面。数据可视化是移交后的重点任务之一。

### 后端聚合接口建议

平台端：

- `GET /api/v1/admin/reports/platform/summary`
- `GET /api/v1/admin/reports/platform/sales-trend`
- `GET /api/v1/admin/reports/platform/order-status`
- `GET /api/v1/admin/reports/platform/top-products`
- `GET /api/v1/admin/reports/platform/top-merchants`
- `GET /api/v1/admin/reports/platform/refunds`
- `GET /api/v1/admin/reports/platform/promotions`
- `GET /api/v1/admin/reports/platform/community-conversion`

商家端：

- `GET /api/v1/admin/reports/merchant/summary`
- `GET /api/v1/admin/reports/merchant/sales-trend`
- `GET /api/v1/admin/reports/merchant/order-status`
- `GET /api/v1/admin/reports/merchant/top-products`
- `GET /api/v1/admin/reports/merchant/refunds`
- `GET /api/v1/admin/reports/merchant/promotions`
- `GET /api/v1/admin/reports/merchant/community-conversion`

### 指标范围

- 汇总指标：GMV、支付订单数、退款金额、售后数、新增用户、新增商家、商品数。
- 趋势：近 7/30 天销售额、订单数、退款数、客单价。
- 分布：订单状态、售后状态、支付金额区间、商品分类销售占比。
- 排行：商品销量 TOP、商品销售额 TOP、店铺销售额 TOP、种草转化 TOP。
- 促销效果：券领取量、使用量、核销金额、满减优惠金额、拼团开团数、成团率。
- 社区转化：帖子数、评论数、点赞数、种草来源订单数、种草奖励积分。
- 会员积分：积分发放、积分消耗、签到、等级分布。

### 权限要求

- 平台端看全平台数据。
- 商家端只能看当前 `merchant_id` 下的数据。
- 聚合查询不要相信前端传入的 merchant_id，必须以后端登录态为准。

## 3. 客服与 WebSocket

当前 WebSocket 文档已有基础消息约定，移交后需要实现客服模块。

### 后端模型建议

- `customer_service_conversation`
  - `id`
  - `user_id`
  - `merchant_id`
  - `product_id`
  - `order_id`
  - `status`
  - `last_message_at`
  - `created_at`
  - `updated_at`
- `customer_service_message`
  - `id`
  - `conversation_id`
  - `sender_type`
  - `sender_id`
  - `content_type`
  - `content`
  - `image_urls`
  - `is_read`
  - `created_at`

### 接口建议

- `POST /api/v1/customer-service/conversations`：用户创建或复用会话。
- `GET /api/v1/customer-service/conversations`：用户查看自己的会话。
- `GET /api/v1/customer-service/conversations/{id}/messages`：查看消息历史。
- `POST /api/v1/customer-service/conversations/{id}/messages`：HTTP 兜底发送消息。
- `GET /api/v1/admin/customer-service/conversations`：商家查看本店会话，平台可监管查看。
- `POST /api/v1/admin/customer-service/conversations/{id}/close`：关闭会话。
- `WebSocket /ws/chat/{conversation_id}?token=xxx`：实时聊天。

### WebSocket 消息

- `chat.send`：客户端发送消息。
- `chat.message`：服务端广播消息。
- `chat.read`：已读回执。
- `conversation.closed`：会话关闭。
- `ping` / `pong`：心跳。
- `error`：错误消息。

### 实现要求

- 消息必须先持久化，再推送。
- 用户只能进入自己的会话。
- 商家只能进入本店会话。
- 平台监管查看不能伪装成商家或用户发送消息，除非后续明确设计“平台介入”。
- WebSocket 不承担交易扣库存、支付、退款等关键业务。

## 4. 促销与价格体系

已完成优惠券、满减、积分抵扣和拼团基础链路。后续补齐：

- 限时价：活动时间、活动 SKU、活动价、是否可叠加优惠券、倒计时展示。
- 营销标签：秒杀、满减、热销、新品等展示标签，不做品牌体系。
- 活动冲突规则：同一 SKU 同一时间段只能有一个直接改价活动；普通订单只能使用一种满减和一张优惠券。
- 拼团过期失败：到期未成团时关闭团，退款或标记待退款，回退库存和积分。
- 价格测试：跨店订单、平台券、商家券、商品券、SKU 券、积分抵扣、退款回退。

普通订单价格顺序：

```text
商品价或活动价 -> 满减 -> 优惠券 -> 积分抵扣 -> 支付宝支付
```

拼团订单价格顺序：

```text
拼团价 -> 积分抵扣 -> 支付宝支付
```

## 5. 会员与积分

后续补齐：

- 会员等级：普通、银卡、金卡、钻石。
- 等级权益：积分倍率、生日券、免邮或其它权益。
- 签到：每日签到、连续签到奖励。
- 积分账户页：余额、收入、支出、冻结或回退记录。
- 管理端积分查询和必要的人工调整。
- 退款、售后、订单取消、拼团失败后的积分回退规则。

积分变动必须通过 `points_service.change_points`，不要直接修改 `user.points`。

## 6. 订单、售后与支付硬化

后续补齐：

- 支付超时取消和库存回补的完整测试。
- 支付失败、重复支付通知、重复同步的幂等处理。
- 跨店订单部分退款后，支付单 `partial_refunded/refunded` 状态准确。
- 售后退款后优惠券、积分、库存和订单状态联动。
- 自动确认收货任务、订单日志和售后时间线。
- CSV/Excel 导出字段扩展。

支付仅使用支付宝沙箱扫码支付。mock 支付只作为历史或后端测试兜底，不作为正常前端业务路径。

## 7. 商品、店铺与社区深化

商品与店铺：

- SKU 规格模板和规格值组合生成。
- SKU 批量维护。
- 店铺活动和店铺装修基础字段。
- 更正式的筛选、推荐和营销标签。

社区与种草：

- 种草发帖商品选择优先显示已购商品。
- 话题后台治理：合并、隐藏、推荐。
- 用户主页深化：收藏、关注、代表内容。
- 商家动态权限细化。
- 社区商品卡片增强：价格、店铺、跳转、种草来源加购。

## 8. 基础设施和迁移

- 当前开发环境主要依赖 ORM `create_all` 和 SQLite 补列逻辑，模型稳定后应逐步补 Alembic 迁移。
- Redis 后续用于 token 黑名单、库存预扣、热点缓存和任务队列时，要保持接口兼容。
- Celery 任务需要幂等、日志和失败重试。
- 上传接口后续可按业务场景补鉴权和文件类型/大小限制。

## 文档维护要求

- `docs/api/*.md` 记录接口路径、方法、参数、响应、错误码、分页、权限。
- `docs/dev-setup.md` 记录启动、账号、清库、联调和人工验收流程。
- `docs/conventions.md` 记录命名、接口、权限、前后端同步规则。
- `docs/handoff.md` 记录移交信息。
- `AGENTS.md` 记录当前项目状态和 AI 协作恢复信息。
- 主文档发生需求或设计调整时，最终回复必须明确列出修订内容。
