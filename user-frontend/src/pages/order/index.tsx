import { useEffect, useState } from 'react'
import { Badge, Button, Card, Descriptions, Empty, Input, InputNumber, List, QRCode, Rate, Select, Space, Tag, Typography, message } from 'antd'

import { orderService, type Order, type OrderItem, type Payment } from '../../services/order'
import { getApiErrorMessage } from '../../services/http'

const { Paragraph, Text, Title } = Typography

const statusText: Record<string, string> = {
  pending_payment: '待支付',
  pending_shipment: '待发货',
  shipping: '运输中',
  completed: '已完成',
  after_sale: '售后中',
  cancelled: '已取消',
  closed: '已关闭',
  unpaid: '未支付',
  paid: '已支付',
  partial_refunded: '部分退款',
  refunded: '已退款',
}

function yuan(amountCent?: number) {
  return ((amountCent ?? 0) / 100).toFixed(2)
}

function badgeColor(status: string) {
  if (['paid', 'completed', 'refunded'].includes(status)) return 'green'
  if (['pending_payment', 'pending_shipment', 'shipping', 'after_sale', 'unpaid'].includes(status)) return 'orange'
  if (['cancelled', 'closed'].includes(status)) return 'red'
  return 'blue'
}

export function OrderPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [payment, setPayment] = useState<Payment | null>(null)
  const [qrCode, setQrCode] = useState('')
  const [reviewScore, setReviewScore] = useState(5)
  const [reviewContent, setReviewContent] = useState('')
  const [refundItemId, setRefundItemId] = useState<number>()
  const [refundQuantity, setRefundQuantity] = useState(1)
  const [refundReason, setRefundReason] = useState('不想要了')
  const [loading, setLoading] = useState(false)

  async function loadOrders() {
    const response = await orderService.listOrders()
    setOrders(response.data.list)
  }

  useEffect(() => {
    loadOrders().catch(() => setOrders([]))
  }, [])

  async function run(action: string, task: () => Promise<unknown>) {
    setLoading(true)
    try {
      await task()
      message.success(`${action}成功`)
      await loadOrders()
    } catch (error) {
      message.error(`${action}失败：${getApiErrorMessage(error)}`)
    } finally {
      setLoading(false)
    }
  }

  async function showPayment(paymentId: number) {
    const response = await orderService.getPayment(paymentId)
    setPayment(response.data)
    setQrCode(response.data.alipay_qr_code || '')
  }

  async function selectOrder(order: Order) {
    if (payment?.id !== order.payment_id) {
      setQrCode('')
    }
    await showPayment(order.payment_id)
    setRefundItemId(order.items[0]?.id)
  }

  async function createAlipay(paymentId: number) {
    setLoading(true)
    try {
      const response = await orderService.precreateAlipay(paymentId)
      setPayment(response.data.payment)
      setQrCode(response.data.qr_code)
      message.success('支付宝二维码已生成')
    } catch (error) {
      message.error(`支付宝沙箱预创建失败：${getApiErrorMessage(error)}`)
    } finally {
      setLoading(false)
    }
  }

  async function syncAlipay(paymentId: number) {
    setLoading(true)
    try {
      const response = await orderService.syncAlipay(paymentId)
      setPayment(response.data)
      await loadOrders()
      await showPayment(paymentId)
      if (response.data.status === 'paid') {
        message.success('支付结果已同步')
      } else {
        message.info('支付宝尚未查到已支付交易，请确认使用沙箱买家账号扫码付款后再同步')
      }
    } catch (error) {
      message.error(`同步支付宝支付结果失败：${getApiErrorMessage(error)}`)
    } finally {
      setLoading(false)
    }
  }

  async function reviewOrder(order: Order, item: OrderItem) {
    await run('提交评价', () =>
      orderService.reviewOrder(order.id, {
        product_id: item.product_id,
        score: reviewScore,
        content: reviewContent || '商品符合预期。',
      }),
    )
    setReviewContent('')
  }

  async function applyRefund(order: Order) {
    const item = order.items.find((current) => current.id === refundItemId) || order.items[0]
    if (!item) return
    await run('申请售后', () =>
      orderService.applyRefund(order.id, {
        order_item_id: item.id,
        quantity: refundQuantity,
        reason: refundReason,
      }),
    )
  }

  return (
    <main className="page-shell">
      <Space direction="vertical" size={24} style={{ width: '100%' }}>
        <Card>
          <Title level={3}>我的订单</Title>
          <Paragraph type="secondary">查看订单、完成支付、确认收货、评价商品和发起售后。</Paragraph>
        </Card>

        {payment ? (
          <Card title={`支付单 #${payment.id}`}>
            <Descriptions column={4} size="small">
              <Descriptions.Item label="支付单号">{payment.payment_no}</Descriptions.Item>
              <Descriptions.Item label="渠道">{payment.channel}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Badge color={badgeColor(payment.status)} text={statusText[payment.status] || payment.status} />
              </Descriptions.Item>
              <Descriptions.Item label="金额">￥{yuan(payment.pay_amount_cent)}</Descriptions.Item>
              <Descriptions.Item label="支付宝交易号">{payment.alipay_trade_no || '-'}</Descriptions.Item>
              <Descriptions.Item label="关联订单">{payment.order_ids?.map((id) => `#${id}`).join('、') || '-'}</Descriptions.Item>
            </Descriptions>
            {qrCode ? (
              <Space direction="vertical" style={{ marginTop: 16 }}>
                <QRCode value={qrCode} size={180} />
                <Text copyable>{qrCode}</Text>
              </Space>
            ) : null}
          </Card>
        ) : null}

        <List
          loading={loading}
          dataSource={orders}
          locale={{ emptyText: <Empty description="暂无订单" /> }}
          renderItem={(order) => (
            <List.Item>
              <Card style={{ width: '100%' }} onClick={() => void selectOrder(order)}>
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                  <Space wrap>
                    <Tag color="blue">订单 #{order.id}</Tag>
                    <Text strong>{order.order_no}</Text>
                    <Badge color={badgeColor(order.status)} text={statusText[order.status] || order.status} />
                    <Text className="price">￥{yuan(order.pay_amount_cent)}</Text>
                  </Space>
                  <List
                    size="small"
                    dataSource={order.items}
                    renderItem={(item) => (
                      <List.Item>
                        <Space wrap>
                          <Tag>明细 #{item.id}</Tag>
                          <Text>{item.product_name}</Text>
                          <Text type="secondary">{item.sku_name}</Text>
                          <Text>x{item.quantity}</Text>
                          <Text>￥{yuan(item.total_amount_cent)}</Text>
                        </Space>
                      </List.Item>
                    )}
                  />
                  <Space wrap>
                    <Button onClick={() => showPayment(order.payment_id)}>查看支付单</Button>
                    <Button type="primary" disabled={order.status !== 'pending_payment'} onClick={() => createAlipay(order.payment_id)}>
                      支付宝扫码支付
                    </Button>
                    <Button disabled={order.status !== 'pending_payment'} onClick={() => syncAlipay(order.payment_id)}>
                      同步支付宝结果
                    </Button>
                    <Button disabled={!['shipping', 'pending_receipt'].includes(order.status)} onClick={() => run('确认收货', () => orderService.confirmOrder(order.id))}>
                      确认收货
                    </Button>
                    <Button danger disabled={order.status !== 'pending_payment'} onClick={() => run('取消订单', () => orderService.cancelOrder(order.id))}>
                      取消订单
                    </Button>
                  </Space>
                  {order.status === 'completed' ? (
                    <Card size="small" title="评价商品">
                      <Space wrap>
                        <Rate value={reviewScore} onChange={setReviewScore} />
                        <Input style={{ width: 360 }} value={reviewContent} onChange={(event) => setReviewContent(event.target.value)} placeholder="评价内容" />
                        {order.items.map((item) => (
                          <Button key={item.id} onClick={() => reviewOrder(order, item)}>
                            评价 {item.product_name}
                          </Button>
                        ))}
                      </Space>
                    </Card>
                  ) : null}
                  {['shipping', 'pending_receipt', 'completed'].includes(order.status) ? (
                    <Card size="small" title="申请售后">
                      <Space wrap>
                        <Select
                          style={{ width: 320 }}
                          value={refundItemId || order.items[0]?.id}
                          onChange={setRefundItemId}
                          options={order.items.map((item) => ({ value: item.id, label: `#${item.id} ${item.product_name} x${item.quantity}` }))}
                        />
                        <InputNumber min={1} max={order.items.find((item) => item.id === refundItemId)?.quantity || order.items[0]?.quantity || 1} value={refundQuantity} onChange={(value) => setRefundQuantity(Number(value) || 1)} />
                        <Input style={{ width: 280 }} value={refundReason} onChange={(event) => setRefundReason(event.target.value)} />
                        <Button onClick={() => applyRefund(order)}>提交售后</Button>
                      </Space>
                    </Card>
                  ) : null}
                </Space>
              </Card>
            </List.Item>
          )}
        />
      </Space>
    </main>
  )
}
