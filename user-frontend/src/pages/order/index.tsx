import { useEffect, useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  Descriptions,
  Empty,
  Input,
  InputNumber,
  List,
  Modal,
  QRCode,
  Rate,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd'
import type { UploadFile } from 'antd'
import { orderService, type Order, type Payment, type Refund } from '../../services/order'
import { uploadService } from '../../services/upload'
import { getApiErrorMessage } from '../../services/http'
import { yuan, statusText, statusColor, randomToken, pickErrorMessage } from '../../utils/format'

const { Paragraph, Text, Title } = Typography

const ORDER_STATUS_OPTIONS = [
  { value: 'pending_payment', label: '待支付' },
  { value: 'group_pending', label: '待成团' },
  { value: 'pending_shipment', label: '待发货' },
  { value: 'shipping', label: '待收货' },
  { value: 'pending_receipt', label: '待收货' },
  { value: 'completed', label: '已完成' },
  { value: 'after_sale', label: '售后中' },
  { value: 'cancelled', label: '已取消' },
  { value: 'closed', label: '已关闭' },
]

const REFUND_STATUS_OPTIONS = [
  { value: 'pending_approval', label: '售后待审核' },
  { value: 'approved', label: '售后已同意' },
  { value: 'received', label: '已收到退货' },
  { value: 'refunded', label: '已退款' },
  { value: 'rejected', label: '售后已拒绝' },
]

const REFUNDABLE_ORDER_STATUS = ['shipping', 'pending_receipt', 'completed']

function imageListToFileList(urls: string[]): UploadFile[] {
  return urls.map((url, index) => ({
    uid: `img-${index}`,
    name: url.split('/').pop() || `图片 ${index + 1}`,
    url,
    status: 'done',
  }))
}

export function OrderPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrderId, setSelectedOrderId] = useState<number | undefined>()
  const [orderStatusFilter, setOrderStatusFilter] = useState<string | undefined>()
  const [orderPage, setOrderPage] = useState(1)
  const [orderPageSize, setOrderPageSize] = useState(6)
  const [orderTotal, setOrderTotal] = useState(0)
  const [paymentId, setPaymentId] = useState<number | undefined>()
  const [paymentDetail, setPaymentDetail] = useState<Payment | null>(null)
  const [alipayQrCode, setAlipayQrCode] = useState('')
  const [alipayLoading, setAlipayLoading] = useState(false)
  const [refunds, setRefunds] = useState<Refund[]>([])
  const [refundStatusFilter, setRefundStatusFilter] = useState<string | undefined>()
  const [selectedRefundDetail, setSelectedRefundDetail] = useState<Refund | null>(null)
  const [reviewScore, setReviewScore] = useState(5)
  const [reviewContent, setReviewContent] = useState('')
  const [reviewImages, setReviewImages] = useState<string[]>([])
  const [refundQuantity, setRefundQuantity] = useState(1)
  const [refundImages, setRefundImages] = useState<string[]>([])
  const [refundReason, setRefundReason] = useState('')
  const [selectedReviewOrderItemId, setSelectedReviewOrderItemId] = useState<number | undefined>()
  const [selectedRefundOrderItemId, setSelectedRefundOrderItemId] = useState<number | undefined>()
  const [loading, setLoading] = useState(false)

  const selectedOrder = useMemo(() => orders.find((order) => order.id === selectedOrderId) ?? null, [orders, selectedOrderId])
  const selectedReviewOrderItem = useMemo(
    () => selectedOrder?.items.find((item) => item.id === selectedReviewOrderItemId) ?? selectedOrder?.items[0],
    [selectedOrder, selectedReviewOrderItemId],
  )
  const selectedRefundOrderItem = useMemo(
    () => selectedOrder?.items.find((item) => item.id === selectedRefundOrderItemId) ?? selectedOrder?.items[0],
    [selectedOrder, selectedRefundOrderItemId],
  )

  async function run<T>(title: string, action: () => Promise<{ data: T }>): Promise<T | null> {
    try {
      const response = await action()
      return response.data
    } catch (error) {
      message.error(`${title}失败：${getApiErrorMessage(error)}`)
      return null
    }
  }

  async function loadOrders(nextPage = orderPage, nextPageSize = orderPageSize) {
    setLoading(true)
    try {
      const data = await run('我的订单', () =>
        orderService.listOrders({ status: orderStatusFilter, page: nextPage, page_size: nextPageSize }),
      )
      if (data) {
        const list = data.list ?? []
        setOrderPage(data.page ?? nextPage)
        setOrderPageSize(data.page_size ?? nextPageSize)
        setOrderTotal(data.total ?? list.length)
        setOrders(list)
        const currentOrder = selectedOrderId ? list.find((order) => order.id === selectedOrderId) : undefined
        if (!currentOrder && list[0]) {
          await selectOrderForPayment(list[0])
        }
      }
    } finally {
      setLoading(false)
    }
  }

  async function loadPaymentDetail(nextPaymentId = paymentId) {
    if (!nextPaymentId) return
    const data = await run<Payment>('支付单详情', () => orderService.getPayment(nextPaymentId))
    if (data) {
      setPaymentDetail(data)
      setAlipayQrCode(data.alipay_qr_code || '')
    }
  }

  async function selectOrderForPayment(order: Order) {
    setSelectedOrderId(order.id)
    setPaymentId(order.payment_id)
    setSelectedReviewOrderItemId(order.items[0]?.id)
    setSelectedRefundOrderItemId(order.items[0]?.id)
    setRefundQuantity(1)
    setAlipayQrCode('')
    await loadPaymentDetail(order.payment_id)
  }

  async function createAlipayQrCode(force = false) {
    if (!paymentId || alipayLoading) return
    setAlipayLoading(true)
    try {
      const data = await run('支付宝扫码支付', () => orderService.precreateAlipay(paymentId, force))
      if (data) {
        setAlipayQrCode(data.qr_code)
        setPaymentDetail(data.payment)
        message.success(force ? '支付宝二维码已刷新' : '支付宝二维码已生成')
      }
    } finally {
      setAlipayLoading(false)
    }
  }

  async function syncAlipayPayment() {
    if (!paymentId) return
    setLoading(true)
    try {
      const data = await run<Payment>('同步支付宝支付结果', () => orderService.syncAlipay(paymentId))
      if (data) {
        setPaymentDetail(data)
        setAlipayQrCode(data.alipay_qr_code || '')
        if (data.status === 'paid') {
          message.success('支付结果已同步')
        } else {
          message.info('支付宝尚未查到已支付交易，请确认使用沙箱买家账号扫码付款后再同步')
        }
        await loadOrders()
      }
    } finally {
      setLoading(false)
    }
  }

  async function confirmOrder(orderId: number) {
    setLoading(true)
    try {
      const data = await run<Order>('确认收货', () => orderService.confirmOrder(orderId))
      if (data) {
        message.success('确认收货成功')
        await loadOrders()
      }
    } finally {
      setLoading(false)
    }
  }

  async function cancelOrder(orderId: number) {
    setLoading(true)
    try {
      const data = await run<Order>('取消订单', () => orderService.cancelOrder(orderId))
      if (data) {
        message.success('订单已取消')
        await loadOrders()
        if (paymentId) await loadPaymentDetail(paymentId)
      }
    } finally {
      setLoading(false)
    }
  }

  async function reviewSelectedOrder() {
    if (!selectedOrder || !selectedReviewOrderItem) return
    if (!reviewContent.trim()) {
      message.warning('请先填写评价内容')
      return
    }
    setLoading(true)
    try {
      const data = await run('发表评价', () =>
        orderService.reviewOrder(selectedOrder.id, {
          product_id: selectedReviewOrderItem.product_id,
          score: reviewScore,
          content: reviewContent.trim(),
          image_urls: reviewImages,
        }),
      )
      if (data) {
        message.success('评价已发布')
        setReviewContent('')
        setReviewImages([])
      }
    } finally {
      setLoading(false)
    }
  }

  async function refundSelectedOrder() {
    if (!selectedOrder || !selectedRefundOrderItem) return
    if (!refundReason.trim()) {
      message.warning('请填写售后原因')
      return
    }
    setLoading(true)
    try {
      const data = await run<Refund>('申请售后', () =>
        orderService.applyRefund(selectedOrder.id, {
          order_item_id: selectedRefundOrderItem.id,
          quantity: refundQuantity,
          reason_type: 'other',
          reason: refundReason.trim(),
          image_urls: refundImages,
        }),
      )
      if (data) {
        message.success('售后申请已提交')
        setRefundImages([])
        setRefundReason('')
        await loadOrders()
        await loadRefunds()
      }
    } finally {
      setLoading(false)
    }
  }

  async function loadRefunds() {
    const data = await run('我的售后', () => orderService.listRefunds({ status: refundStatusFilter }))
    setRefunds(data?.list ?? [])
  }

  async function openRefundDetail(refundId: number) {
    const data = await run<Refund>('售后详情', () => orderService.getRefund(refundId))
    if (data) setSelectedRefundDetail(data)
  }

  async function uploadReviewImage(file: File) {
    const data = await run<{ url: string }>('上传评价图片', () => uploadService.uploadImage(file))
    if (data?.url) setReviewImages((items) => [...items, data.url])
    return false
  }

  async function uploadRefundImage(file: File) {
    const data = await run<{ url: string }>('上传售后凭证', () => uploadService.uploadImage(file))
    if (data?.url) setRefundImages((items) => [...items, data.url])
    return false
  }

  useEffect(() => {
    setOrderPage(1)
    void loadOrders(1, orderPageSize)
    // 依赖订单状态筛选变化重新加载，首次挂载也会加载一次
  }, [orderStatusFilter])

  useEffect(() => {
    void loadRefunds()
    // 依赖售后状态筛选变化重新加载，首次挂载也会加载一次
  }, [refundStatusFilter])

  const reviewItemValue = selectedReviewOrderItemId ?? selectedReviewOrderItem?.id
  const refundItemValue = selectedRefundOrderItemId ?? selectedRefundOrderItem?.id

  return (
    <main className="page-shell">
      <Space direction="vertical" size={24} style={{ width: '100%' }}>
        <Card>
          <Title level={3}>我的订单</Title>
          <Paragraph type="secondary">查看订单、完成支付、确认收货、评价商品和发起售后。</Paragraph>
        </Card>

        <Card
          title="订单列表"
          extra={
            <Space>
              <Text type="secondary">状态筛选</Text>
              <Select
                allowClear
                style={{ width: 180 }}
                placeholder="全部状态"
                value={orderStatusFilter}
                onChange={(value) => setOrderStatusFilter(value as string | undefined)}
                options={ORDER_STATUS_OPTIONS}
              />
            </Space>
          }
        >
          <List
            loading={loading}
            dataSource={orders}
            locale={{ emptyText: <Empty description="暂无订单" /> }}
            renderItem={(order) => (
              <List.Item>
                <Card
                  style={{
                    width: '100%',
                    borderColor: order.id === selectedOrderId ? '#1677ff' : undefined,
                  }}
                >
                  <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    <Space wrap>
                      <Tag color="blue">订单 #{order.id}</Tag>
                      <Text strong>{order.order_no}</Text>
                      <Badge color={statusColor(order.status)} text={statusText(order.status)} />
                      {order.order_type ? <Tag>{statusText(order.order_type)}</Tag> : null}
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
                    {order.tracking_no ? (
                      <Text type="secondary">
                        物流：{order.logistics_company || '-'} / {order.tracking_no}
                      </Text>
                    ) : null}
                    <Space wrap>
                      <Button
                        type={order.id === selectedOrderId ? 'primary' : 'default'}
                        onClick={() => void selectOrderForPayment(order)}
                      >
                        查看 / 管理
                      </Button>
                      <Button
                        disabled={!['shipping', 'pending_receipt'].includes(order.status)}
                        onClick={() => void confirmOrder(order.id)}
                      >
                        确认收货
                      </Button>
                      <Button
                        danger
                        disabled={order.status !== 'pending_payment'}
                        onClick={() => void cancelOrder(order.id)}
                      >
                        取消订单
                      </Button>
                    </Space>
                  </Space>
                </Card>
              </List.Item>
            )}
            pagination={{
              current: orderPage,
              pageSize: orderPageSize,
              total: orderTotal,
              showSizeChanger: true,
              pageSizeOptions: [5, 8, 12, 20],
              showTotal: (count) => `共 ${count} 个订单`,
              onChange: (nextPage, nextPageSize) => {
                void loadOrders(nextPage, nextPageSize)
              },
            }}
          />
        </Card>

        {paymentDetail ? (
          <Card title={`支付单 #${paymentDetail.id}`}>
            <Descriptions column={4} size="small">
              <Descriptions.Item label="支付单号">{paymentDetail.payment_no}</Descriptions.Item>
              <Descriptions.Item label="渠道">{paymentDetail.channel}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Badge color={statusColor(paymentDetail.status)} text={statusText(paymentDetail.status)} />
              </Descriptions.Item>
              <Descriptions.Item label="金额">￥{yuan(paymentDetail.pay_amount_cent)}</Descriptions.Item>
              <Descriptions.Item label="支付宝交易号">{paymentDetail.alipay_trade_no || '-'}</Descriptions.Item>
              <Descriptions.Item label="关联订单">
                {paymentDetail.order_ids?.map((id) => `#${id}`).join('、') || '-'}
              </Descriptions.Item>
            </Descriptions>
            <Spin spinning={alipayLoading} tip="正在向支付宝沙箱生成二维码，请勿重复点击">
              <Space direction="vertical" style={{ marginTop: 16, width: '100%' }}>
                {alipayQrCode ? (
                  <>
                    <QRCode value={alipayQrCode} size={180} />
                    <Text type="secondary">请使用支付宝沙箱买家账号扫码付款，付款后点击“同步支付宝结果”。</Text>
                    <Text copyable type="secondary">
                      二维码内容：{alipayQrCode}
                    </Text>
                  </>
                ) : (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={alipayLoading ? '正在生成二维码' : '待生成二维码'}
                  />
                )}
                <Space wrap>
                  <Button
                    type="primary"
                    loading={alipayLoading}
                    disabled={selectedOrder?.status !== 'pending_payment'}
                    onClick={() => void createAlipayQrCode(true)}
                  >
                    生成 / 刷新支付宝二维码
                  </Button>
                  <Button
                    disabled={selectedOrder?.status !== 'pending_payment'}
                    onClick={() => void syncAlipayPayment()}
                  >
                    同步支付宝结果
                  </Button>
                </Space>
              </Space>
            </Spin>
          </Card>
        ) : null}

        {selectedOrder && selectedOrder.status === 'completed' ? (
          <Card title="评价商品">
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Space wrap align="center">
                <Text type="secondary">评价明细：</Text>
                <Select
                  style={{ width: 320 }}
                  value={reviewItemValue}
                  onChange={(value) => setSelectedReviewOrderItemId(value as number)}
                  options={selectedOrder.items.map((item) => ({
                    value: item.id,
                    label: `#${item.id} ${item.product_name} x${item.quantity}`,
                  }))}
                />
              </Space>
              <Space wrap align="center">
                <Text type="secondary">评分：</Text>
                <Rate value={reviewScore} onChange={setReviewScore} />
              </Space>
              <Input.TextArea
                rows={3}
                value={reviewContent}
                onChange={(event) => setReviewContent(event.target.value)}
                placeholder="说说商品体验…"
              />
              <Upload
                listType="picture-card"
                beforeUpload={(file) => {
                  void uploadReviewImage(file)
                  return false
                }}
                fileList={imageListToFileList(reviewImages)}
                onRemove={(file) => {
                  const index = Number(String(file.uid).replace('img-', ''))
                  if (Number.isFinite(index)) {
                    setReviewImages((items) => items.filter((_, idx) => idx !== index))
                  }
                  return true
                }}
              >
                {reviewImages.length >= 5 ? null : <div>上传图片</div>}
              </Upload>
              <Button
                type="primary"
                loading={loading}
                disabled={!selectedReviewOrderItem || !reviewContent.trim()}
                onClick={() => void reviewSelectedOrder()}
              >
                提交评价
              </Button>
            </Space>
          </Card>
        ) : null}

        {selectedOrder && REFUNDABLE_ORDER_STATUS.includes(selectedOrder.status) ? (
          <Card title="申请售后">
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Space wrap align="center">
                <Text type="secondary">售后明细：</Text>
                <Select
                  style={{ width: 320 }}
                  value={refundItemValue}
                  onChange={(value) => setSelectedRefundOrderItemId(value as number)}
                  options={selectedOrder.items.map((item) => ({
                    value: item.id,
                    label: `#${item.id} ${item.product_name} x${item.quantity}`,
                  }))}
                />
              </Space>
              <Space wrap align="center">
                <Text type="secondary">数量：</Text>
                <InputNumber
                  min={1}
                  max={selectedRefundOrderItem?.quantity || 1}
                  value={refundQuantity}
                  onChange={(value) => setRefundQuantity(Number(value) || 1)}
                />
              </Space>
              <Input
                value={refundReason}
                onChange={(event) => setRefundReason(event.target.value)}
                placeholder="请填写售后原因"
              />
              <Upload
                listType="picture-card"
                beforeUpload={(file) => {
                  void uploadRefundImage(file)
                  return false
                }}
                fileList={imageListToFileList(refundImages)}
                onRemove={(file) => {
                  const index = Number(String(file.uid).replace('img-', ''))
                  if (Number.isFinite(index)) {
                    setRefundImages((items) => items.filter((_, idx) => idx !== index))
                  }
                  return true
                }}
              >
                {refundImages.length >= 5 ? null : <div>上传凭证</div>}
              </Upload>
              <Button
                type="primary"
                loading={loading}
                disabled={!selectedRefundOrderItem || !refundReason.trim()}
                onClick={() => void refundSelectedOrder()}
              >
                提交售后
              </Button>
            </Space>
          </Card>
        ) : null}

        <Card
          title="售后记录"
          extra={
            <Space>
              <Text type="secondary">状态筛选</Text>
              <Select
                allowClear
                style={{ width: 180 }}
                placeholder="全部状态"
                value={refundStatusFilter}
                onChange={(value) => setRefundStatusFilter(value as string | undefined)}
                options={REFUND_STATUS_OPTIONS}
              />
            </Space>
          }
        >
          <List
            dataSource={refunds}
            locale={{ emptyText: <Empty description="暂无售后记录" /> }}
            renderItem={(refund) => (
              <List.Item
                actions={[
                  <Button key="detail" onClick={() => void openRefundDetail(refund.id)}>
                    查看详情
                  </Button>,
                ]}
              >
                <Space wrap>
                  <Tag>售后 #{refund.id}</Tag>
                  <Badge color={statusColor(refund.status)} text={statusText(refund.status)} />
                  <Text type="secondary">订单 #{refund.order_id}</Text>
                  <Text>￥{yuan(refund.refund_amount_cent)}</Text>
                  <Text type="secondary">x{refund.quantity}</Text>
                  <Text type="secondary">{refund.reason}</Text>
                </Space>
              </List.Item>
            )}
          />
        </Card>

        <Modal
          open={!!selectedRefundDetail}
          title={selectedRefundDetail ? `售后详情 #${selectedRefundDetail.id}` : '售后详情'}
          footer={<Button onClick={() => setSelectedRefundDetail(null)}>关闭</Button>}
          onCancel={() => setSelectedRefundDetail(null)}
        >
          {selectedRefundDetail ? (
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="售后单号">{selectedRefundDetail.id}</Descriptions.Item>
                <Descriptions.Item label="订单号">#{selectedRefundDetail.order_id}</Descriptions.Item>
                <Descriptions.Item label="状态">
                  <Badge
                    color={statusColor(selectedRefundDetail.status)}
                    text={statusText(selectedRefundDetail.status)}
                  />
                </Descriptions.Item>
                <Descriptions.Item label="数量">{selectedRefundDetail.quantity}</Descriptions.Item>
                <Descriptions.Item label="退款金额">￥{yuan(selectedRefundDetail.refund_amount_cent)}</Descriptions.Item>
                <Descriptions.Item label="原因类型">{statusText(selectedRefundDetail.reason_type)}</Descriptions.Item>
                <Descriptions.Item label="原因">{selectedRefundDetail.reason}</Descriptions.Item>
                <Descriptions.Item label="凭证">
                  {selectedRefundDetail.image_urls?.length ? selectedRefundDetail.image_urls.join('、') : '-'}
                </Descriptions.Item>
              </Descriptions>
              {selectedRefundDetail.logs?.length ? (
                <List
                  size="small"
                  header={<Text strong>处理日志</Text>}
                  dataSource={selectedRefundDetail.logs}
                  renderItem={(log) => (
                    <List.Item>
                      <Space direction="vertical" size={0}>
                        <Text>
                          [{statusText(log.action)}] {log.message}
                        </Text>
                        <Text type="secondary">
                          {log.operator_type}
                          {log.created_at ? ` · ${log.created_at}` : ''}
                        </Text>
                      </Space>
                    </List.Item>
                  )}
                />
              ) : null}
            </Space>
          ) : null}
        </Modal>
      </Space>
    </main>
  )
}
