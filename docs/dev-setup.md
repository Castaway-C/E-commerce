# 开发启动说明

本文记录当前版本的本地启动、测试数据维护、定时任务、人工验收流程和移交检查项。当前项目已经具备基础电商平台闭环和联调工作台，移交后应按“后端、前端、文档、测试同步”的方式补齐完整需求。

## 环境要求

- Python 3.12.10
- Node.js 18 或更高版本
- MySQL 8.0（当前本地默认可使用 SQLite 快速联调）
- Redis 7.x（定时任务、缓存和后续 WebSocket/库存能力需要）

## 后端启动

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload
```

开发环境默认会在启动时根据 ORM 模型创建 SQLite 表，便于本地快速联调。正式联调 MySQL 时，请在根目录 `.env` 中配置 `DATABASE_URL`。

管理端平台账号不开放页面注册，本地初始化使用脚本：

```powershell
cd backend
python scripts/create_admin.py
```

管理员密码需要 8-64 位。可以用下面命令验证或重置本地管理员密码：

```powershell
python scripts/create_admin.py --verify admin_01
python scripts/create_admin.py --reset-password admin_01
```

商家账号必须通过管理端 `/merchant-apply` 自助注册入驻。平台运营审核通过后，系统会创建店铺并把该账号升级为 `merchant_operator`。

## 清理测试数据

```powershell
cd backend
python scripts/clear_test_data.py --yes
```

说明：

- 默认清空普通用户、商品、店铺、订单、售后、优惠券、社区、操作日志、商家入驻申请和商家账号等测试数据。
- 默认保留 `platform_operator` 平台管理员账号，方便继续登录。
- 如需连平台管理员也清掉，可执行 `python scripts/clear_test_data.py --yes --include-platform-admins`，之后需要重新运行 `python scripts/create_admin.py`。

## Celery 定时任务

如需验证支付超时取消、优惠券过期、自动确认收货等定时任务，需要本机 Redis 正常运行，并额外启动 Celery worker 和 beat：

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
celery -A app.tasks.celery_app.celery_app worker -l info
celery -A app.tasks.celery_app.celery_app beat -l info
```

当前已配置的定时任务：

| 任务 | 默认周期 | 说明 |
|---|---|---|
| `order.cancel_expired_unpaid_orders` | 300 秒 | 取消超过支付窗口仍未支付的订单，回补库存 |
| `promotion.expire_user_coupons` | 300 秒 | 将已过期且未使用的用户券标记为 `expired` |
| `order.auto_confirm_received_orders` | 3600 秒 | 自动确认超过配置天数仍未确认的发货订单 |

任务执行频率可通过 `.env` 中的 `CELERY_CANCEL_UNPAID_INTERVAL_SECONDS`、`CELERY_EXPIRE_COUPON_INTERVAL_SECONDS`、`CELERY_AUTO_CONFIRM_INTERVAL_SECONDS` 调整；业务窗口由 `ORDER_PAYMENT_EXPIRE_MINUTES` 和 `ORDER_AUTO_CONFIRM_DAYS` 控制。

## 用户端启动

```powershell
cd user-frontend
npm install
npm run dev
```

默认端口：`5173`

当前用户端路由仍偏联调工作台，移交后需要拆成正式页面。当前路由：

- `/`：用户端商城首页，包含紧凑账号区、个人资料编辑、头像上传、我关注的店铺、我收藏的商品、分类、商品、详情、地址增删改查、购物车、结算、优惠券、订单、售后、社区等功能区。
- `/login`：独立用户登录页。
- `/register`：独立用户注册页。
- `/group-buy`：当前指向用户端商城页中的拼团专区，用户可查看拼团活动、发起拼团、加入正在拼的团，并进入支付宝沙箱支付。
- `/merchants/:merchantId`：用户端店铺主页，展示店铺 ID、店铺名、公告、Logo、关注状态、关注数、店铺优惠券、店铺商品、价格筛选和排序，并可从店铺商品进入详情和加入购物车。
- `/products`、`/cart`、`/checkout`、`/promotions`、`/community`、`/orders`、`/addresses`、`/user`：当前指向同一套用户端商城页，后续应按正式前端规划拆分。

用户端 token 存储在 `localStorage` 的 `user_access_token` 和 `user_refresh_token`。页面已提供登出入口；切换用户后应刷新用户资料、购物车、地址、订单、优惠券、关注店铺、收藏商品等用户私有数据。

## 管理端启动

```powershell
cd admin-frontend
npm install
npm run dev
```

默认端口：`5174`

当前管理端路由也属于联调工作台，移交后应拆成更细的后台页面。当前路由：

- `/dashboard`：管理入口和登录状态。
- `/login`：独立管理端登录页。
- `/platform`：平台运营页，包含看板、用户、后台账号、操作日志、商家入驻审核、分类、商品监管、促销、完整社区内容治理、订单详情、售后详情和处理、订单 CSV 导出。平台不能手动创建店铺或商品。
- `/merchant`：商家运营页，只放本店店铺资料编辑、商品创建/编辑、库存、订单详情、订单发货、本店售后处理、本店优惠券、本店满减、上传/配置拼团商品、本店拼团活动、社区浏览和商家动态发布。店铺 ID 来自账号绑定，不允许手动输入。
- `/merchant-apply`：商家自助入驻页，只放注册、登录、查看申请、重新提交资料。入驻表单中的说明是“入驻申请说明”，不是用户端店铺公告。
- `/products`：当前指向商家运营页。
- `/promotions`、`/community`、`/orders`、`/users`：当前指向平台运营页。

平台端 token 存储在 `platform_admin_access_token` 和 `platform_admin_refresh_token`；商家端 token 存储在 `merchant_admin_access_token` 和 `merchant_admin_refresh_token`。两套 token 可同时存在，平台页和商家页不会互相覆盖登录状态。页面已提供平台端和商家端登出入口。

用户端和管理端 HTTP 层已接入 refresh token 自动刷新：普通接口返回 401 时会先尝试刷新 access token 并重放原请求；刷新失败才清理对应登录态。管理端刷新按平台端/商家端 session 分开处理。

本地联调时建议使用 `http://localhost:5173` 和 `http://localhost:5174` 访问前端。开发环境默认后端 CORS 允许 `localhost` 和 `127.0.0.1` 的任意端口，避免 Vite 多次启动后端口顺延导致预检失败。如仍出现跨域问题，优先检查 `.env` 中的 `CORS_ALLOW_ORIGINS` 和 `CORS_ALLOW_ORIGIN_REGEX` 是否覆盖默认值。

## 当前人工验收主流程

1. 后端启动后，用 `backend/scripts/create_admin.py` 创建平台账号。
2. 打开管理端 `/dashboard` 或 `/login` 登录平台账号。
3. 进入 `/merchant-apply` 注册商家账号并提交入驻资料。
4. 回到 `/platform`，在“商家入驻审核”模块审核通过，系统创建店铺并绑定商家账号。审核通过时店铺公告默认为空，商家后续在 `/merchant` 的店铺资料区自行编辑公告。
5. 平台在 `/platform` 创建、编辑、停用或查看分类；分类 ID、父级关系、完整路径和排序应直接展示。分类最多三级，排序只影响同一父级下展示顺序。停用分类为软停用，有启用子分类或已有商品占用时不能停用。
6. 商家登录 `/merchant`，先维护店铺名称、Logo 和店铺公告，再通过分类路径下拉选择分类，创建商品、SKU、价格、划线价、库存并上传一张或多张商品图片。第一张图片作为封面，其余图片会在用户端商品详情中作为图文内容展示。商品创建后默认可售；商家可继续编辑商品名称、分类、描述、图片，逐个编辑已有 SKU，并新增 SKU。商家端和平台端商品列表均应支持价格区间与排序筛选；平台保留监管上下架能力。
7. 用户在用户端注册/登录，编辑个人资料并上传头像，新增/修改/删除带街道、邮编、标签的地址，浏览商品。选择父级分类时，应能看到该父级及全部子分类商品；商品列表支持关键词、价格区间和排序筛选；商品卡片、商品详情和店铺页应显示销售价与划线价；商品详情应展示评分摘要和公开评价列表。点击商品卡片或商品详情中的店铺 ID/店铺名，应进入 `/merchants/:merchantId` 店铺主页并能关注/取消关注店铺、查看关注数、领取店铺可用优惠券、筛选价格、切换排序、进入商品详情和加入购物车；商品详情应能收藏/取消收藏商品，回到用户端首页后，应能在“我关注的店铺”和“我收藏的商品”中看到对应店铺或商品入口。
8. 用户领取可用优惠券，维护购物车后结算预览，提交订单并支付宝沙箱支付。
   - 购物车应支持单项数量修改、单项移除、全选有效商品、取消全选、移除失效商品、清空购物车。
   - 购物车结算区只展示未使用且模板仍启用的用户券；停用模板、已使用、已过期或已作废用户券不应作为可选项。
   - 领取按钮应根据本账号已领数量、库存和模板状态禁用；下单成功后应刷新我的优惠券并清空已选券。
   - 购物车中 `invalid_reason` 不为空的失效商品应有明显提示，不参与有效合计、结算预览或提交订单。
   - 跨店购物车提交后应展示同一支付单下生成的多个订单 ID；支付宝沙箱支付会一起支付全部子订单，待支付取消任意子订单会取消整组并回补所有店铺 SKU 库存。
   - 支付宝二维码生成期间，前端应显示 loading 并禁用“生成/刷新支付宝二维码”按钮，避免同一支付单重复发出预创建请求。
9. 商家在 `/merchant` 上传/配置拼团商品：选择本店商品 SKU，设置 2 人或 3 人成团和拼团价。用户在 `/group-buy` 或商品详情中发起拼团并支付宝沙箱支付后，订单先显示为 `group_pending` 待成团；24 小时内其它用户加入并支付后，团变为已成团，相关订单进入商家待发货。拼团可一次购买多件同一 SKU，但成团人数按已支付用户数计算，不按件数计算。拼团不加入购物车，不叠加满减或优惠券，不参与社区种草，但可使用积分抵扣。
10. 社区验收：综合广场展示所有公开帖子，种草专区只展示种草内容；用户确认收货后发布 `grass` 种草帖，必须绑定已完成订单中的商品；其它用户从该帖进入商品详情并点击“种草来源加购”后，购物车应显示“种草来源 #帖子ID”。该用户正常下单、支付并确认收货后，种草推广人和下单者分别获得命中商品原价 1% 的积分奖励。普通帖和商家动态可绑定商品但不产生种草奖励。商家端应能浏览完整社区内容并发布商家动态；平台端应能浏览帖子全文、图片、关联商品和评论，并能隐藏帖子或评论。
11. 商家或平台在管理端订单区发货，只填写物流公司和单号，不做真实物流轨迹查询。
12. 用户端订单区应支持分页、按订单状态筛选、取消待支付订单、查看支付单状态、支付宝沙箱支付、确认收货和申请售后；申请售后时必须选择订单明细和退款数量，申请后应能在“我的售后”中看到售后 ID、订单 ID、订单明细 ID、商品 ID、SKU ID、数量、状态、金额和原因。
13. 用户确认收货后，可选择订单中的具体商品分别用星级、文字和图片评价，也可在社区发布普通帖、体验分享、询问求助或种草帖。
14. 商家可在商家端查看本店订单详情、发货并处理本店售后详情；平台可查看全平台订单详情、查看售后详情和凭证、隐藏不合适的帖子/评论/评价、处理全平台售后，导出订单 CSV，查看操作日志。

验收时正常信息必须显示在页面业务区，例如商品 ID、SKU ID、分类 ID、店铺 ID、订单 ID、售后 ID、优惠券 ID、状态和价格。接口返回 JSON 只用于排查问题，不作为正常使用入口。

## 移交检查清单

移交给同学前建议至少确认：

1. `.env` 已配置本地数据库、JWT、CORS 和支付宝沙箱参数；私钥未提交到 GitHub。
2. 后端可启动，Swagger 能打开，上传目录可访问。
3. 平台管理员可通过 `scripts/create_admin.py` 创建、验证和重置密码。
4. 商家可从 `/merchant-apply` 自助注册，平台可审核通过，商家审核后可登录 `/merchant`。
5. 商家可维护店铺资料、创建商品、上传多图、创建 SKU、配置优惠券、满减和拼团。
6. 用户可注册登录、编辑资料和头像、维护地址、浏览商品、收藏商品、关注店铺。
7. 用户可加购、选择满减/优惠券/积分、下单、支付宝沙箱扫码支付、同步支付状态。
8. 商家可发货，用户可确认收货、分别评价订单明细商品、申请售后。
9. 商家和平台可查看售后详情和凭证，并处理售后。
10. 社区可发普通帖、种草帖、商家动态，帖子详情能展示关联商品卡片。
11. 种草来源加购后，确认收货能产生推广人和下单者积分奖励。
12. 拼团可开团、参团、支付和成团；拼团不进入购物车，不叠加满减或优惠券。
13. 页面业务区能看到关键业务数据和 ID，不依赖接口 JSON 返回区确认结果。
14. `docs/handoff.md`、`docs/development-roadmap.md`、`AGENTS.md` 与当前实现一致。

## 移交后开发要求

- 后端扩展新功能时，前端必须同轮添加调用入口或页面入口。
- 每个模块后续都按完整需求开发，不再只做占位或最小闭环。
- 涉及接口字段、状态、权限、错误码时，同步更新 `docs/api/*.md`。
- 涉及本地启动、测试账号、验收流程时，同步更新本文。
- 涉及长期计划或模块边界时，同步更新 `docs/development-roadmap.md` 和 `AGENTS.md`。
- 当前前端为联调工作台，最终迭代应拆分为正式商城、社区、用户中心、订单售后、平台后台、商家后台、报表和客服页面。

## 验证命令

后端改动后：

```powershell
.\.venv\Scripts\python.exe -m pytest backend/tests -q
.\.venv\Scripts\python.exe -m compileall backend\app backend\tests
```

前端改动后：

```powershell
cd user-frontend
npm run build
```

```powershell
cd admin-frontend
npm run build
```

如果只需要快速检查 TypeScript，可运行：

```powershell
.\node_modules\.bin\tsc.cmd -b
```

## 配置

复制根目录 `.env.example` 为 `.env` 后按本机环境修改数据库、Redis、JWT、CORS 和任务配置。
