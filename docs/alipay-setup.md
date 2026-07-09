# 支付宝接入配置说明

本项目当前支付链路采用支付宝沙箱扫码支付。

## 本地配置

支付宝支付工具或支付宝开放平台沙箱可提供沙箱凭证。将沙箱配置填入本地 `.env` 文件，密钥类配置不提交至 Git 仓库。

将 `.env.example` 复制为 `.env`，并在本地填写支付宝相关参数：
```env
ALIPAY_ENABLED=true
ALIPAY_GATEWAY_URL=https://openapi-sandbox.dl.alipaydev.com/gateway.do
ALIPAY_APP_ID=
ALIPAY_APP_PRIVATE_KEY=
ALIPAY_PUBLIC_KEY=
ALIPAY_NOTIFY_URL=http://localhost:8000/api/v1/payments/notify/alipay
ALIPAY_SUBJECT_PREFIX=一次买够订单
```
网关使用说明：

- 当前项目采用新版支付宝沙箱网关地址：`https://openapi-sandbox.dl.alipaydev.com/gateway.do`。
- 网关、应用 ID、密钥及买家账号需要来自同一套沙箱环境。环境不一致时，二维码可能正常生成，但买家客户端会提示订单不存在。
- 修改 `.env` 配置后，需要重启后端服务并重新生成二维码。已缓存的 `alipay_qr_code` 二维码数据可能关联旧配置。

安全注意：

- 私钥仅存放于后端服务。
- 沙箱或生产环境密钥只放本地 `.env`。
- 前端代码不保存密钥。
- 日志不输出私钥内容。

## 开发接口说明
- `POST /payments/{id}/alipay/precreate`：配置完整时，生成支付宝付款二维码。
- 若配置缺失，该接口返回错误码`40005`。
- `POST /payments/{id}/alipay/sync`：主动查询支付宝订单状态，若已付款则同步更新本地支付单/订单状态。
- `POST /payments/notify/alipay`：支付宝异步回调通知接口，返回纯文本`success`（成功）或`fail`（失败）。
- `POST /payments/{id}/pay` 是后端历史测试备用接口，当前正常前端支付流程使用支付宝接口。

接口请求与返回详情请查阅文档 `docs/api/alipay-payment.md`。
