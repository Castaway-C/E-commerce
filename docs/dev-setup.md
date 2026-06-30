# 开发启动说明

本文记录当前版本的本地启动、测试数据维护、定时任务和人工验收流程。当前项目已经具备基础电商平台闭环，后续开发应按“后端、前端、文档、测试同步”的方式补齐完整需求。

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

当前用户端路由：

- `/`：用户端商城首页，包含账号、分类、商品、详情、地址、购物车、结算、优惠券、订单、售后、社区等功能区。
- `/login`：独立用户登录页。
- `/register`：独立用户注册页。
- `/products`、`/cart`、`/checkout`、`/promotions`、`/community`、`/orders`、`/addresses`、`/user`：当前指向同一套用户端商城页，后续应按完整页面规划拆分。

用户端 token 存储在 `localStorage` 的 `user_access_token` 和 `user_refresh_token`。页面已提供登出入口；切换用户后应刷新用户资料、购物车、地址、订单、优惠券等用户私有数据。

## 管理端启动

```powershell
cd admin-frontend
npm install
npm run dev
```

默认端口：`5174`

当前管理端路由：

- `/dashboard`：管理入口和登录状态。
- `/login`：独立管理端登录页。
- `/platform`：平台运营页，包含看板、用户、后台账号、操作日志、商家入驻审核、分类、商品监管、促销、社区内容治理、订单售后、订单 CSV 导出。平台不能手动创建店铺或商品。
- `/merchant`：商家运营页，只放本店商品创建/编辑、库存、订单发货、本店优惠券。店铺 ID 来自账号绑定，不允许手动输入。
- `/merchant-apply`：商家自助入驻页，只放注册、登录、查看申请、重新提交资料。
- `/products`：当前指向商家运营页。
- `/promotions`、`/community`、`/orders`、`/users`：当前指向平台运营页。

平台端 token 存储在 `platform_admin_access_token` 和 `platform_admin_refresh_token`；商家端 token 存储在 `merchant_admin_access_token` 和 `merchant_admin_refresh_token`。两套 token 可同时存在，平台页和商家页不会互相覆盖登录状态。页面已提供平台端和商家端登出入口。

本地联调时建议使用 `http://localhost:5173` 和 `http://localhost:5174` 访问前端。开发环境默认后端 CORS 允许 `localhost` 和 `127.0.0.1` 的任意端口，避免 Vite 多次启动后端口顺延导致预检失败。如仍出现跨域问题，优先检查 `.env` 中的 `CORS_ALLOW_ORIGINS` 和 `CORS_ALLOW_ORIGIN_REGEX` 是否覆盖默认值。

## 当前人工验收主流程

1. 后端启动后，用 `backend/scripts/create_admin.py` 创建平台账号。
2. 打开管理端 `/dashboard` 或 `/login` 登录平台账号。
3. 进入 `/merchant-apply` 注册商家账号并提交入驻资料。
4. 回到 `/platform`，在“商家入驻审核”模块审核通过，系统创建店铺并绑定商家账号。
5. 平台在 `/platform` 创建或查看分类；分类 ID、父级关系和排序应直接展示。
6. 商家登录 `/merchant`，创建商品、SKU、价格、库存并上传图片。商品创建后默认可售，平台保留监管上下架能力。
7. 用户在用户端注册/登录，新增地址，浏览商品，选择 SKU 加入购物车。
8. 用户领取可用优惠券，结算预览，提交订单并模拟支付。
9. 商家或平台在管理端订单区发货，只填写物流公司和单号，不做真实物流轨迹查询。
10. 用户确认收货后，可评价、申请售后，也可在社区发布普通帖或种草帖。
11. 平台可隐藏不合适的帖子、评论、评价，处理售后，导出订单 CSV，查看操作日志。

验收时正常信息必须显示在页面业务区，例如商品 ID、SKU ID、分类 ID、店铺 ID、订单 ID、售后 ID、优惠券 ID、状态和价格。接口返回 JSON 只用于排查问题，不作为正常使用入口。

## 后续开发要求

- 后端扩展新功能时，前端必须同轮添加调用入口或页面入口。
- 每个模块后续都按完整需求开发，不再只做占位或最小闭环。
- 涉及接口字段、状态、权限、错误码时，同步更新 `docs/api/*.md`。
- 涉及本地启动、测试账号、验收流程时，同步更新本文。
- 涉及长期计划或模块边界时，同步更新 `docs/development-roadmap.md` 和 `AGENTS.md`。

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
