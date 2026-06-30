# It's Mygo

一次买够（It's Mygo）是一个学生实训项目，定位为社交新零售电商平台。当前代码已经具备电商平台基本功能闭环，后续开发重点从“搭基础能力”转为“按模块完整实现需求、同步补齐前端页面、文档和测试”。

## 技术栈

- 后端：FastAPI + SQLAlchemy async + Alembic + Redis + Celery
- 用户端：React + TypeScript + Vite + Ant Design 5
- 管理端：React + TypeScript + Vite + Ant Design 5
- Python：3.12.10

## 主要目录

- `backend/`：后端 FastAPI 工程，含模型、schema、router、service、任务和测试
- `user-frontend/`：用户端 Web 工程
- `admin-frontend/`：管理端 Web 工程，区分平台运营、商家运营、商家入驻
- `docs/`：项目文档、接口文档、开发路线图
- `scripts/`：项目级开发辅助脚本
- `backend/tests/`：后端自动化测试
- `tests/`：跨端或验收测试说明

## 当前功能状态

当前版本可视为“基础电商平台已实现”：

- 普通用户、平台运营、商家运营账号体系分离。
- 商家自助注册入驻，平台审核通过后获得商家权限和店铺。
- 平台不能手动创建店铺或商品；平台负责分类、商家入驻审核、商品监管、内容治理和运营管理。
- 商家可创建商品、SKU、图片、库存、发货和本店优惠券。
- 用户可注册登录、浏览商品、管理地址、加购、结算、下单、模拟支付、确认收货、评价、申请售后。
- 已有优惠券、积分流水、社区发帖评论点赞、种草来源下单和确认收货后积分奖励。
- 前端已有 PC 端可用页面，不是最终视觉稿，但应保持日常商城和后台页面的基本可用性。

后续不再按“只做最小闭环”推进。每个模块继续开发时，应一次性考虑完整需求、权限边界、异常状态、前端调用、文档和测试。

## 三人协作建议

建议三人固定主责，但每个功能按纵向闭环交付，避免只写后端或只写页面造成长期脱节。

| 成员 | 主责 | 必须同步关注 |
|---|---|---|
| 成员 A | 后端模型、service、接口、测试 | 接口文档、状态机、权限边界 |
| 成员 B | 用户端页面、购物流程、社区体验 | 用户端接口联调、异常提示、数据展示 |
| 成员 C | 管理端页面、运营流程、数据看板 | 平台/商家权限联调、验收流程、项目文档 |

每个功能建议按以下顺序推进：

1. 对照 `需求规格说明书.md` 和 `实现设计说明书.md` 明确完整范围。
2. 更新或新增 `docs/api/*.md` 接口契约。
3. 实现后端模型、schema、service、router 和测试。
4. 同步实现用户端或管理端的调用入口和基础页面。
5. 联调并更新 `docs/dev-setup.md`、`docs/development-roadmap.md` 或相关说明。

重要约定：后端扩展新功能时，前端必须同轮添加可使用的调用入口。除非用户明确要求只做后端，否则不能把前端留成“以后再接”。

## 后续开发路线

后续全量开发任务集中维护在 [docs/development-roadmap.md](./docs/development-roadmap.md)。其中包含：

- 用户、商家、平台三端后续完整能力。
- 商品、订单、售后、促销、社区、会员积分、报表、WebSocket 等模块任务。
- 每个模块的后端、前端、文档、测试交付标准。

## 启动与联调

详见 [docs/dev-setup.md](./docs/dev-setup.md)。

常用命令：

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload
```

```powershell
cd user-frontend
npm install
npm run dev
```

```powershell
cd admin-frontend
npm install
npm run dev
```

## 分支与提交建议

- 不要直接推送到 GitHub，除非项目负责人明确要求。
- 三人开发时建议各自从 `main` 拉功能分支。
- 分支命名建议：`feature/user-profile`、`feature/promotion-full-reduction`、`feature/admin-reports`。
- 小步提交，提交信息说明业务范围，例如 `add user profile page`。
- 合并前至少让另一名成员检查接口影响、页面影响和文档是否同步。

## 文档关系

- `需求规格说明书.md`：项目功能目标和验收依据。
- `实现设计说明书.md`：编码设计依据。
- `docs/api/*.md`：接口字段、权限、状态和错误码约定。
- `AGENTS.md`：AI 协作和当前项目状态恢复文档。

如需求、设计和代码出现冲突，先记录冲突并同步给负责人，再修改对应文档和实现。
