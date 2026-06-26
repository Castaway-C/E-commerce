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

## 用户端

```powershell
cd user-frontend
npm install
npm run dev
```

默认端口：`5173`

## 管理端

```powershell
cd admin-frontend
npm install
npm run dev
```

默认端口：`5174`

## 配置

复制根目录 `.env.example` 为 `.env` 后按本机环境修改数据库、Redis、JWT 配置。

