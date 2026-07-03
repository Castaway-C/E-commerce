import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Card,
  Descriptions,
  Empty,
  InputNumber,
  List,
  QRCode,
  Radio,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd'

import { orderService, type CheckoutResult } from '../../services/order'
import { pickErrorMessage, randomToken, yuan } from '../../utils/format'

const { Text, Title, Paragraph } = Typography

export function CheckoutPage() {
  const navigate = useNavigate()
  const [checkout, setCheckout] = useState<CheckoutResult | null>(null)
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null)
  const [selectedFullDiscountId, setSelectedFullDiscountId] = useState<number | undefined>()
  const [selectedUserCouponId, setSelectedUserCouponId] = useState<number | undefined>()
  const [pointsToUse, setPointsToUse] = useState(0)
  const [alipayQrCode, setAlipayQrCode] = useState('')
  const [createdInfo, setCreatedInfo] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function loadCheckout() {
    setMessage('')
    setLoading(true)
    try {
      const response = await orderService.checkout({
        full_discount_id: selectedFullDiscountId ?? null,
        coupon_id: selectedUserCouponId ?? null,
        points_used: pointsToUse,
      })
      setCheckout(response.data)
      setSelectedFullDiscountId(response.data.selected_full_discount_id ?? undefined)
      setSelectedUserCouponId(response.data.selected_coupon_id ?? undefined)
      if (selectedAddressId === null) {
        const defaultAddress = response.data.addresses.find((address) => address.is_default)
        setSelectedAddressId(defaultAddress?.id ?? response.data.addresses[0]?.id ?? null)
      }
    } catch (error) {
      setMessage(`结算预览失败：${pickErrorMessage(error) ?? '请求失败'}`)
      setCheckout(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadCheckout()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSubmit() {
    if (!checkout || checkout.items.length === 0) {
      setMessage('暂无可结算商品，请先在购物车勾选有效商品')
      return
    }
    setMessage('')
    setCreatedInfo('')
    setAlipayQrCode('')
    setLoading(true)
    try {
      const orderResponse = await orderService.createOrder({
        client_order_token: randomToken('order'),
        shipping_address_id: selectedAddressId,
        full_discount_id: selectedFullDiscountId ?? null,
        coupon_id: selectedUserCouponId ?? null,
        points_used: pointsToUse,
      })
      const paymentId = orderResponse.data.payment_id
      const orderIds = orderResponse.data.order_ids
      setCreatedInfo(`支付单 ID：${paymentId}；订单 ID：${orderIds.join(', ')}`)
      try {
        const alipayResponse = await orderService.precreateAlipay(paymentId)
        setAlipayQrCode(alipayResponse.data.qr_code)
        setMessage('订单已提交，请使用支付宝沙箱买家账号扫码支付。')
      } catch (error) {
        setMessage(`支付宝二维码生成失败：${pickErrorMessage(error) ?? '请求失败'}`)
      }
      setPointsToUse(0)
      setSelectedUserCouponId(undefined)
      await loadCheckout()
    } catch (error) {
      setMessage(`提交订单失败：${pickErrorMessage(error) ?? '请求失败'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="page-shell">
      <Spin spinning={loading && !checkout}>
        <Space direction="vertical" size={24} style={{ width: '100%' }}>
          <Card>
            <Title level={3}>结算</Title>
            <Paragraph type="secondary">
              选择收货地址、满减、优惠券和积分抵扣后点击“重新计算”刷新应付金额，确认后提交订单并生成支付宝沙箱二维码。
            </Paragraph>
          </Card>

          {checkout ? (
            <>
              <Card title="结算预览" className="checkout-panel">
                <Descriptions size="small" bordered column={1}>
                  <Descriptions.Item label="商品总额">
                    ￥{yuan(checkout.total_amount_cent)}
                  </Descriptions.Item>
                  <Descriptions.Item label="满减抵扣">
                    ￥{yuan(checkout.full_discount_amount_cent)}
                  </Descriptions.Item>
                  <Descriptions.Item label="优惠券抵扣">
                    ￥{yuan(checkout.coupon_discount_amount_cent)}
                  </Descriptions.Item>
                  <Descriptions.Item label="积分抵扣">
                    {checkout.points_used} 分 / ￥{yuan(checkout.points_discount_amount_cent)}
                  </Descriptions.Item>
                  <Descriptions.Item label="总抵扣">
                    ￥{yuan(checkout.discount_amount_cent)}
                  </Descriptions.Item>
                  <Descriptions.Item label="支付宝应付">
                    <Text className="price">￥{yuan(checkout.pay_amount_cent)}</Text>
                  </Descriptions.Item>
                </Descriptions>
              </Card>

              <Card title="收货地址">
                {checkout.addresses.length > 0 ? (
                  <Radio.Group
                    value={selectedAddressId ?? undefined}
                    onChange={(event) => setSelectedAddressId(event.target.value as number)}
                    style={{ width: '100%' }}
                  >
                    <Space direction="vertical" style={{ width: '100%' }}>
                      {checkout.addresses.map((address) => (
                        <Radio key={address.id} value={address.id} style={{ width: '100%' }}>
                          <Space wrap size={4}>
                            <Tag color="blue">地址 #{address.id}</Tag>
                            {address.is_default ? <Tag color="green">默认</Tag> : null}
                            {address.address_tag ? <Tag>{address.address_tag}</Tag> : null}
                            <Text strong>{address.receiver_name}</Text>
                            <Text>{address.receiver_mobile}</Text>
                            <Text type="secondary">
                              {address.province}
                              {address.city}
                              {address.district ?? ''}
                              {address.street ?? ''}
                              {address.detail_address}
                            </Text>
                          </Space>
                        </Radio>
                      ))}
                    </Space>
                  </Radio.Group>
                ) : (
                  <Text type="secondary">暂无收货地址，可先到用户首页新增地址。当前阶段仍允许无地址下单。</Text>
                )}
              </Card>

              <Card title="优惠与积分">
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                  <div>
                    <Text strong>满减活动</Text>
                    <Select
                      allowClear
                      placeholder="选择本单满减活动"
                      style={{ width: '100%', marginTop: 8 }}
                      value={selectedFullDiscountId}
                      onChange={(value: number | undefined) => setSelectedFullDiscountId(value)}
                      options={[
                        { value: undefined, label: '不使用满减' },
                        ...checkout.available_full_discounts.map((activity) => ({
                          value: activity.id,
                          disabled: !activity.available,
                          label: `#${activity.id} ${activity.name}｜适用 ￥${yuan(activity.applicable_amount_cent)}｜减 ￥${yuan(activity.discount_amount_cent)}${activity.available ? '' : `｜${activity.unavailable_reason ?? '不可用'}`}`,
                        })),
                      ]}
                    />
                  </div>

                  <div>
                    <Text strong>优惠券</Text>
                    <Select
                      allowClear
                      placeholder="选择本单优惠券"
                      style={{ width: '100%', marginTop: 8 }}
                      value={selectedUserCouponId}
                      onChange={(value: number | undefined) => setSelectedUserCouponId(value)}
                      options={[
                        { value: undefined, label: '不使用优惠券' },
                        ...checkout.available_coupons.map((coupon) => ({
                          value: coupon.id,
                          disabled: !coupon.available,
                          label: `#${coupon.id} ${coupon.name}｜适用 ￥${yuan(coupon.applicable_amount_cent)}｜减 ￥${yuan(coupon.discount_amount_cent)}${coupon.available ? '' : `｜${coupon.unavailable_reason ?? '不可用'}`}`,
                        })),
                      ]}
                    />
                  </div>

                  <div>
                    <Text strong>积分抵扣</Text>
                    <InputNumber
                      style={{ width: '100%', marginTop: 8 }}
                      min={0}
                      max={checkout.max_points_usable}
                      precision={0}
                      value={pointsToUse}
                      addonAfter={`最多 ${checkout.max_points_usable}`}
                      onChange={(value) => setPointsToUse(Number(value) || 0)}
                    />
                  </div>

                  <Space wrap>
                    <Button onClick={() => void loadCheckout()} loading={loading}>
                      重新计算
                    </Button>
                    <Button
                      type="primary"
                      size="large"
                      disabled={checkout.items.length === 0}
                      loading={loading}
                      onClick={() => void handleSubmit()}
                    >
                      提交订单并生成支付宝二维码
                    </Button>
                    <Button onClick={() => navigate('/orders')}>查看订单</Button>
                  </Space>
                </Space>
              </Card>

              <Card title="商品明细">
                <List
                  size="small"
                  dataSource={checkout.items}
                  locale={{ emptyText: <Empty description="暂无可结算商品" /> }}
                  renderItem={(item) => (
                    <List.Item>
                      <Space wrap>
                        <Tag>SKU #{item.sku_id}</Tag>
                        <Text strong>{item.product_name}</Text>
                        <Text type="secondary">{item.sku_name}</Text>
                        <Text>x{item.quantity}</Text>
                        {item.source_label || item.source_post_id ? (
                          <Tag color="purple">
                            {item.source_label ?? `种草来源 #${item.source_post_id}`}
                          </Tag>
                        ) : null}
                      </Space>
                      <Text className="price">￥{yuan(item.price_cent * item.quantity)}</Text>
                    </List.Item>
                  )}
                />
              </Card>

              {createdInfo ? (
                <Card title="下单结果">
                  <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    <Text>{createdInfo}</Text>
                    {alipayQrCode ? (
                      <Space direction="vertical" align="center" style={{ width: '100%' }}>
                        <QRCode value={alipayQrCode} size={180} />
                        <Text type="secondary">
                          请使用支付宝沙箱买家账号扫码付款。二维码内容不是网页支付链接，直接在浏览器打开不会进入该订单支付。
                        </Text>
                        <Text copyable type="secondary">
                          调试用订单码内容：{alipayQrCode}
                        </Text>
                      </Space>
                    ) : null}
                  </Space>
                </Card>
              ) : null}
            </>
          ) : (
            <Card>
              <Empty description={message || '暂无可结算商品，请先在购物车勾选有效商品。'} />
            </Card>
          )}

          {message ? (
            <Card size="small">
              <Text>{message}</Text>
            </Card>
          ) : null}
        </Space>
      </Spin>
    </main>
  )
}
