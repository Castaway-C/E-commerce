# 项目结构说明

## 根目录

| 路径 | 说明 |
|---|---|
| `backend/` | FastAPI 后端工程 |
| `user-frontend/` | 用户端响应式 Web 工程 |
| `admin-frontend/` | 后台管理端 Web 工程 |
| `docs/` | 项目文档、接口文档、协作说明 |
| `scripts/` | 开发、初始化、检查脚本 |
| `tests/` | 跨端测试和验收测试说明 |

## 后端分层

| 路径 | 职责 |
|---|---|
| `app/api/v1/` | HTTP 路由入口，只做参数接收、鉴权和 service 调用 |
| `app/core/` | 配置、安全、日志、全局中间件等公共能力 |
| `app/db/` | 数据库连接、Redis 连接、ORM Base |
| `app/models/` | SQLAlchemy ORM 模型 |
| `app/schemas/` | Pydantic 请求和响应模型 |
| `app/services/` | 业务逻辑、事务边界、跨模块协作 |
| `app/tasks/` | Celery 异步任务 |
| `app/websocket/` | WebSocket 连接管理 |
| `app/utils/` | 分页、响应、通用工具 |

## 前端分层

| 路径 | 职责 |
|---|---|
| `src/pages/` | 页面级模块，按业务域拆分 |
| `src/components/` | 可复用组件 |
| `src/routes/` | 路由定义 |
| `src/services/` | API 请求封装 |
| `src/store/` | 全局状态 |
| `src/types/` | 共享类型 |
| `src/utils/` | 工具函数 |

