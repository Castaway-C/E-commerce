import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Alert,
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
import { FireOutlined, TeamOutlined } from '@ant-design/icons'

import { addressService, type Address } from '../../services/address'
import { authService, type PointsAccount, type UserProfile } from '../../services/auth'
import { getApiErrorMessage } from '../../services/http'
import { groupBuyService, type GroupBuyActivity, type GroupBuyGroup } from '../../services/groupBuy'
import { orderService, type CheckoutResult, type Payment } from '../../services/order'
import { pickErrorMessage, randomToken, statusColor, statusText, yuan } from '../../utils/format'

const { Text, Title, Paragraph } = Typography

type GroupBuyMode =
  | { kind: 'start'; activityId: number }
  | { kind: 'join'; groupId: number }
  | null

export function CheckoutPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const groupBuyParam = searchParams.get('group_buy')
  const groupJoinParam = searchParams.get('group_join')

  const groupBuyMode: GroupBuyMode = useMemo(() => {
    if (groupBuyParam) {
      const id = Number(groupBuyParam)
      if (!Number.isNaN(id) && id > 0) return { kind: 'start', activityId: id }
    }
    if (groupJoinParam) {
      const id = Number(groupJoinParam)
      if (!Number.isNaN(id) && id > 0) return { kind: 'join', groupId: id }
    }
    return null
  }, [groupBuyParam, groupJoinParam])

  // ===== Cart checkout state =====
  const [checkout, setCheckout] = useState<CheckoutResult | null>(null)
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null)
  const [selectedFullDiscountId, setSelectedFullDiscountId] = useState<number | undefined>()
  const [selectedUserCouponId, setSelectedUserCouponId] = useState<number | undefined>()
  const [pointsToUse, setPointsToUse] = useState(0)

  // ===== Group-buy state =====
  const [activity, setActivity] = useState<GroupBuyActivity | null>(null)
  const [group, setGroup] = useState<GroupBuyGroup | null>(null)
  const [addresses, setAddresses] = useState<Address[]>([])
  const [groupQuantity, setGroupQuantity] = useState(1)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [pointsAccount, setPointsAccount] = useState<PointsAccount | null>(null)

  // ===== Shared state =====
  const [paymentDetail, setPaymentDetail] = useState<Payment | null>(null)
  const [alipayQrCode, setAlipayQrCode] = useState('')
  const [createdInfo, setCreatedInfo] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const isGroupBuyMode = groupBuyMode !== null
  const availablePoints = pointsAccount?.points ?? profile?.points ?? 0
  const groupPointCap = Math.max(0, availablePoints)
  const groupTotalCent = activity ? activity.group_price_cent * groupQuantity : 0
  const visibleAlipayQrCode = alipayQrCode || paymentDetail?.alipay_qr_code || ''

  // ===== Cart checkout =====
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

  // ===== Group-buy checkout =====
  async function loadGroupBuyContext() {
    if (!groupBuyMode) return
    setLoading(true)
    setMessage('')
    try {
      // 拉取活动列表，再按 id/group_id 找出对应活动/团
      const activityResponse = await groupBuyService.listActivities()
      const allActivities = activityResponse.data ?? []
      let matchedActivity: GroupBuyActivity | null = null
      let matchedGroup: GroupBuyGroup | null = null

      if (groupBuyMode.kind === 'start') {
        matchedActivity = allActivities.find((item) => item.id === groupBuyMode.activityId) ?? null
        if (!matchedActivity) {
          setMessage(`未找到拼团活动 #${groupBuyMode.activityId}`)
          return
        }
      } else {
        // join：遍历所有活动找匹配的 group
        for (const item of allActivities) {
          const found = item.active_groups.find((g) => g.id === groupBuyMode.groupId)
          if (found) {
            matchedActivity = item
            matchedGroup = found
            break
          }
        }
        if (!matchedActivity || !matchedGroup) {
          setMessage(`未找到拼团 #${groupBuyMode.groupId}，可能已成团或失效`)
          return
        }
      }

      setActivity(matchedActivity)
      setGroup(matchedGroup)

      // 并行加载地址、积分
      const [addressRes, profileRes, pointsRes] = await Promise.all([
        addressService.listAddresses(),
        authService.profile(),
        authService.pointsAccount(),
      ])
      const addressList = addressRes.data ?? []
      setAddresses(addressList)
      setProfile(profileRes.data)
      setPointsAccount(pointsRes.data)
      const defaultAddress = addressList.find((address) => address.is_default)
      setSelectedAddressId(defaultAddress?.id ?? addressList[0]?.id ?? null)
    } catch (error) {
      setMessage(`加载拼团信息失败：${getApiErrorMessage(error)}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isGroupBuyMode) {
      void loadGroupBuyContext()
    } else {
      void loadCheckout()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGroupBuyMode, groupBuyParam, groupJoinParam])

  async function loadPaymentDetail(paymentId: number) {
    try {
      const response = await orderService.getPayment(paymentId)
      setPaymentDetail(response.data)
      setAlipayQrCode(response.data.alipay_qr_code || '')
    } catch (error) {
      setMessage(`加载支付单失败：${getApiErrorMessage(error)}`)
    }
  }

  async function handleSubmitCart() {
    if (!checkout || checkout.items.length === 0) {
      setMessage('暂无可结算商品，请先在购物车勾选有效商品')
      return
    }
    setMessage('')
    setCreatedInfo('')
    setAlipayQrCode('')
    setPaymentDetail(null)
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
        await loadPaymentDetail(paymentId)
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

  async function handleSubmitGroupBuy() {
    if (!activity) {
      setMessage('拼团活动信息缺失')
      return
    }
    if (!selectedAddressId) {
      setMessage('请先选择收货地址')
      return
    }
    if (groupBuyMode?.kind === 'join' && !group) {
      setMessage('拼团信息缺失')
      return
    }
    setMessage('')
    setCreatedInfo('')
    setAlipayQrCode('')
    setPaymentDetail(null)
    setLoading(true)
    try {
      const safePoints = Math.min(Math.max(0, pointsToUse), groupPointCap)
      const response =
        groupBuyMode?.kind === 'start'
          ? await groupBuyService.startGroup({
              activity_id: activity.id,
              quantity: groupQuantity,
              shipping_address_id: selectedAddressId,
              points_used: safePoints,
              client_order_token: randomToken('group_start'),
            })
          : await groupBuyService.joinGroup({
              group_id: group!.id,
              quantity: groupQuantity,
              shipping_address_id: selectedAddressId,
              points_used: safePoints,
              client_order_token: randomToken('group_join'),
            })
      const data = response.data
      const paymentId = data.order.payment_id
      const orderIds = data.order.order_ids
      setCreatedInfo(
        `支付单 ID：${paymentId}；订单 ID：${orderIds.join(', ')}；拼团 #${data.group.id}（${data.group.joined_count}/${data.group.group_size} 人）`,
      )
      try {
        const alipayResponse = await orderService.precreateAlipay(paymentId)
        setAlipayQrCode(alipayResponse.data.qr_code)
        await loadPaymentDetail(paymentId)
        setMessage(
          groupBuyMode?.kind === 'start' ? '拼团已发起，请扫码完成支付。' : '已加入拼团，请扫码完成支付。',
        )
      } catch (error) {
        setMessage(`支付宝二维码生成失败：${pickErrorMessage(error) ?? '请求失败'}`)
      }
      setPointsToUse(0)
    } catch (error) {
      setMessage(`拼团提交失败：${getApiErrorMessage(error)}`)
    } finally {
      setLoading(false)
    }
  }

  // ===== Render: Group-buy mode =====
  if (isGroupBuyMode) {
    const groupBuyReadyText = !authService.hasToken()
      ? '请先登录用户账号'
      : addresses.length === 0
        ? '请先到个人中心新增收货地址'
        : !activity
          ? '拼团活动信息加载中或不存在'
          : groupBuyMode?.kind === 'join' && !group
            ? '拼团不存在或已不可加入'
            : '可以提交拼团订单'

    return (
      <main className="page-shell">
        <Spin spinning={loading && !activity}>
          <Space direction="vertical" size={24} style={{ width: '100%' }}>
            <Card>
              <Title level={3}>
                {groupBuyMode?.kind === 'start' ? (
                  <><FireOutlined /> 发起拼团</>
                ) : (
                  <><TeamOutlined /> 加入拼团</>
                )}
              </Title>
              <Paragraph type="secondary">
                选择收货地址、购买件数和积分抵扣后提交，将生成支付宝沙箱二维码。拼团不叠加满减或优惠券，可使用积分抵扣（受平台单笔上限约束）。
              </Paragraph>
              <Alert
                type={activity ? 'success' : 'warning'}
                showIcon
                message={groupBuyReadyText}
                description="首位用户支付后团有效期 24 小时；成团后订单进入商家待发货。"
              />
            </Card>

            {activity ? (
              <>
                <Card title="拼团活动" className="checkout-panel">
                  <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    <Space wrap>
                      <Tag className="gb-tag-id">拼团 #{activity.id}</Tag>
                      <Tag className="gb-tag-group-size">
                        <TeamOutlined /> {activity.group_size} 人团
                      </Tag>
                      <Tag color={statusColor(activity.status)}>{statusText(activity.status)}</Tag>
                      {group ? (
                        <Tag className="gb-tag-group-id">
                          团 #{group.id} {group.joined_count}/{group.group_size} 人
                        </Tag>
                      ) : null}
                    </Space>
                    <Text strong>{activity.name}</Text>
                    <Text type="secondary">
                      商品 #{activity.product_id} · SKU #{activity.sku_id}
                    </Text>
                    <Descriptions size="small" bordered column={1}>
                      <Descriptions.Item label="拼团单价">
                        <Text className="price">￥{yuan(activity.group_price_cent)}</Text>
                      </Descriptions.Item>
                      <Descriptions.Item label="购买件数">
                        <InputNumber
                          min={1}
                          precision={0}
                          value={groupQuantity}
                          onChange={(value) => setGroupQuantity(Math.max(1, Number(value) || 1))}
                        />
                      </Descriptions.Item>
                      <Descriptions.Item label="商品总额">
                        ￥{yuan(groupTotalCent)}
                      </Descriptions.Item>
                      <Descriptions.Item label="积分抵扣">
                        <InputNumber
                          min={0}
                          max={groupPointCap}
                          precision={0}
                          value={pointsToUse}
                          addonAfter={`最多 ${groupPointCap}`}
                          onChange={(value) => setPointsToUse(Number(value) || 0)}
                        />
                        <Text type="secondary" style={{ marginLeft: 8 }}>
                          实际抵扣以后端核算为准
                        </Text>
                      </Descriptions.Item>
                      <Descriptions.Item label="支付宝应付（提交后核算）">
                        <Text type="secondary">提交订单后由后端计算</Text>
                      </Descriptions.Item>
                    </Descriptions>
                    {activity.valid_to && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        活动截止：{new Date(activity.valid_to).toLocaleString()}
                      </Text>
                    )}
                  </Space>
                </Card>

                <Card title="收货地址">
                  {addresses.length > 0 ? (
                    <Radio.Group
                      value={selectedAddressId ?? undefined}
                      onChange={(event) => setSelectedAddressId(event.target.value as number)}
                      style={{ width: '100%' }}
                    >
                      <Space direction="vertical" style={{ width: '100%' }}>
                        {addresses.map((address) => (
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
                    <Text type="secondary">暂无收货地址，请先到个人中心新增地址。</Text>
                  )}
                </Card>

                <Card>
                  <Space wrap>
                    <Button
                      type="primary"
                      size="large"
                      loading={loading}
                      disabled={!activity || !selectedAddressId}
                      onClick={() => void handleSubmitGroupBuy()}
                    >
                      {groupBuyMode?.kind === 'start' ? '提交拼团并生成支付二维码' : '加入拼团并生成支付二维码'}
                    </Button>
                    <Button onClick={() => navigate('/group-buy')}>返回拼团专区</Button>
                    <Button onClick={() => navigate('/orders')}>查看订单</Button>
                  </Space>
                </Card>

                {createdInfo ? (
                  <Card title="下单结果">
                    <Space direction="vertical" size={12} style={{ width: '100%' }}>
                      <Text>{createdInfo}</Text>
                      {paymentDetail ? (
                        <Space wrap size={8}>
                          <Tag color="blue">支付单 #{paymentDetail.id}</Tag>
                          <Tag color={statusColor(paymentDetail.status)}>
                            {statusText(paymentDetail.status)}
                          </Tag>
                          <Text className="price">应付 ￥{yuan(paymentDetail.pay_amount_cent)}</Text>
                          <Text type="secondary">
                            积分抵扣 ￥{yuan(paymentDetail.points_discount_amount_cent)}（{paymentDetail.points_used} 分）
                          </Text>
                        </Space>
                      ) : null}
                      {visibleAlipayQrCode ? (
                        <Space direction="vertical" align="center" style={{ width: '100%' }}>
                          <QRCode value={visibleAlipayQrCode} size={180} />
                          <Text type="secondary">
                            请使用支付宝沙箱买家账号扫码付款。二维码内容不是网页支付链接，直接在浏览器打开不会进入该订单支付。
                          </Text>
                          <Text copyable type="secondary">
                            调试用订单码内容：{visibleAlipayQrCode}
                          </Text>
                        </Space>
                      ) : null}
                    </Space>
                  </Card>
                ) : null}
              </>
            ) : !loading ? (
              <Card>
                <Empty description={message || '拼团活动不存在或已结束。'} />
              </Card>
            ) : null}

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

  // ===== Render: Cart checkout =====
  async function handleSubmit() {
    await handleSubmitCart()
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
                    {paymentDetail ? (
                      <Space wrap size={8}>
                        <Tag color="blue">支付单 #{paymentDetail.id}</Tag>
                        <Tag color={statusColor(paymentDetail.status)}>
                          {statusText(paymentDetail.status)}
                        </Tag>
                        <Text className="price">应付 ￥{yuan(paymentDetail.pay_amount_cent)}</Text>
                      </Space>
                    ) : null}
                    {visibleAlipayQrCode ? (
                      <Space direction="vertical" align="center" style={{ width: '100%' }}>
                        <QRCode value={visibleAlipayQrCode} size={180} />
                        <Text type="secondary">
                          请使用支付宝沙箱买家账号扫码付款。二维码内容不是网页支付链接，直接在浏览器打开不会进入该订单支付。
                        </Text>
                        <Text copyable type="secondary">
                          调试用订单码内容：{visibleAlipayQrCode}
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
