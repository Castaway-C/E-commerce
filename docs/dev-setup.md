# 开发启动说明

## 环境要求

- Python 3.12.10
- Node.js 18 或更高版本
- MySQL 8.0
- Redis 7.x

## 后端

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload
```

开发环境默认会在启动时根据 ORM 模型创建 SQLite 表，便于本地快速联调。正式联调 MySQL 时，请在 `.env` 中配置 `DATABASE_URL`。

当前阶段已实现普通用户注册登录和管理端登录接口。普通用户可通过 `/api/v1/auth/register` 注册；管理端账号暂不开放注册，需要后续通过初始化脚本或数据库写入。

创建管理端初始账号：

```powershell
cd backend
python scripts/create_admin.py
```

管理员密码需要 8-64 位。若登录接口返回 `422 Unprocessable Entity`，优先检查密码长度是否满足接口校验。可以用下面命令验证或重置本地管理员密码：

```powershell
python scripts/create_admin.py --verify admin_01
python scripts/create_admin.py --reset-password admin_01
```

清理本地测试数据：

```powershell
cd backend
python scripts/clear_test_data.py --yes
```

说明：

- 默认清空用户、商品、店铺、订单、售后、优惠券、社区、操作日志、商家入驻申请和商家账号等测试数据。
- 默认保留 `platform_operator` 平台管理员账号，方便继续登录。
- 如需连平台管理员也清掉，可执行 `python scripts/clear_test_data.py --yes --include-platform-admins`，之后需要重新运行 `python scripts/create_admin.py` 创建平台账号。

商品与上传基础接口已可用于第二阶段联调。开发环境启动后会自动创建 `merchant`、`category`、`product`、`sku`、`product_image` 等表。

购物车与订单基础接口已可用于第三阶段联调。开发环境启动后会自动创建 `cart_item`、`payment`、`orders`、`order_item` 等表。

收货、评价与售后基础接口已可用于第四阶段联调。开发环境启动后会自动创建 `product_review`、`refund` 等表。

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

前端当前已重写为“简洁可用业务页面 + 折叠接口排查区”，目标是像未修饰的商城/后台页面一样走通现有功能，不作为最终视觉稿。正常验收时应直接在对应业务区查看数据和操作结果，不应依赖接口返回 JSON；接口返回只在报错或排查字段时展开查看。

- 用户端 `/`：简洁商城页，包括账号、商品浏览、SKU 选择、优惠券、社区、地址、购物车、结算下单、支付、订单、评价和售后。
- 管理端 `/dashboard`：管理入口和登录状态页。
- 管理端 `/platform`：平台运营页，包括看板、用户、后台账号、操作日志、商家入驻审核、分类创建、商品审核/监管、促销、社区审核、订单售后、订单 CSV 导出。平台不能手动创建店铺或商品。
- 管理端 `/merchant`：商家运营页，只放本店商品创建/编辑、库存、订单发货、本店优惠券；店铺 ID 来自账号绑定，不允许手动输入。
- 管理端 `/merchant-apply`：商家自助入驻页，只放注册、登录、查看申请、重新提交资料。
- 价格输入和展示统一使用“元”，前端提交接口时转换为后端需要的“分”。
- 页面只做极基础前端校验，主要依赖后端返回真实错误，方便验证后端可靠性；但已有数据必须展示在表格、卡片、状态区等正常业务区域，不允许做成密集按钮墙。页面应保持简洁美观，像日常商城/后台网页，而不是接口调试工具。

## 前四阶段功能范围

前四个阶段已经具备“基础商城闭环”：

- 阶段一：普通用户与后台管理员登录体系分离。
- 阶段二：商家入驻审核通过后获得店铺，商家端创建商品并提交审核，平台端维护分类和审核/管理商品，用户端浏览已上架商品并加入购物车。
- 阶段三：购物车、地址选择、结算、创建订单、模拟支付、订单列表。
- 阶段四：发货、确认收货、评价、评价审核、售后申请和退款状态流转。

当前仍属于实训项目基础版，暂未完成真实支付、满减/限时价/拼团、复杂库存预占、店铺后台权限细分和经营报表。社区发帖、评论、点赞、审核、种草帖已购校验、种草来源下单和确认收货积分奖励已具备基础闭环，但话题管理、商家广告帖权限细分和完整积分流水仍待后续补充。按实现设计书 6.2，本项目不实现物流轨迹查询，只保留商家发货记录和用户确认收货。

## 前端页面手工测试流程

1. 后端启动后，先用 `backend/scripts/create_admin.py` 创建管理端初始账号。
2. 打开管理端 `/dashboard` 登录平台账号，也可以使用独立 `/login` 页登录。
3. 进入 `/merchant-apply` 注册商家，登录后查看申请状态；再切回平台账号，在 `/platform` 的“商家入驻审核”模块审核通过，系统会创建店铺并绑定商家账号。
4. 平台账号在 `/platform` 的“分类管理”模块创建分类。分类 ID 会直接显示在分类卡片中，商家端创建商品时可选择。
5. 商家账号重新登录后进入 `/merchant`，确认页面顶部显示固定店铺 ID；在“本店商品”模块选择分类、创建商品并提交审核。商品表格会直接显示商品 ID、分类 ID、SKU ID、价格和库存。
6. 平台账号回到 `/platform`，在“商品审核与管理”模块审核通过/拒绝、上架、下架或监管库存。
7. 打开用户端 `/register` 注册普通用户，或在 `/login` 登录已有普通用户。
8. 进入用户端 `/`，在“当前用户”区域登录或注册，在“收货地址”区域新增地址。
9. 在用户端 `/` 的“商品浏览”区域刷新商品，选择商品和 SKU 后加入购物车。
10. 在“购物车与结算”区域查看购物车明细、选择地址和优惠券、结算预览、提交订单，并用页面显示的支付单 ID 模拟支付。
11. 回到管理端 `/platform` 或商家账号的 `/merchant`，在“订单与售后”或“本店订单”表格中找到订单，填写物流公司和单号后发货。
12. 回到用户端 `/`，在“我的订单”区域查看订单状态，确认收货后可对选中订单发表评价或申请售后。
13. 回到管理端 `/platform`：
    - 在“社区审核”模块审核帖子和评论。
    - 在“订单与售后”模块处理售后：同意、拒绝、确认退货、退款完成。
    - 点击“导出订单”测试订单 CSV 导出。
14. 商家入驻测试：
    - 在管理端 `/merchant-apply` 注册商家。
    - 点击“用商家账号登录”，确认申请状态区域显示待审核信息。
    - 可测试“查看我的申请”和“重新提交资料”。
    - 切回平台账号，在 `/platform` 的“商家入驻审核”模块审核通过或拒绝。
    - 商家账号重新登录后应变为 `merchant_operator`，只允许操作绑定店铺数据。
15. 社区普通帖测试：
    - 用户端 `/` 的“社区”区域发布普通帖。
    - 管理端 `/platform` 的“社区审核”模块刷新待审核帖子并审核通过。
    - 用户端刷新公开帖，测试点赞和评论。
    - 管理端刷新待审核评论并审核通过。
16. 种草来源下单测试：
    - 用户 A 先完成一次商品购买、发货和确认收货。
    - 用户 A 在用户端 `/` 的“社区”区域发布种草帖，并填写已完成订单中的商品 ID。
    - 管理端 `/platform` 审核通过该种草帖。
    - 用户 B 在用户端 `/` 选择来源种草帖、加购同商品、下单并模拟支付。
    - 管理端发货，用户 B 在用户端订单区域确认收货。
    - 用户 A 的积分会增加当前基础奖励 10 分。
17. 优惠券测试：
    - 管理端 `/platform` 或 `/merchant` 创建优惠券模板。若使用商家运营账号，只能创建本店铺 `merchant` 范围优惠券。
    - 用户端 `/` 的“优惠券”区域刷新可领优惠券并领取，在“我的优惠券”列表中选择。
    - 用户端加购符合范围的商品，填写用户券 ID 后结算、下单、模拟支付。
    - 管理端可测试停用模板、批量发券和手动过期用户券；批量发券前可在 `/platform` 的“用户与后台账号”模块查询用户 ID。

测试时重点观察业务区域是否能展示关键 ID、列表数据、订单和售后状态变化。只有当页面报错或数据异常时才展开“接口返回排查”。页面样式目前只保证可用，不作为最终视觉稿。

## 用户端

```powershell
cd user-frontend
npm install
npm run dev
```

默认端口：`5173`

当前阶段用户端页面：

- `/`：用户端简洁商城页
- `/login`：独立用户登录页
- `/register`：独立用户注册页
- `/products`、`/cart`、`/checkout`、`/promotions`、`/community`、`/orders`、`/addresses`、`/user`：当前均指向用户端简洁商城页
- token 存储在 `localStorage` 的 `user_access_token` 和 `user_refresh_token`

## 管理端

```powershell
cd admin-frontend
npm install
npm run dev
```

默认端口：`5174`

当前阶段管理端页面：

- `/login`：独立管理端登录页
- `/dashboard`：管理入口和登录状态
- `/platform`：平台运营页
- `/merchant`：商家运营页
- `/merchant-apply`：商家入驻页
- `/products`：当前指向商家运营页
- `/promotions`、`/community`、`/orders`、`/users`：当前指向平台运营页
- token 存储在 `localStorage` 的 `admin_access_token` 和 `admin_refresh_token`

本地联调时建议统一使用 `http://localhost:5173` 和 `http://localhost:5174` 访问前端。开发环境默认后端 CORS 允许 `localhost` 和 `127.0.0.1` 的任意端口，避免 Vite 多次启动后端口顺延导致 `OPTIONS ... 400 Bad Request`。如果仍出现跨域预检失败，优先检查 `.env` 中的 `CORS_ALLOW_ORIGINS` 和 `CORS_ALLOW_ORIGIN_REGEX` 是否覆盖了默认值。

## 配置

复制根目录 `.env.example` 为 `.env` 后按本机环境修改数据库、Redis、JWT 配置。
