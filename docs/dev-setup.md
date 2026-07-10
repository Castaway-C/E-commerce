cd backend
# 开发启动说明

本文记录当前版本的本地启动、测试数据维护、定时任务和人工验收流程。项目主要业务功能已经完成，默认开发和答辩数据库为 MySQL。

## 环境要求

- Python 3.12.10
- Node.js 18 或更高版本
- MySQL 8.x
- Redis 7.x（用于 Celery 定时任务、缓存和后续消息能力）

## 后端启动

首次配置 MySQL 请先阅读 [MySQL 本地启动与配置](./mysql-setup.md)，在根目录 `.env` 中配置 `DATABASE_URL`。

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
.\.venv\Scripts\python.exe scripts\init_mysql_db.py
python -m uvicorn main:app --reload
```

开发环境会在后端启动时根据 ORM 模型自动建表。切换到 MySQL 后，原 SQLite 文件中的数据不会自动迁移；平台管理员、分类、商家、商品、订单等数据需要在 MySQL 中重新创建或重新录入。

平台管理员初始化：

```powershell
cd backend
.\.venv\Scripts\python.exe scripts\create_admin.py
```

验证或重置管理员密码：

```powershell
.\.venv\Scripts\python.exe scripts\create_admin.py --verify admin_01
.\.venv\Scripts\python.exe scripts\create_admin.py --reset-password admin_01
```

如新增接口前端返回 404，可检查当前 8000 端口是否运行了最新后端：

```powershell
cd backend
.\.venv\Scripts\python.exe scripts\check_routes.py
netstat -ano | findstr :8000
```

## 用户端启动

```powershell
cd user-frontend
npm install
npm run dev
```

默认端口：`5173`。

主要路由：

- `/`：商城首页。
- `/login`、`/register`：用户登录和注册。
- `/products/:productId`：商品详情。
- `/group-buy`：拼团专区。
- `/cart`：购物车。
- `/checkout`：结算和支付宝支付。
- `/orders`、`/orders/:orderId`：订单列表和订单详情。
- `/community`：社区。
- `/customer-service`：客服消息兼容页。
- `/user`：用户中心。
- `/merchants/:merchantId`：店铺主页。

用户端 token 存储在 `localStorage` 的 `user_access_token` 和 `user_refresh_token`。页面已提供登出入口；游客可浏览公共页面，私有操作会提示登录。

## 管理端启动

```powershell
cd admin-frontend
npm install
npm run dev
```

默认端口：`5174`。

平台端主要路由：

- `/admin/login`
- `/admin/dashboard`
- `/admin/home-banners`
- `/admin/merchant-review`
- `/admin/category`
- `/admin/products`
- `/admin/orders`
- `/admin/refunds`
- `/admin/coupons`
- `/admin/community`
- `/admin/customer-service`
- `/admin/users`

商家端主要路由：

- `/merchant/login`
- `/merchant/dashboard`
- `/merchant/products`
- `/merchant/orders`
- `/merchant/refunds`
- `/merchant/coupons`
- `/merchant/full-discounts`
- `/merchant/group-buy`
- `/merchant/community`
- `/merchant/customer-service`
- `/merchant/store`
- `/onboarding`

平台端 token 存储在 `platform_admin_access_token` 和 `platform_admin_refresh_token`；商家端 token 存储在 `merchant_admin_access_token` 和 `merchant_admin_refresh_token`。两套登录态可同时存在。

## 清理测试数据

```powershell
cd backend
.\.venv\Scripts\python.exe scripts\clear_test_data.py --yes
```

说明：

- 默认清空普通用户、商品、店铺、订单、售后、优惠券、社区、操作日志、商家入驻申请和商家账号等测试数据。
- 默认保留 `platform_operator` 平台管理员账号。
- MySQL 下清理脚本会临时关闭外键检查，删除结束后重新开启。
- 如需连平台管理员也清掉，可追加 `--include-platform-admins`。
- 如需连平台配置也清掉，可追加 `--include-platform-settings`。

## Celery 定时任务

如需验证订单超时、优惠券过期、自动确认收货等任务，需要启动 Redis、Celery worker 和 beat：

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
celery -A app.tasks.celery_app.celery_app worker -l info
celery -A app.tasks.celery_app.celery_app beat -l info
```

当前任务：

| 任务 | 默认周期 | 说明 |
|---|---|---|
| `order.cancel_expired_unpaid_orders` | 300 秒 | 处理超过支付窗口的待支付订单 |
| `promotion.expire_user_coupons` | 300 秒 | 更新过期用户券状态 |
| `order.auto_confirm_received_orders` | 3600 秒 | 自动确认超过配置天数的已发货订单 |

## 本地联调提示

- 后端默认地址：`http://localhost:8000`。
- 用户端默认地址：`http://localhost:5173`。
- 管理端默认地址：`http://localhost:5174`。
- 开发环境默认允许 `localhost` 和 `127.0.0.1` 任意端口跨域，便于 Vite 端口顺延。
- 支付宝沙箱参数、数据库密码、AI Key 等敏感信息只放 `.env`。

## 人工验收主流程

1. 创建平台管理员并登录平台后台。
2. 平台创建分类和首页轮播图。
3. 商家提交入驻申请，平台审核通过。
4. 商家登录后台，维护店铺资料，创建商品、SKU、图片、优惠券、满减和拼团。
5. 用户注册登录，维护资料、头像和收货地址。
6. 用户浏览首页、分类、商品详情和店铺主页。
7. 用户收藏商品、关注店铺、领取优惠券、加入购物车。
8. 用户进入结算页，选择地址、促销和积分，生成支付宝二维码并支付。
9. 商家查看订单，选择物流公司并填写或生成快递单号后发货。
10. 用户确认收货，分别评价订单明细商品，可申请售后。
11. 商家和平台查看售后详情、凭证并处理。
12. 用户发布社区帖子、种草帖、评论、点赞和收藏。
13. 另一个用户从种草帖进入商品详情加购并完成购买，检查积分奖励流水。
14. 商家配置拼团，两个用户分别开团/参团并支付，检查成团后订单状态。
15. 用户从商品详情或订单详情打开客服弹窗，商家或平台后台回复。
16. 平台和商家查看报表，用户端打开 AI 助手咨询商城规则。

## 验证命令

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

## 配置文件

复制根目录 `.env.example` 为 `.env` 后按本机环境修改数据库、Redis、JWT、CORS、支付宝和 AI 参数。`.env` 不提交到仓库。
