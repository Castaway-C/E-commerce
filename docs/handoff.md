# 协作移交说明

本文用于项目移交。接手同学应先阅读本文，再看 `README.md`、`docs/dev-setup.md`、`docs/api/*.md`、`docs/development-roadmap.md` 和 `AGENTS.md`。

`需求规格说明书.md` 和 `实现设计说明书.md` 是早期历史资料，本阶段不再作为主要编码依据；如与当前代码、接口文档或本文冲突，以当前实现和接口文档为准。

## 当前阶段结论

当前社交新零售电商平台的用户端、平台端、商家端主要功能已经前后端完整接通，AI 购物助手最小版也已接入。项目可以进入最终验收、展示优化、真实大模型适配和边界测试补强阶段。

已具备的主链路：

- 普通用户注册、登录、登出、资料编辑、头像上传、地址增删改查。
- 商家自助入驻、平台审核、审核通过后创建店铺并绑定商家账号。
- 平台首页轮播图配置，用户端首页展示启用轮播图；上传文件写入和静态访问目录统一为 `backend/uploads`。
- 平台分类管理、商家商品和 SKU 管理、商品多图和图文详情、商品收藏、店铺关注。
- 购物车、跨店结算、优惠券、满减、积分抵扣、支付宝沙箱扫码支付。
- 订单列表、支付单查询、商家发货、用户确认收货、按订单明细评价。
- 售后按订单明细和数量申请，商家和平台可查看详情、凭证并处理售后。
- 社区发帖、评论、点赞、收藏、分区、话题、用户主页、关联商品卡片、平台内容隐藏。
- 种草帖来源加购、确认收货后给推广人和下单者发放积分奖励。
- 拼团专区、商家拼团活动、用户开团和参团、支付宝支付后成团流转。
- 平台和商家报表看板。
- 用户、平台、商家客服会话，支持 HTTP 兜底消息和基础 WebSocket 推送；新会话会自动发送一次客服欢迎语；用户中心内嵌客服消息，商品详情和订单详情提供右下角弹窗会话，平台/商家后台为双栏客服工作台。
- 用户端 AI 购物助手最小版，悬浮在商城页面右侧；后端优先调用 qwen-flash，未配置 Key 或请求失败时通过预设提示词回答购物流程、优惠积分、拼团、售后、客服和社区种草问题。

## 前端现状

用户端已拆为正式页面：

- `/`：商品列表首页，含轮播图和紧凑逐级展开分类筛选。
- `/login`、`/register`：用户登录注册。
- `/products/:productId`：商品详情。
- `/group-buy`：拼团专区。
- `/cart`：购物车。
- `/checkout`：结算。
- `/orders`：订单列表、筛选、分页和快捷操作。
- `/orders/:orderId`：订单详情、支付信息、物流、优惠、评价商品、申请售后、商家客服和平台客服弹窗。
- `/community`：社区。
- `/customer-service`：客服消息兼容页。
- `/user`：用户中心，包含资料、地址、积分会员、优惠券、收藏、关注、收藏帖子和客服消息等。
- `/merchants/:merchantId`：店铺主页。

管理端已拆为平台后台和商家后台：

- 平台端：`/admin/dashboard`、`/admin/home-banners`、`/admin/merchant-review`、`/admin/category`、`/admin/products`、`/admin/orders`、`/admin/refunds`、`/admin/coupons`、`/admin/community`、`/admin/customer-service`、`/admin/users`。
- 商家端：`/merchant/dashboard`、`/merchant/products`、`/merchant/orders`、`/merchant/refunds`、`/merchant/coupons`、`/merchant/full-discounts`、`/merchant/group-buy`、`/merchant/community`、`/merchant/customer-service`、`/merchant/store`。
- 商家入驻：`/onboarding`。

旧的测试控制台代码仍保留在 `user-frontend/src/pages/test-console/index.tsx` 和 `admin-frontend/src/pages/workbench/` 作为历史参考，新功能不要再回写到旧工作台。

## 不做的旧方案

- 不接入微信支付。
- 正常前端业务不使用 mock 支付，只使用支付宝沙箱扫码支付。
- 不实现真实物流轨迹查询，只做商家发货、用户确认收货。
- 不实现售后取消。
- 不做商品迁移功能。
- 不做品牌体系，只保留营销标签。
- 商品、帖子、评论、评价不做事前审核，采用发布后治理；只有商家入驻需要审核。

## 支付说明

支付仅使用支付宝沙箱扫码支付。

- 沙箱网关：`https://openapi-sandbox.dl.alipaydev.com/gateway.do`
- 预创建接口：`POST /api/v1/payments/{payment_id}/alipay/precreate`
- 支付同步接口：`POST /api/v1/payments/{payment_id}/alipay/sync`
- 异步通知接口：`POST /api/v1/payments/notify/alipay`

`.env` 中需要配置支付宝 App ID、应用私钥、支付宝公钥和 notify URL。私钥不得提交到 GitHub。

## 后续开发总原则

1. 后端扩展新功能时，前端必须同轮补充页面入口、表单、列表、按钮或状态展示。
2. 接口字段、权限、状态、错误码或价格规则变化时，同步更新 `docs/api/*.md`。
3. 业务结果必须展示在页面业务区，接口 JSON 返回只作为排查工具。
4. 普通用户、商家运营、平台运营的 token、页面和权限必须分离。
5. 需求书和实现书不再作为主要依据，后续以当前代码、接口文档、本文和 AGENTS 为准。

## AI 助手开发建议

当前已完成用户端悬浮 AI 购物助手最小版，后端接口为 `POST /api/v1/ai-assistant/chat`，服务实现位于 `backend/app/services/ai_assistant_service.py`。当前模型使用 qwen-flash 的 OpenAI 兼容接口；配置 `DASHSCOPE_API_KEY` 或 `AI_ASSISTANT_API_KEY` 后即可调用，未配置或调用失败会降级为预设回复。当前不读取实时业务数据。后续建议分两层继续：

- 用户端悬浮购物助手：可逐步读取公开商品、店铺、促销、拼团、社区内容，回答商品选择、优惠使用、订单状态解释等问题。
- 平台/商家客服建议回复：在客服会话中生成回复草稿，由人工点击发送。

安全边界：

- AI 不直接修改订单、退款、库存、积分、优惠券、商品上下架等关键业务状态。
- 涉及支付、退款、售后争议时，AI 只做解释和引导，最终操作由用户、商家或平台运营确认。
- AI 调用后端数据时必须沿用当前登录态权限，不能通过 AI 绕过平台/商家/用户边界。

## 常用验证

后端：

```powershell
.\.venv\Scripts\python.exe -m pytest backend\tests -q
.\.venv\Scripts\python.exe -m compileall backend\app backend\tests
```

用户端：

```powershell
cd user-frontend
.\node_modules\.bin\tsc.cmd -b
npm run build
```

管理端：

```powershell
cd admin-frontend
.\node_modules\.bin\tsc.cmd -b
npm run build
```

## 移交检查清单

- `.env` 已配置本地数据库、JWT、CORS 和支付宝沙箱参数。
- 平台管理员可登录。
- 平台可配置首页轮播图，用户端首页可展示并跳转商品或链接。首页分类筛选默认只展示一级分类，选中父级后逐级展开子分类；用户端不展示分类 ID。
- 商家可自助注册并由平台审核通过。
- 商家可维护店铺资料、商品、SKU、拼团、优惠券、满减和售后。
- 用户可注册登录、维护资料和地址、下单、支付宝支付、确认收货、评价和申请售后。
- 社区种草来源加购后能产生积分奖励。
- 平台和商家报表能按权限展示；当前以后端已有指标为基础，前端已提供成交趋势、状态分布、售后分布、促销漏斗、排行和社区互动等可视化。
- 平台会员积分配置可保存等级签到加成、等级积分抵扣上限、积分倍率预留值和权益说明；实际计算已使用签到加成和等级抵扣上限。
- 用户、商家、平台客服会话能按权限创建、查看和回复。订单列表不直接联系客服；订单详情应能分别打开商家客服和平台客服弹窗。平台端只看平台咨询，商家端只看本店咨询，客服状态显示为“进行中/已结束”。
- 前端页面展示业务数据，不依赖接口返回区查看结果。
- 文档与当前实现一致，不再把需求书和实现书作为主要编码依据。
