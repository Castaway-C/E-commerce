# 支付宝接入配置说明
本项目仅集成支付宝沙箱扫码支付，未接入微信支付。
## 本地配置
支付宝支付工具或支付宝开放平台沙箱可提供沙箱凭证。将真实沙箱配置填入本地`.env`文件，切勿提交至Git仓库。
将`.env.example`复制为`.env`，并在本地填写支付宝相关参数：
```env
ALIPAY_ENABLED=true
ALIPAY_GATEWAY_URL=https://openapi-sandbox.dl.alipaydev.com/gateway.do
ALIPAY_APP_ID=
ALIPAY_APP_PRIVATE_KEY=
ALIPAY_PUBLIC_KEY=
ALIPAY_NOTIFY_URL=http://localhost:8000/api/v1/payments/notify/alipay
ALIPAY_SUBJECT_PREFIX=一次买够订单
```
网关使用规范：
- 当前项目采用新版支付宝沙箱网关地址：`https://openapi-sandbox.dl.alipaydev.com/gateway.do`。
- 禁止混用不同沙箱环境的网关、应用ID、密钥及买家账号。否则二维码虽能正常生成，但买家客户端会提示订单不存在。
- 修改`.env`配置后，需重启后端服务并重新生成二维码。已缓存的`alipay_qr_code`二维码数据可能关联旧网关地址。

安全规范：
- 私钥仅存放于后端服务。
- 禁止将沙箱或生产环境密钥提交至代码仓库。
- 禁止将密钥写入前端代码。
- 禁止打印私钥日志。

## 开发接口说明
- `POST /payments/{id}/alipay/precreate`：配置完整时，生成支付宝付款二维码。
- 若配置缺失，该接口返回错误码`40005`。
- `POST /payments/{id}/alipay/sync`：主动查询支付宝订单状态，若已付款则同步更新本地支付单/订单状态。
- `POST /payments/notify/alipay`：支付宝异步回调通知接口，返回纯文本`success`（成功）或`fail`（失败）。
- `POST /payments/{id}/pay`仅作为后端历史测试备用接口，完整开发阶段请勿在常规前端业务流程中开放该接口。

接口请求与返回详情请查阅文档 `docs/api/alipay-payment.md`。