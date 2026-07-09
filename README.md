# It's Mygo

一次买够（It's Mygo）是一个学生实训项目，定位为社交新零售电商平台。当前除 AI 助手外，用户端、平台端、商家端的主要业务功能已经前后端完整接通，可作为最终协作交付基线继续验收和微调。

## 技术栈

- 后端：FastAPI + SQLAlchemy async + Celery，当前本地默认可使用 SQLite 快速联调，后续可切换 MySQL。
- 用户端：React + TypeScript + Vite + Ant Design 5。
- 管理端：React + TypeScript + Vite + Ant Design 5。
- Python：3.12.10。
- 支付：仅接入支付宝沙箱扫码支付，不接入微信支付。

## 主要目录

- `backend/`：后端 FastAPI 工程，含模型、schema、router、service、任务和测试。
- `user-frontend/`：用户端 Web 工程。
- `admin-frontend/`：管理端 Web 工程，区分平台运营、商家运营、商家入驻。
- `docs/`：项目文档、接口文档、移交说明和开发路线图。
- `scripts/`：项目级开发辅助脚本。
- `backend/tests/`：后端自动化测试。
- `tests/`：跨端或验收测试说明。

## 当前功能状态

当前版本可作为“完整电商平台实现 + AI 助手扩展前基线”：

- 普通用户、平台运营、商家运营账号体系分离。
- 商家自助注册入驻，平台审核通过后获得商家权限和店铺。
- 平台负责分类、商家入驻审核、商品监管、内容治理和运营管理，不手动创建店铺或商品。
- 商家可维护店铺资料、商品、SKU、图片、库存、发货、本店优惠券、满减和拼团活动。
- 用户可注册登录、编辑资料和头像、管理地址、浏览商品和店铺、收藏商品、关注店铺、加购、结算、支付宝沙箱支付、确认收货、评价、申请售后。
- 已实现优惠券、满减、积分抵扣、积分流水、会员基础配置、社区发帖评论点赞、话题、用户主页、种草来源下单和积分奖励。
- 已实现拼团基础链路：商家配置 2 人或 3 人团，用户开团或参团，支付后成团进入商家发货流程。
- 用户端、平台端、商家端均已拆分为正式路由页面，页面可直接完成日常测试和验收，不再依赖旧联调工作台。
- 后台报表、客服/WebSocket、平台后台、商家后台均已接入；AI 助手尚未实现。

## 后续重点

接手同学优先阅读 [docs/handoff.md](./docs/handoff.md)。后续工作重点是：

1. 实现 AI 助手：建议先做平台购物助手和客服建议回复，不让 AI 直接修改订单、库存、退款、积分等关键状态。
2. 持续验收现有完整链路：商品、订单、支付、售后、促销、积分、会员、社区、拼团、报表、客服。
3. 根据实训展示需要做页面视觉、交互细节、异常提示、报表指标和测试覆盖的微调。

后续不再按“只做最小闭环”推进。每个模块继续开发时，应一次性考虑完整需求、权限边界、异常状态、前端调用、文档和测试。

## 三人协作建议

建议三人固定主责，但每个功能按纵向闭环交付，避免只写后端或只写页面造成长期脱节。

| 成员 | 主责 | 必须同步关注 |
|---|---|---|
| 成员 A | 后端模型、service、接口、测试 | 接口文档、状态机、权限边界 |
| 成员 B | 用户端页面、购物流程、社区体验 | 用户端接口联调、异常提示、数据展示 |
| 成员 C | 管理端页面、运营流程、数据看板 | 平台/商家权限联调、验收流程、项目文档 |

每个功能建议按以下顺序推进：

1. 先阅读 `docs/handoff.md`、`docs/dev-setup.md`、`docs/api/*.md` 和 `AGENTS.md`，确认当前实现边界。
2. 更新或新增 `docs/api/*.md` 接口契约。
3. 实现后端模型、schema、service、router 和测试。
4. 同步实现用户端或管理端的调用入口和页面展示。
5. 联调并更新 `docs/dev-setup.md`、`docs/development-roadmap.md` 或相关说明。

重要约定：后端扩展新功能时，前端必须同轮添加可使用的调用入口。除非负责人明确要求只做后端，否则不能把前端留成“以后再接”。

## 启动与联调

详见 [docs/dev-setup.md](./docs/dev-setup.md)。

后端：

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload
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

## 文档关系

- [docs/handoff.md](./docs/handoff.md)：移交说明，后续接手优先阅读。
- [docs/api](./docs/api)：接口字段、权限、状态和错误码约定。
- [docs/development-roadmap.md](./docs/development-roadmap.md)：后续迭代路线图。
- `AGENTS.md`：AI 协作和当前项目状态恢复文档。
- `需求规格说明书.md`、`实现设计说明书.md`：早期历史资料，本阶段不再作为主要编码依据，后续以当前代码、接口文档和移交文档为准。

如早期需求/设计文档与当前代码、接口文档冲突，以当前实现和接口文档为准；必要时在移交文档或接口文档中补充说明。

## Git 协作

- 不要直接推送到 GitHub，除非项目负责人明确要求。
- 三人开发时建议各自从 `main` 拉功能分支。
- 分支命名建议：`feature/user-profile`、`feature/admin-reports`、`feature/customer-service`。
- 小步提交，提交信息说明业务范围，例如 `add merchant report summary`。
- 合并前至少让另一名成员检查接口影响、页面影响和文档是否同步。
