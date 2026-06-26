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

商品与上传基础接口已可用于第二阶段联调。开发环境启动后会自动创建 `merchant`、`category`、`product`、`sku`、`product_image` 等表。

购物车与订单基础接口已可用于第三阶段联调。开发环境启动后会自动创建 `cart_item`、`payment`、`orders`、`order_item` 等表。

收货、评价与售后基础接口已可用于第四阶段联调。开发环境启动后会自动创建 `product_review`、`refund` 等表。

前端最简页面建议从每个后端阶段同步补充：后端接口完成后，立即增加一个能点通主流程的最简页面。当前已有登录、商品、购物车、结算、订单、确认收货、评价、售后和管理端发货/评价审核/售后处理入口，可作为功能冒烟测试页面。

## 前四阶段功能范围

前四个阶段已经具备“基础商城闭环”：

- 阶段一：普通用户与后台管理员登录体系分离。
- 阶段二：管理端创建店铺和商品，用户端浏览已上架商品并加入购物车。
- 阶段三：购物车、结算、创建订单、模拟支付、订单列表。
- 阶段四：发货、确认收货、评价、评价审核、售后申请和退款状态流转。

当前仍属于实训项目基础版，暂未完成真实支付、地址管理、物流跟踪、优惠券核销、复杂库存预占、店铺后台权限细分和经营报表。这些功能后续应按阶段继续补充，不要在最简测试页里提前堆完整业务。

## 最简页面手工测试流程

1. 后端启动后，先用 `backend/scripts/create_admin.py` 创建管理端初始账号。
2. 打开管理端 `/login`，登录后进入 `/products`。
3. 在管理端 `/products` 输入店铺名称、商品名称、价格，点击“创建并上架”。页面会显示店铺 ID、商品 ID、SKU ID。
4. 打开用户端 `/register` 注册普通用户，或在 `/login` 登录已有普通用户。
5. 进入用户端 `/products`，找到刚创建的商品，点击“加入购物车”。
6. 进入用户端 `/cart`，确认购物车商品后进入 `/checkout`。
7. 在 `/checkout` 点击“提交并模拟支付”。页面会显示支付单 ID 和订单 ID。
8. 回到管理端 `/orders`，输入订单 ID，点击“发货”。
9. 回到用户端 `/orders`，点击“确认收货”，再点击“默认好评”或“申请售后”。页面会显示评价 ID 或售后 ID。
10. 回到管理端 `/orders`：
    - 输入评价 ID，点击“审核通过”或“审核拒绝”。
    - 在售后列表点击“同意”“驳回”“确认收到退货”“退款完成”测试售后流转。

测试时重点观察接口是否返回成功、页面是否能展示关键 ID、订单和售后状态是否按预期变化。页面样式目前只保证可用，不作为最终视觉稿。

## 用户端

```powershell
cd user-frontend
npm install
npm run dev
```

默认端口：`5173`

当前阶段已接入用户端登录、注册和个人中心资料读取：

- `/login`：用户登录
- `/register`：用户注册
- `/products`：商品列表
- `/cart`：购物车
- `/checkout`：结算和模拟支付
- `/orders`：订单列表、确认收货、默认好评、申请售后
- `/user`：个人中心资料占位页
- token 存储在 `localStorage` 的 `user_access_token` 和 `user_refresh_token`

## 管理端

```powershell
cd admin-frontend
npm install
npm run dev
```

默认端口：`5174`

当前阶段已接入管理端登录和数据看板管理员信息读取：

- `/login`：管理端登录
- `/dashboard`：管理端首页占位页
- `/products`：商品快速创建和上架占位页
- `/orders`：快速发货、评价审核和售后处理占位页
- token 存储在 `localStorage` 的 `admin_access_token` 和 `admin_refresh_token`

本地联调时建议统一使用 `http://localhost:5173` 和 `http://localhost:5174` 访问前端。开发环境默认后端 CORS 允许 `localhost` 和 `127.0.0.1` 的任意端口，避免 Vite 多次启动后端口顺延导致 `OPTIONS ... 400 Bad Request`。如果仍出现跨域预检失败，优先检查 `.env` 中的 `CORS_ALLOW_ORIGINS` 和 `CORS_ALLOW_ORIGIN_REGEX` 是否覆盖了默认值。

## 配置

复制根目录 `.env.example` 为 `.env` 后按本机环境修改数据库、Redis、JWT 配置。
