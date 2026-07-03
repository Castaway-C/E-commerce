import { useEffect, useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Card,
  Empty,
  Image,
  InputNumber,
  List,
  QRCode,
  Select,
  Skeleton,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd'
import {
  FireOutlined,
  TeamOutlined,
  EnvironmentOutlined,
  ReloadOutlined,
  ShoppingOutlined,
} from '@ant-design/icons'

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
    <div className="gb-page">
      {contextHolder}
      <Spin spinning={loading}>
        {/* ── Hero Banner ── */}
        <div className="gb-hero">
          <div className="gb-hero-bg" />
          <div className="gb-hero-inner">
            <div className="gb-hero-badge"><FireOutlined /> 拼团专区</div>
            <h1 className="gb-hero-title">拼着买，更划算</h1>
            <p className="gb-hero-subtitle">邀请好友一起拼，专享超低拼团价</p>
            <Alert
              className="gb-hero-alert"
              type={authService.hasToken() && selectedAddressBelongsToUser ? 'success' : 'warning'}
              showIcon
              message={groupBuyReadyText}
              description="拼团不叠加满减或优惠券，不参与种草奖励；可使用积分抵扣。首位用户支付后团有效期 24 小时。"
            />
          </div>
        </div>

        {/* ── Order Settings Bar ── */}
        <div className="gb-settings-bar">
          <div className="gb-settings-row">
            <div className="gb-setting-item">
              <span className="gb-setting-label"><EnvironmentOutlined /> 收货地址</span>
              <Select
                value={selectedAddressId}
                placeholder="选择收货地址"
                className="gb-address-select"
                onChange={setSelectedAddressId}
                options={addresses.map((address) => ({
                  value: address.id,
                  label: `#${address.id} ${address.receiver_name} ${address.city}${address.district ?? ''}`,
                }))}
              />
            </div>
            <div className="gb-setting-item">
              <span className="gb-setting-label">购买件数</span>
              <InputNumber
                min={1}
                precision={0}
                value={groupBuyQuantity}
                className="gb-qty-input"
                onChange={(value) => setGroupBuyQuantity(Math.max(1, Number(value) || 1))}
              />
            </div>
            <div className="gb-setting-item">
              <span className="gb-setting-label">积分抵扣</span>
              <InputNumber
                min={0}
                max={groupBuyPointCap}
                precision={0}
                value={groupBuyPoints}
                className="gb-points-input"
                onChange={(value) =>
                  setGroupBuyPoints(Math.min(groupBuyPointCap, Math.max(0, Number(value) || 0)))
                }
              />
              <span className="gb-setting-hint">可用 {availableGroupBuyPoints}</span>
            </div>
            <div className="gb-setting-item gb-setting-actions">
              <Button icon={<ReloadOutlined />} onClick={() => void loadGroupBuyActivities()}>刷新拼团</Button>
              <Button icon={<ReloadOutlined />} onClick={() => void loadAddresses()}>刷新地址</Button>
            </div>
          </div>
        </div>

        {/* ── Activity Grid ── */}
        <div className="gb-section">
          <Skeleton loading={loading} active paragraph={{ rows: 6 }}>
            {activities.length === 0 ? (
              <Empty
                description="暂无可用拼团活动，请商家先在商家端创建"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                style={{ padding: '60px 0' }}
              />
            ) : (
              <div className="gb-activity-grid">
                {activities.map((activity) => (
                  <div key={activity.id} className="gb-activity-card">
                    {/* Card Header: Product Image + Info */}
                    <div className="gb-ac-top">
                      <div className="gb-ac-image">
                        {activity.product?.cover_url ? (
                          <Image
                            preview={false}
                            src={absoluteAssetUrl(activity.product.cover_url)}
                            className="gb-ac-img"
                          />
                        ) : (
                          <div className="gb-ac-img-placeholder">
                            <ShoppingOutlined />
                          </div>
                        )}
                      </div>
                      <div className="gb-ac-info">
                        <div className="gb-ac-tags">
                          <Tag className="gb-tag-id">拼团 #{activity.id}</Tag>
                          <Tag className="gb-tag-group-size"><TeamOutlined /> {activity.group_size} 人团</Tag>
                          <Tag color={statusColor(activity.status)}>{statusText(activity.status)}</Tag>
                        </div>
                        <Text strong ellipsis className="gb-ac-name" title={activity.name}>
                          {activity.name}
                        </Text>
                        <Text type="secondary" className="gb-ac-sku">
                          商品 #{activity.product_id} · SKU #{activity.sku_id}
                        </Text>
                      </div>
                    </div>

                    {/* Price Row */}
                    <div className="gb-ac-price-row">
                      <span className="gb-ac-group-price">¥{yuan(activity.group_price_cent)}</span>
                      <span className="gb-ac-qty-tag">{groupBuyQuantity} 件</span>
                      <span className="gb-ac-total">合计 ¥{yuan(activity.group_price_cent * groupBuyQuantity)}</span>
                      {groupBuyPoints > 0 && (
                        <span className="gb-ac-points-hint">积分抵扣以后端核算为准</span>
                      )}
                    </div>

                    {/* Expire Time */}
                    {activity.valid_to && (
                      <div className="gb-ac-deadline">
                        截止：{new Date(activity.valid_to).toLocaleString()}
                      </div>
                    )}

                    {/* Start Group Button */}
                    <Button
                      type="primary"
                      block
                      className="btn-gb-start"
                      onClick={() => void startGroupBuy(activity)}
                    >
                      <FireOutlined /> 发起拼团
                    </Button>

                    {/* Active Groups */}
                    {activity.active_groups.length > 0 && (
                      <div className="gb-ac-groups">
                        <div className="gb-ac-groups-title">
                          <TeamOutlined /> 正在拼的团
                        </div>
                        <List
                          size="small"
                          dataSource={activity.active_groups}
                          renderItem={(group) => (
                            <List.Item className="gb-group-item">
                              <div className="gb-group-row">
                                <div className="gb-group-left">
                                  <Tag className="gb-tag-group-id">团 #{group.id}</Tag>
                                  <span className="gb-group-count">
                                    {group.joined_count}/{group.group_size} 人
                                  </span>
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
                                </div>
                                <div className="gb-group-right">
                                  <span className="gb-group-expire">
                                    {new Date(group.expire_at).toLocaleString()}
                                  </span>
                                  <Button
                                    size="small"
                                    type="primary"
                                    className="btn-gb-join"
                                    disabled={group.joined_count >= group.group_size}
                                    onClick={() => void joinGroupBuy(group.id)}
                                  >
                                    加入此团
                                  </Button>
                                </div>
                              </div>
                            </List.Item>
                          )}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Skeleton>
        </div>

        {/* ── Payment Section ── */}
        {(paymentDetail || visibleAlipayQrCode) && (
          <div className="gb-section">
            <Card className="gb-payment-card" title={<span className="gb-payment-title">支付宝扫码支付</span>}>
              <div className="gb-payment-body">
                <div className="gb-payment-info">
                  <Space wrap size={8}>
                    <Tag className="gb-tag-payment">支付单 #{paymentDetail?.id ?? '-'}</Tag>
                    <Tag color={statusColor(paymentDetail?.status)}>
                      {statusText(paymentDetail?.status)}
                    </Tag>
                    {paymentDetail && (
                      <span className="gb-payment-amount">应付 ¥{yuan(paymentDetail.pay_amount_cent)}</span>
                    )}
                  </Space>
                </div>

                {visibleAlipayQrCode ? (
                  <div className="gb-qr-area">
                    <QRCode value={visibleAlipayQrCode} size={180} className="gb-qr-code" />
                    <Text type="secondary" className="gb-qr-hint">
                      请使用支付宝沙箱买家账号扫码付款
                    </Text>
                    <Text copyable type="secondary" className="gb-qr-raw">
                      二维码内容：{visibleAlipayQrCode}
                    </Text>
                  </div>
                ) : (
                  <Empty description="暂无支付二维码" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}

                <div className="gb-payment-actions">
                  <Button
                    type="primary"
                    onClick={() => void createAlipayQrCode(false)}
                    disabled={!paymentDetail}
                  >
                    生成支付宝二维码
                  </Button>
                  <Button onClick={() => void createAlipayQrCode(true)} disabled={!paymentDetail}>
                    强制重新生成
                  </Button>
                  {paymentDetail && (
                    <Button onClick={() => void loadPaymentDetail(paymentDetail.id)}>
                      刷新支付状态
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}
      </Spin>
    </div>
  )
}
