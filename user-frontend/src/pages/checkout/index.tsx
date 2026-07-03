import { QRCode } from 'antd'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { getApiErrorMessage } from '../../services/http'
import { orderService, type CheckoutResult } from '../../services/order'

function yuan(valueCent: number) {
  return (valueCent / 100).toFixed(2)
}

export function CheckoutPage() {
  const navigate = useNavigate()
  const [checkout, setCheckout] = useState<CheckoutResult | null>(null)
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null)
  const [couponId, setCouponId] = useState('')
  const [pointsUsed, setPointsUsed] = useState(0)
  const [message, setMessage] = useState('')
  const [createdInfo, setCreatedInfo] = useState('')
  const [alipayQrCode, setAlipayQrCode] = useState('')

  async function loadCheckout() {
    const response = await orderService.checkout({
      coupon_id: couponId ? Number(couponId) : null,
      points_used: pointsUsed,
    })
    setCheckout(response.data)
    setSelectedAddressId(response.data.addresses.find((address) => address.is_default)?.id ?? null)
  }

  useEffect(() => {
    loadCheckout().catch(() => setCheckout(null))
  }, [])

  async function handleSubmit() {
    setMessage('')
    setCreatedInfo('')
    setAlipayQrCode('')
    try {
      const orderResponse = await orderService.createOrder({
        client_order_token: crypto.randomUUID(),
        shipping_address_id: selectedAddressId,
        coupon_id: couponId ? Number(couponId) : null,
        points_used: pointsUsed,
      })
      const alipayResponse = await orderService.precreateAlipay(orderResponse.data.payment_id)
      setAlipayQrCode(alipayResponse.data.qr_code)
      setCreatedInfo(`支付单 ID：${orderResponse.data.payment_id}，订单 ID：${orderResponse.data.order_ids.join(',')}`)
      setMessage('订单已提交，请使用支付宝沙箱买家账号扫码支付。支付后可进入订单页同步支付结果。')
    } catch (error) {
      setMessage(`提交订单失败：${getApiErrorMessage(error)}`)
    }
  }

  return (
    <main>
      <h1>结算</h1>
      {checkout ? (
        <>
          <p>应付：￥{yuan(checkout.pay_amount_cent)}</p>
          <p>
            商品总额：￥{yuan(checkout.total_amount_cent)}；满减：￥{yuan(checkout.full_discount_amount_cent)}；优惠券：￥
            {yuan(checkout.coupon_discount_amount_cent)}；积分抵扣：￥{yuan(checkout.points_discount_amount_cent)}
          </p>
          <section>
            <h2>收货地址</h2>
            {checkout.addresses.length > 0 ? (
              checkout.addresses.map((address) => (
                <label key={address.id}>
                  <input
                    type="radio"
                    name="shipping_address"
                    checked={selectedAddressId === address.id}
                    onChange={() => setSelectedAddressId(address.id)}
                  />
                  {address.receiver_name} {address.receiver_mobile} - {address.province}
                  {address.city}
                  {address.district ?? ''}
                  {address.street ?? ''}
                  {address.detail_address}
                </label>
              ))
            ) : (
              <p>暂无地址，可先到用户首页新增地址。当前阶段仍允许无地址下单。</p>
            )}
          </section>
          <label>
            用户券 ID
            <input value={couponId} onChange={(event) => setCouponId(event.target.value)} placeholder="可留空" />
          </label>
          <label>
            使用积分
            <input
              type="number"
              min={0}
              value={pointsUsed}
              onChange={(event) => setPointsUsed(Number(event.target.value) || 0)}
              placeholder={`最多 ${checkout.max_points_usable}`}
            />
          </label>
          <button type="button" onClick={() => loadCheckout().catch(() => setMessage('重新计算失败'))}>
            重新计算
          </button>
          <ul>
            {checkout.items.map((item) => (
              <li key={item.sku_id}>
                {item.product_name} / {item.sku_name} x {item.quantity}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p>暂无可结算商品。</p>
      )}
      <button type="button" disabled={!checkout || checkout.items.length === 0} onClick={handleSubmit}>
        提交订单并生成支付宝二维码
      </button>
      <button type="button" onClick={() => navigate('/orders')}>
        查看订单
      </button>
      {createdInfo && <p>{createdInfo}</p>}
      {alipayQrCode && (
        <div>
          <QRCode value={alipayQrCode} size={180} />
          <p>
            请使用支付宝沙箱买家账号扫码付款。二维码内容不是网页支付链接，直接在浏览器打开不会进入该订单支付。
          </p>
          <p>
            调试用订单码内容：<span>{alipayQrCode}</span>
          </p>
        </div>
      )}
      {message && <p>{message}</p>}
    </main>
  )
}
