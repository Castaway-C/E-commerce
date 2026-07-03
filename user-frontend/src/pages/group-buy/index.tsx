import { useEffect, useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Empty,
  Image,
  InputNumber,
  List,
  QRCode,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd'

import { addressService, type Address } from '../../services/address'
import { authService, type PointsAccount, type UserProfile } from '../../services/auth'
import { getApiErrorMessage } from '../../services/http'
import { groupBuyService, type GroupBuyActivity } from '../../services/groupBuy'
import { orderService, type Payment } from '../../services/order'
import { absoluteAssetUrl, randomToken, statusColor, statusText, yuan } from '../../utils/format'

const { Text, Title, Paragraph } = Typography

export function GroupBuyPage() {
  const [api, contextHolder] = message.useMessage()
  const [activities, setActivities] = useState<GroupBuyActivity[]>([])
  const [addresses, setAddresses] = useState<Address[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<number | undefined>(undefined)
  const [groupBuyPoints, setGroupBuyPoints] = useState(0)
  const [groupBuyQuantity, setGroupBuyQuantity] = useState(1)
  const [paymentDetail, setPaymentDetail] = useState<Payment | null>(null)
  const [alipayQrCode, setAlipayQrCode] = useState('')
  const [loading, setLoading] = useState(false)

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [pointsAccount, setPointsAccount] = useState<PointsAccount | null>(null)

  const availableGroupBuyPoints = pointsAccount?.points ?? profile?.points ?? 0
  const groupBuyPointCap = Math.max(0, availableGroupBuyPoints)
  const selectedAddressBelongsToUser = Boolean(
    selectedAddressId && addresses.some((address) => address.id === selectedAddressId),
  )
  const visibleAlipayQrCode = alipayQrCode || paymentDetail?.alipay_qr_code || ''

  const groupBuyReadyText = !authService.hasToken()
    ? '请先登录用户账号'
    : !selectedAddressBelongsToUser
      ? '请先选择或新增当前用户的收货地址'
      : '可发起或加入拼团'

  async function loadGroupBuyActivities() {
    try {
      const response = await groupBuyService.listActivities()
      setActivities(response.data ?? [])
    } catch (error) {
      api.error(`加载拼团活动失败：${getApiErrorMessage(error)}`)
    }
  }

  async function loadAddresses() {
    if (!authService.hasToken()) return
    try {
      const response = await addressService.listAddresses()
      setAddresses(response.data ?? [])
      setSelectedAddressId((current) => {
        if (current && response.data?.some((address) => address.id === current)) return current
        const defaultAddress = response.data?.find((address) => address.is_default)
        return defaultAddress?.id ?? response.data?.[0]?.id ?? undefined
      })
    } catch (error) {
      api.error(`加载收货地址失败：${getApiErrorMessage(error)}`)
    }
  }

  async function loadProfile() {
    if (!authService.hasToken()) return
    try {
      const response = await authService.profile()
      setProfile(response.data)
    } catch (error) {
      api.error(`加载用户信息失败：${getApiErrorMessage(error)}`)
    }
  }

  async function loadPointsAccount() {
    if (!authService.hasToken()) return
    try {
      const response = await authService.pointsAccount()
      setPointsAccount(response.data)
    } catch (error) {
      api.error(`加载积分账户失败：${getApiErrorMessage(error)}`)
    }
  }

  async function loadPaymentDetail(paymentId: number) {
    try {
      const response = await orderService.getPayment(paymentId)
      setPaymentDetail(response.data)
      setAlipayQrCode(response.data.alipay_qr_code || '')
    } catch (error) {
      api.error(`加载支付单失败：${getApiErrorMessage(error)}`)
    }
  }

  async function createAlipayQrCode(force = false) {
    if (!paymentDetail) return
    setLoading(true)
    try {
      const response = await orderService.precreateAlipay(paymentDetail.id, force)
      setAlipayQrCode(response.data.qr_code)
      setPaymentDetail(response.data.payment)
      api.success('已生成支付宝扫码二维码')
    } catch (error) {
      api.error(`生成支付宝二维码失败：${getApiErrorMessage(error)}`)
    } finally {
      setLoading(false)
    }
  }

  async function startGroupBuy(activity: GroupBuyActivity) {
    if (!authService.hasToken()) {
      api.warning('请先登录用户账号')
      return
    }
    if (!selectedAddressBelongsToUser || !selectedAddressId) {
      api.warning('请先选择或新增当前用户的收货地址')
      return
    }
    setLoading(true)
    try {
      const safePoints = Math.min(Math.max(0, groupBuyPoints), groupBuyPointCap)
      const response = await groupBuyService.startGroup({
        activity_id: activity.id,
        quantity: groupBuyQuantity,
        shipping_address_id: selectedAddressId,
        points_used: safePoints,
        client_order_token: randomToken('group_start'),
      })
      const data = response.data
      if (data?.order.payment_id) {
        await loadPaymentDetail(data.order.payment_id)
      }
      await Promise.all([loadGroupBuyActivities(), loadProfile(), loadPointsAccount()])
      api.success('拼团已发起，请扫码完成支付')
    } catch (error) {
      api.error(getApiErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  async function joinGroupBuy(groupId: number) {
    if (!authService.hasToken()) {
      api.warning('请先登录用户账号')
      return
    }
    if (!selectedAddressBelongsToUser || !selectedAddressId) {
      api.warning('请先选择或新增当前用户的收货地址')
      return
    }
    setLoading(true)
    try {
      const safePoints = Math.min(Math.max(0, groupBuyPoints), groupBuyPointCap)
      const response = await groupBuyService.joinGroup({
        group_id: groupId,
        quantity: groupBuyQuantity,
        shipping_address_id: selectedAddressId,
        points_used: safePoints,
        client_order_token: randomToken('group_join'),
      })
      const data = response.data
      if (data?.order.payment_id) {
        await loadPaymentDetail(data.order.payment_id)
      }
      await Promise.all([loadGroupBuyActivities(), loadProfile(), loadPointsAccount()])
      api.success('已加入拼团，请扫码完成支付')
    } catch (error) {
      api.error(getApiErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadGroupBuyActivities()
    void loadAddresses()
    void loadProfile()
    void loadPointsAccount()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <main className="page-shell">
      {contextHolder}
      <Spin spinning={loading}>
        <Space direction="vertical" size={24} style={{ width: '100%' }}>
          <Card>
            <Title level={3}>拼团专区</Title>
            <Paragraph type="secondary">
              参与拼团可享专属拼团价。拼团单独下单，不加入购物车，不叠加满减或优惠券，不参与社区种草奖励；可使用积分抵扣（受平台单笔抵扣上限限制），开团或参团后请在下方扫码支付。
            </Paragraph>
            <Alert
              className="group-buy-alert"
              type={authService.hasToken() && selectedAddressBelongsToUser ? 'success' : 'warning'}
              showIcon
              message={groupBuyReadyText}
              description="拼团支持 2 人或 3 人团；首位用户支付后团有效期 24 小时，达到成团人数且均支付后进入商家待发货。"
            />
          </Card>

          <Card title="收货地址与下单参数" className="group-buy-control">
            <Row gutter={[16, 12]} align="middle">
              <Col span={6}>
                <Text type="secondary">当前用户积分</Text>
                <Title level={4} style={{ margin: 0 }}>
                  {availableGroupBuyPoints}
                </Title>
              </Col>
              <Col span={6}>
                <Text type="secondary">本次使用积分</Text>
                <InputNumber
                  min={0}
                  max={groupBuyPointCap}
                  precision={0}
                  value={groupBuyPoints}
                  style={{ width: '100%' }}
                  onChange={(value) =>
                    setGroupBuyPoints(Math.min(groupBuyPointCap, Math.max(0, Number(value) || 0)))
                  }
                />
              </Col>
              <Col span={6}>
                <Text type="secondary">购买件数</Text>
                <InputNumber
                  min={1}
                  precision={0}
                  value={groupBuyQuantity}
                  style={{ width: '100%' }}
                  onChange={(value) => setGroupBuyQuantity(Math.max(1, Number(value) || 1))}
                />
              </Col>
              <Col span={6}>
                <Text type="secondary">收货地址</Text>
                <Select
                  value={selectedAddressId}
                  placeholder="选择收货地址"
                  style={{ width: '100%' }}
                  onChange={setSelectedAddressId}
                  options={addresses.map((address) => ({
                    value: address.id,
                    label: `#${address.id} ${address.receiver_name} ${address.city}${address.district ?? ''}`,
                  }))}
                />
              </Col>
            </Row>
            <Space wrap style={{ marginTop: 12 }}>
              <Button onClick={() => void loadGroupBuyActivities()}>刷新拼团</Button>
              <Button onClick={() => void loadAddresses()}>刷新地址</Button>
            </Space>
          </Card>

          <Card title="拼团活动">
            {activities.length === 0 ? (
              <Empty description="暂无可用拼团活动，请商家先在商家端创建" />
            ) : (
              <Row gutter={[16, 16]}>
                {activities.map((activity) => (
                  <Col span={12} key={activity.id}>
                    <Card size="small" className="group-buy-card">
                      <Space direction="vertical" size={10} style={{ width: '100%' }}>
                        <Space wrap>
                          <Tag color="purple">拼团 #{activity.id}</Tag>
                          <Tag>{activity.group_size} 人团</Tag>
                          <Tag color={statusColor(activity.status)}>{statusText(activity.status)}</Tag>
                        </Space>
                        <Text strong>{activity.name}</Text>
                        <Space align="baseline">
                          <Text className="price">￥{yuan(activity.group_price_cent)}</Text>
                          <Text type="secondary">
                            商品 #{activity.product_id} / SKU #{activity.sku_id}
                          </Text>
                        </Space>
                        <div className="group-buy-price-line">
                          <Tag color="purple">{groupBuyQuantity} 件</Tag>
                          <Text>商品金额 ￥{yuan(activity.group_price_cent * groupBuyQuantity)}</Text>
                          {groupBuyPoints > 0 ? (
                            <Text type="secondary">积分抵扣以平台上限和后端核算为准</Text>
                          ) : null}
                        </div>
                        {activity.valid_to ? (
                          <Text type="secondary">活动截止：{new Date(activity.valid_to).toLocaleString()}</Text>
                        ) : null}
                        {activity.product ? (
                          <Space align="start">
                            {activity.product.cover_url ? (
                              <Image
                                width={72}
                                height={72}
                                preview={false}
                                src={absoluteAssetUrl(activity.product.cover_url)}
                              />
                            ) : null}
                            <Space direction="vertical" size={2}>
                              <Text>{activity.product.name}</Text>
                            </Space>
                          </Space>
                        ) : null}
                        <Button type="primary" onClick={() => void startGroupBuy(activity)}>
                          发起拼团并支付
                        </Button>
                        <List
                          size="small"
                          dataSource={activity.active_groups}
                          locale={{ emptyText: '暂无正在拼的团' }}
                          renderItem={(group) => (
                            <List.Item
                              actions={[
                                <Button
                                  size="small"
                                  disabled={group.joined_count >= group.group_size}
                                  onClick={() => void joinGroupBuy(group.id)}
                                >
                                  加入此团
                                </Button>,
                              ]}
                            >
                              <Space direction="vertical" size={2}>
                                <Space wrap>
                                  <Tag color="blue">团 #{group.id}</Tag>
                                  <Text>
                                    {group.joined_count}/{group.group_size} 人已支付
                                  </Text>
                                  <Badge
                                    status={
                                      group.status === 'success'
                                        ? 'success'
                                        : group.status === 'failed' || group.status === 'expired'
                                          ? 'error'
                                          : 'processing'
                                    }
                                    text={statusText(group.status)}
                                  />
                                </Space>
                                <Text type="secondary">
                                  24h 截止：{new Date(group.expire_at).toLocaleString()}
                                </Text>
                              </Space>
                            </List.Item>
                          )}
                        />
                      </Space>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
          </Card>

          {paymentDetail || visibleAlipayQrCode ? (
            <Card title="支付宝扫码支付">
              <Space direction="vertical" align="center" style={{ width: '100%' }}>
                <Space wrap>
                  <Tag color="blue">支付单 #{paymentDetail?.id ?? '-'}</Tag>
                  <Tag color={statusColor(paymentDetail?.status)}>
                    {statusText(paymentDetail?.status)}
                  </Tag>
                  {paymentDetail ? (
                    <Text className="price">应付 ￥{yuan(paymentDetail.pay_amount_cent)}</Text>
                  ) : null}
                </Space>
                {visibleAlipayQrCode ? (
                  <>
                    <QRCode value={visibleAlipayQrCode} size={180} />
                    <Text type="secondary">
                      请使用支付宝沙箱买家账号扫码付款。二维码内容不是网页支付链接，直接在浏览器打开不会进入该订单支付。
                    </Text>
                    <Text copyable type="secondary">
                      调试用二维码内容：{visibleAlipayQrCode}
                    </Text>
                  </>
                ) : (
                  <Empty description="暂无支付二维码，可点击下方按钮生成" />
                )}
                <Space wrap>
                  <Button onClick={() => void createAlipayQrCode(false)} disabled={!paymentDetail}>
                    生成支付宝二维码
                  </Button>
                  <Button onClick={() => void createAlipayQrCode(true)} disabled={!paymentDetail}>
                    强制重新生成二维码
                  </Button>
                  {paymentDetail ? (
                    <Button onClick={() => void loadPaymentDetail(paymentDetail.id)}>刷新支付状态</Button>
                  ) : null}
                </Space>
              </Space>
            </Card>
          ) : null}
        </Space>
      </Spin>
    </main>
  )
}
