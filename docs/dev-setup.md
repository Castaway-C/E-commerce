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

商品与上传基础接口已可用于第二阶段联调。开发环境启动后会自动创建 `merchant`、`category`、`product`、`sku`、`product_image` 等表。

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
- token 存储在 `localStorage` 的 `admin_access_token` 和 `admin_refresh_token`

## 配置

复制根目录 `.env.example` 为 `.env` 后按本机环境修改数据库、Redis、JWT 配置。
