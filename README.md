# It's Mygo

一次买够（It's Mygo）是一个学生实训项目，定位为“社交新零售电商平台”。项目已经进入基本完结阶段：用户端、平台端、商家端的核心业务链路均已前后端接通，后续主要是前端交互细节、展示效果、答辩演示和少量体验优化。

## 技术栈

- 后端：FastAPI + SQLAlchemy async + MySQL + Celery。
- 前端：React + TypeScript + Vite + Ant Design 5。
- 数据库：MySQL 8.x，SQLite 仅作为早期历史文件保留，不再作为默认开发库。
- 支付：支付宝沙箱扫码支付。
- AI：qwen-flash，当前实现用户端悬浮 AI 购物助手最小版。
- Python：3.12.10。

## 主要目录

- `backend/`：FastAPI 后端工程，包含模型、schema、router、service、任务和测试。
- `user-frontend/`：用户端商城前端。
- `admin-frontend/`：管理端前端，包含平台后台、商家后台和商家入驻。
- `docs/`：项目文档、接口文档、最终版需求/设计说明、答辩材料。
- `scripts/`：项目级辅助脚本。
- `backend/tests/`：后端自动化测试。

## 当前功能基线

当前版本已具备完整电商平台的主要能力：

- 普通用户、平台运营、商家运营账号体系分离。
- 商家自助注册入驻，平台审核通过后创建店铺并授予商家权限。
- 平台负责分类、首页轮播、入驻审核、商品监管、内容治理、用户管理、报表、会员积分配置。
- 商家负责店铺资料、商品、SKU、库存、图片、图文详情、优惠券、满减、拼团、发货、售后和本店客服。
- 用户可游客浏览商城，登录后完成资料、头像、地址、收藏、关注、购物车、结算、支付宝支付、确认收货、评价、售后。
- 促销支持优惠券、满减、积分抵扣、会员积分配置和积分流水。
- 社区支持分区、发帖、评论、点赞、收藏、话题、用户主页、关联商品卡片、种草来源加购和积分奖励。
- 拼团支持商家配置 2 人或 3 人团，用户开团/参团，支付后成团进入发货流程。
- 客服支持用户、平台、商家会话，商品详情和订单详情可直接打开客服弹窗。
- 报表已覆盖平台和商家的主要经营数据可视化。
- AI 助手已接入 qwen-flash，当前不读取实时业务数据，只做购物流程、规则说明和基础咨询回答。

## 文档入口

建议按以下顺序阅读：

1. [AGENTS.md](./AGENTS.md)：当前项目状态、协作规则、重要业务约定。
2. [docs/final-requirements.md](./docs/final-requirements.md)：按当前实现整理的最终版需求说明。
3. [docs/final-design.md](./docs/final-design.md)：按当前实现整理的最终版实现设计说明。
4. [docs/dev-setup.md](./docs/dev-setup.md)：本地启动、数据库、账号、清库和验收流程。
5. [docs/api/README.md](./docs/api/README.md)：接口文档总览。
6. [docs/project-summary.md](./docs/project-summary.md)：项目总结，可用于报告和 PPT。
7. [docs/defense-guide.md](./docs/defense-guide.md)：答辩/PPT/讲解视频准备材料。

根目录的 `需求规格说明书.md` 和 `实现设计说明书.md` 是早期历史资料，不再作为当前版本的主要依据，也不再继续维护。后续以当前代码、接口文档、`AGENTS.md` 和 `docs/final-*.md` 为准。

## 快速启动

首次配置数据库请先阅读 [docs/mysql-setup.md](./docs/mysql-setup.md)。

后端：

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
.\.venv\Scripts\python.exe scripts\init_mysql_db.py
python -m uvicorn main:app --reload
```

用户端：

```powershell
cd user-frontend
npm install
npm run dev
```

管理端：

```powershell
cd admin-frontend
npm install
npm run dev
```

创建平台管理员：

```powershell
cd backend
.\.venv\Scripts\python.exe scripts\create_admin.py
```

清理测试数据：

```powershell
cd backend
.\.venv\Scripts\python.exe scripts\clear_test_data.py --yes
```

## 后续维护建议

后续基本不再做大规模功能开发，三人协作可按以下方向分工：

| 成员 | 建议主责 |
|---|---|
| 成员 A | 后端稳定性、接口文档、数据库与验收数据 |
| 成员 B | 用户端交互、商城流程、社区与订单体验 |
| 成员 C | 管理端、报表、答辩材料、演示脚本 |

后续改动仍应遵守：后端接口、前端页面、接口文档和验收说明同步更新。前端交互优化也要确认不会破坏已有接口调用和业务流程。

## Git 约定

- 不要直接推送到 GitHub，除非项目负责人明确要求。
- 修改前先查看 `git status`，避免误覆盖他人改动。
- 建议小步提交，提交信息写清业务范围。
