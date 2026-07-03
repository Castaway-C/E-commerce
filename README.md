# It's Mygo

一次买够（It's Mygo）是一个学生实训项目，定位为社交新零售电商平台。当前项目已经完成基础电商闭环和联调工作台，准备移交给后续同学继续做前端最终迭代、后台报表数据可视化和客服/WebSocket。

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

当前版本可作为“基础电商平台实现 + 后续协作开发基线”：

- 普通用户、平台运营、商家运营账号体系分离。
- 商家自助注册入驻，平台审核通过后获得商家权限和店铺。
- 平台负责分类、商家入驻审核、商品监管、内容治理和运营管理，不手动创建店铺或商品。
- 商家可维护店铺资料、商品、SKU、图片、库存、发货、本店优惠券、满减和拼团活动。
- 用户可注册登录、编辑资料和头像、管理地址、浏览商品和店铺、收藏商品、关注店铺、加购、结算、支付宝沙箱支付、确认收货、评价、申请售后。
- 已实现优惠券、满减、积分抵扣、积分流水、会员基础配置、社区发帖评论点赞、话题、用户主页、种草来源下单和积分奖励。
- 已实现拼团基础链路：商家配置 2 人或 3 人团，用户开团或参团，支付后成团进入商家发货流程。
- 前端已有 PC 端联调工作台，不是最终 UI，但具备用户端、平台端、商家端主要功能调用入口。

## 移交重点

移交后优先阅读 [docs/handoff.md](./docs/handoff.md)。后续工作重点是：

1. 将当前联调工作台拆分并迭代为正式商城、社区、用户中心、订单售后、平台后台和商家后台页面。
2. 实现后台报表数据可视化，包括平台全局指标和商家本店指标。
3. 实现客服与 WebSocket，包括会话、消息持久化、实时推送和权限隔离。
4. 继续硬化拼团失败退款、限时价、营销标签、积分会员、售后退款联动、SKU 规格模板和社区治理。

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
- `需求规格说明书.md`：项目功能目标和验收依据。
- `实现设计说明书.md`：编码设计依据。
- [docs/api](./docs/api)：接口字段、权限、状态和错误码约定。
- [docs/development-roadmap.md](./docs/development-roadmap.md)：后续迭代路线图。
- `AGENTS.md`：AI 协作和当前项目状态恢复文档。

如需求、设计和代码出现冲突，先记录冲突并同步给负责人，再修改对应文档和实现。

## Git 协作

- 不要直接推送到 GitHub，除非项目负责人明确要求。
- 三人开发时建议各自从 `main` 拉功能分支。
- 分支命名建议：`feature/user-profile`、`feature/admin-reports`、`feature/customer-service`。
- 小步提交，提交信息说明业务范围，例如 `add merchant report summary`。
- 合并前至少让另一名成员检查接口影响、页面影响和文档是否同步。
