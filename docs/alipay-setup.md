# Alipay Setup

The project now integrates Alipay sandbox scan-code payment only. We do not integrate WeChat Pay.

## Local Configuration

The Alipay payment Skill or Alipay Open Platform sandbox can provide sandbox credentials. Paste the real sandbox values into local `.env`; never commit them to Git.

Copy `.env.example` to `.env`, then fill the Alipay values locally:

```env
ALIPAY_ENABLED=true
ALIPAY_GATEWAY_URL=https://openapi-sandbox.dl.alipaydev.com/gateway.do
ALIPAY_APP_ID=
ALIPAY_APP_PRIVATE_KEY=
ALIPAY_PUBLIC_KEY=
ALIPAY_NOTIFY_URL=http://localhost:8000/api/v1/payments/notify/alipay
ALIPAY_SUBJECT_PREFIX=一次买够订单
```

Gateway rule:
- The current project uses the newer Alipay sandbox gateway: `https://openapi-sandbox.dl.alipaydev.com/gateway.do`.
- Do not mix gateway, app ID, keys, and buyer account from different sandbox environments. A QR code can be created successfully but the buyer app may show that the order does not exist.
- After changing `.env`, restart the backend and generate a fresh QR code. Existing cached `alipay_qr_code` values may belong to the previous gateway.

Security:
- Keep private keys on the backend only.
- Do not commit sandbox or production keys.
- Do not paste keys into frontend code.
- Do not log private keys.

## Development Behavior

- `POST /payments/{id}/alipay/precreate` creates an Alipay QR code when config is complete.
- If config is missing, the endpoint returns `40005`.
- `POST /payments/{id}/alipay/sync` queries Alipay and updates local payment/order status if paid.
- `POST /payments/notify/alipay` is the async notify endpoint and returns plain text `success` or `fail`.
- `POST /payments/{id}/pay` remains only as a backend test/history fallback. Do not expose it in normal frontend business flows during full development.

See `docs/api/alipay-payment.md` for request and response details.
