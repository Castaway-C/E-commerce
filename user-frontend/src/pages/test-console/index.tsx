import {
  Badge,
  Button,
  Card,
  Col,
  Collapse,
  Descriptions,
  Divider,
  Drawer,
  Empty,
  Form,
  Image,
  Input,
  InputNumber,
  List,
  Modal,
  Row,
  Select,
  Skeleton,
  Space,
  Statistic,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd'
import type { UploadFile } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { addressService, type Address } from '../../services/address'
import { authService, type UserProfile } from '../../services/auth'
import { communityService, type CommunityComment, type CommunityPost } from '../../services/community'
import { orderService, type CartItem, type CheckoutResult, type Order } from '../../services/order'
import { productService, type Category, type ProductDetail, type ProductListItem } from '../../services/product'
import { promotionService, type CouponTemplate, type UserCoupon } from '../../services/promotion'
import { uploadService } from '../../services/upload'

const { Title, Text, Paragraph } = Typography

type ApiResult = {
  title: string
  ok: boolean
  data: unknown
  time: string
}

function yuan(valueCent?: number | null) {
  return ((valueCent ?? 0) / 100).toFixed(2)
}

function yuanToCent(value: string) {
  const numberValue = Number(value)
  if (!Number.isFinite(numberValue)) return undefined
  return Math.round(numberValue * 100)
}

function splitIds(value: string) {
  return value
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0)
}

function pickData(response: unknown) {
  if (response && typeof response === 'object' && 'data' in response) {
    return (response as { data: unknown }).data
  }
  return response
}

function formatError(error: unknown) {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { status?: number; data?: unknown } }).response
    return { status: response?.status, data: response?.data }
  }
  return error instanceof Error ? error.message : error
}

function randomMobile() {
  return `137${String(Date.now()).slice(-8)}`
}

function randomToken(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`
}

function absoluteAssetUrl(url?: string | null) {
  if (!url) return undefined
  if (/^https?:\/\//.test(url)) return url
  return `http://localhost:8000${url}`
}

function statusText(status?: string) {
  const map: Record<string, string> = {
    pending_payment: '待支付',
    pending_shipment: '待发货',
    shipping: '待收货',
    pending_receipt: '待收货',
    completed: '已完成',
    cancelled: '已取消',
    after_sale: '售后中',
    closed: '已关闭',
    published: '已发布',
    hidden: '已隐藏',
    on_sale: '上架中',
    off_sale: '已下架',
    active: '可领取',
    unused: '未使用',
    used: '已使用',
    expired: '已过期',
    disabled: '已停用',
    normal: '普通帖',
    grass: '种草帖',
  }
  return status ? map[status] ?? status : '-'
}

function statusColor(status?: string) {
  if (['completed', 'published', 'on_sale', 'active', 'unused'].includes(status || '')) return 'green'
  if (['pending_payment', 'pending_shipment', 'shipping', 'pending_receipt', 'after_sale'].includes(status || '')) {
    return 'orange'
  }
  if (['cancelled', 'closed', 'hidden', 'disabled', 'expired'].includes(status || '')) return 'red'
  return 'blue'
}

function ApiHistory({ results }: { results: ApiResult[] }) {
  return (
    <Collapse
      className="debug-collapse"
      items={[
        {
          key: 'debug',
          label: `接口返回排查（最近 ${results.length} 条）`,
          children:
            results.length === 0 ? (
              <Text type="secondary">正常使用时不用查看这里。接口报错时展开最近操作记录即可排查。</Text>
            ) : (
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {results.map((result, index) => (
                  <Card size="small" key={`${result.time}-${index}`} title={`${result.time} ${result.title}`}>
                    <Tag color={result.ok ? 'green' : 'red'}>{result.ok ? '成功' : '失败'}</Tag>
                    <pre>{JSON.stringify(result.data, null, 2)}</pre>
                  </Card>
                ))}
              </Space>
            ),
        },
      ]}
    />
  )
}

export function UserTestConsolePage() {
  const [api, contextHolder] = message.useMessage()
  const [apiHistory, setApiHistory] = useState<ApiResult[]>([])
  const [loading, setLoading] = useState(false)

  const [mobile, setMobile] = useState(randomMobile())
  const [password, setPassword] = useState('12345678')
  const [nickname, setNickname] = useState('测试用户')
  const [profile, setProfile] = useState<UserProfile | null>(null)

  const [categories, setCategories] = useState<Category[]>([])
  const [categoryId, setCategoryId] = useState<number | undefined>()
  const [keyword, setKeyword] = useState('')
  const [products, setProducts] = useState<ProductListItem[]>([])
  const [selectedProduct, setSelectedProduct] = useState<ProductDetail | null>(null)
  const [selectedSkuId, setSelectedSkuId] = useState<number | undefined>()
  const [quantity, setQuantity] = useState(1)

  const [addresses, setAddresses] = useState<Address[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<number | undefined>()
  const [receiverName, setReceiverName] = useState('测试收货人')
  const [receiverMobile, setReceiverMobile] = useState(mobile)
  const [detailAddress, setDetailAddress] = useState('测试路 1 号')

  const [cart, setCart] = useState<CartItem[]>([])
  const [checkoutPreview, setCheckoutPreview] = useState<CheckoutResult | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrderId, setSelectedOrderId] = useState<number | undefined>()
  const [paymentId, setPaymentId] = useState<number | undefined>()

  const [coupons, setCoupons] = useState<CouponTemplate[]>([])
  const [myCoupons, setMyCoupons] = useState<UserCoupon[]>([])
  const [selectedUserCouponId, setSelectedUserCouponId] = useState<number | undefined>()

  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null)
  const [comments, setComments] = useState<CommunityComment[]>([])
  const [postTitle, setPostTitle] = useState('我的购物体验')
  const [postContent, setPostContent] = useState('这是一条用于社区展示的内容。')
  const [postProductIds, setPostProductIds] = useState('')
  const [postImages, setPostImages] = useState<string[]>([])
  const [commentContent, setCommentContent] = useState('这是一条评论。')

  const selectedSku = useMemo(() => {
    return selectedProduct?.skus.find((sku) => sku.id === selectedSkuId) ?? selectedProduct?.skus[0]
  }, [selectedProduct, selectedSkuId])

  const selectedOrder = useMemo(() => {
    return orders.find((order) => order.id === selectedOrderId) ?? null
  }, [orders, selectedOrderId])

  const availableUserCoupons = useMemo(() => {
    return myCoupons.filter((coupon) => coupon.status === 'unused')
  }, [myCoupons])

  const categoryTree = useMemo(() => {
    const childrenByParent = new Map<number | null, Category[]>()
    categories.forEach((category) => {
      const parentId = category.parent_id ?? null
      childrenByParent.set(parentId, [...(childrenByParent.get(parentId) ?? []), category])
    })
    childrenByParent.forEach((items) => items.sort((a, b) => a.sort_order - b.sort_order || a.id - b.id))
    return (childrenByParent.get(null) ?? []).flatMap((parent) => [
      { ...parent, label: parent.name },
      ...(childrenByParent.get(parent.id) ?? []).map((child) => ({ ...child, label: `${parent.name} / ${child.name}` })),
    ])
  }, [categories])

  const cartTotal = cart.reduce((total, item) => total + item.price_cent * item.quantity, 0)

  async function run<T>(title: string, action: () => Promise<unknown>): Promise<T | null> {
    try {
      const response = await action()
      const data = pickData(response)
      setApiHistory((items) => [{ title, ok: true, data, time: new Date().toLocaleTimeString() }, ...items].slice(0, 8))
      return data as T
    } catch (error) {
      const data = formatError(error)
      setApiHistory((items) => [{ title, ok: false, data, time: new Date().toLocaleTimeString() }, ...items].slice(0, 8))
      api.error(`${title}失败，请展开接口返回排查`)
      return null
    }
  }

  async function loadProfile() {
    if (!authService.hasToken()) {
      setProfile(null)
      return
    }
    const data = await run<UserProfile>('读取当前用户', () => authService.profile())
    if (data) setProfile(data)
  }

  async function login() {
    const data = await run('用户登录', () => authService.login({ account: mobile, password }))
    if (data) {
      await loadProfile()
      await refreshUserData()
      api.success('用户已登录')
    }
  }

  async function register() {
    await run('用户注册', () => authService.register({ mobile, password, nickname }))
    await login()
  }

  async function loadCategories() {
    const data = await run<Category[]>('分类列表', () => productService.listCategories())
    setCategories(data ?? [])
  }

  async function loadProducts(nextCategoryId = categoryId) {
    setLoading(true)
    const data = await run<{ list?: ProductListItem[] }>('商品列表', () =>
      productService.listProducts({
        keyword: keyword || undefined,
        category_id: nextCategoryId,
      }),
    )
    setProducts(data?.list ?? [])
    setLoading(false)
  }

  async function openProduct(productId: number) {
    const data = await run<ProductDetail>('商品详情', () => productService.getProduct(productId))
    if (data) {
      setSelectedProduct(data)
      setSelectedSkuId(data.skus[0]?.id)
      setPostProductIds(String(data.id))
    }
  }

  async function loadAddresses() {
    if (!authService.hasToken()) return
    const data = await run<Address[]>('地址列表', () => addressService.listAddresses())
    const list = data ?? []
    setAddresses(list)
    if (!selectedAddressId && list[0]) setSelectedAddressId(list[0].id)
  }

  async function createAddress() {
    const data = await run<Address>('新增地址', () =>
      addressService.createAddress({
        receiver_name: receiverName,
        receiver_mobile: receiverMobile,
        province: '广东省',
        city: '广州市',
        district: '天河区',
        detail_address: detailAddress,
        is_default: addresses.length === 0,
      }),
    )
    if (data) {
      setSelectedAddressId(data.id)
      await loadAddresses()
    }
  }

  async function loadCart() {
    if (!authService.hasToken()) return
    const data = await run<CartItem[]>('购物车', () => orderService.listCart())
    setCart(data ?? [])
  }

  async function addCart() {
    if (!selectedSku) return
    const data = await run<CartItem[]>('加入购物车', () =>
      orderService.addCartItem({ sku_id: selectedSku.id, quantity }),
    )
    if (data) setCart(data)
  }

  async function changeCartQuantity(item: CartItem, nextQuantity: number) {
    const data = await run<CartItem[]>('修改购物车数量', () =>
      orderService.updateCartItem(item.sku_id, { quantity: nextQuantity, checked: item.checked }),
    )
    if (data) setCart(data)
  }

  async function removeCartItem(item: CartItem) {
    const data = await run<CartItem[]>('移出购物车', () => orderService.deleteCartItem(item.sku_id))
    if (data) setCart(data)
  }

  async function loadCoupons() {
    const data = await run<CouponTemplate[]>('可领优惠券', () => promotionService.listCoupons())
    setCoupons(data ?? [])
  }

  async function loadMyCoupons() {
    if (!authService.hasToken()) return
    const data = await run<UserCoupon[]>('我的优惠券', () => promotionService.listMyCoupons())
    const list = data ?? []
    setMyCoupons(list)
    const usable = list.find((coupon) => coupon.status === 'unused')
    if (!selectedUserCouponId && usable) setSelectedUserCouponId(usable.id)
    if (selectedUserCouponId && !list.some((coupon) => coupon.id === selectedUserCouponId && coupon.status === 'unused')) {
      setSelectedUserCouponId(undefined)
    }
  }

  async function claimCoupon(couponId: number) {
    await run('领取优惠券', () => promotionService.claimCoupon(couponId))
    await loadMyCoupons()
  }

  async function checkout() {
    const data = await run<CheckoutResult>('结算预览', () =>
      orderService.checkout({ coupon_id: selectedUserCouponId ?? null }),
    )
    if (data) setCheckoutPreview(data)
  }

  async function createOrder() {
    if (!profile) {
      api.warning('请先登录用户账号')
      return
    }
    if (!selectedAddressId) {
      api.warning('请先新增或选择收货地址')
      return
    }
    if (cart.filter((item) => item.checked).length === 0) {
      api.warning('购物车没有已选商品，请先加入购物车')
      return
    }
    const data = await run<{ payment_id?: number; order_ids?: number[] }>('提交订单', () =>
      orderService.createOrder({
        client_order_token: randomToken('order'),
        shipping_address_id: selectedAddressId ?? null,
        coupon_id: selectedUserCouponId ?? null,
        source_post_id: selectedPost?.type === 'grass' ? selectedPost.id : null,
      }),
    )
    if (data?.payment_id) setPaymentId(data.payment_id)
    if (data?.order_ids?.[0]) setSelectedOrderId(data.order_ids[0])
    await loadOrders()
    await loadCart()
  }

  async function payOrder() {
    if (!paymentId) return
    await run('模拟支付', () => orderService.pay(paymentId))
    await loadOrders()
  }

  async function loadOrders() {
    if (!authService.hasToken()) return
    const data = await run<{ list?: Order[] }>('我的订单', () => orderService.listOrders())
    const list = data?.list ?? []
    setOrders(list)
    if (!selectedOrderId && list[0]) {
      setSelectedOrderId(list[0].id)
      setPaymentId(list[0].payment_id)
    }
  }

  async function confirmOrder(orderId: number) {
    await run('确认收货', () => orderService.confirmOrder(orderId))
    await loadOrders()
  }

  async function reviewSelectedOrder() {
    if (!selectedOrder?.items[0]) return
    await run('发表评价', () =>
      orderService.reviewOrder(selectedOrder.id, {
        product_id: selectedOrder.items[0].product_id,
        score: 5,
        content: '商品符合预期，测试评价。',
      }),
    )
  }

  async function refundSelectedOrder() {
    if (!selectedOrder) return
    await run('申请售后', () =>
      orderService.applyRefund(selectedOrder.id, {
        reason_type: 'other',
        reason: '测试售后申请',
        refund_amount_cent: selectedOrder.pay_amount_cent,
      }),
    )
  }

  async function loadPosts() {
    const data = await run<{ list?: CommunityPost[] }>('社区帖子', () => communityService.listPosts())
    setPosts(data?.list ?? [])
  }

  async function openPost(post: CommunityPost) {
    setSelectedPost(post)
    const data = await run<{ list?: CommunityComment[] }>('帖子评论', () => communityService.listComments(post.id))
    setComments(data?.list ?? [])
  }

  async function createPost(type: 'normal' | 'grass') {
    await run(type === 'grass' ? '发布种草帖' : '发布普通帖', () =>
      communityService.createPost({
        type,
        title: postTitle,
        content: postContent,
        product_ids: splitIds(postProductIds),
        topic_tags: ['体验'],
        image_urls: postImages,
      }),
    )
    await loadPosts()
  }

  async function commentPost(postId: number) {
    await run('发表评论', () => communityService.createComment(postId, commentContent))
    await openPost(selectedPost as CommunityPost)
  }

  async function uploadPostImage(file: File) {
    const data = await run<{ url: string }>('上传帖子图片', () => uploadService.uploadImage(file))
    if (data?.url) setPostImages((items) => [...items, data.url])
    return false
  }

  async function refreshUserData() {
    setSelectedAddressId(undefined)
    setSelectedOrderId(undefined)
    setPaymentId(undefined)
    setSelectedUserCouponId(undefined)
    setCheckoutPreview(null)
    await Promise.all([loadCart(), loadOrders(), loadAddresses(), loadMyCoupons()])
  }

  async function logout() {
    await run('用户登出', () => authService.logout())
    setProfile(null)
    setCart([])
    setOrders([])
    setAddresses([])
    setMyCoupons([])
    setSelectedAddressId(undefined)
    setSelectedOrderId(undefined)
    setPaymentId(undefined)
    setSelectedUserCouponId(undefined)
    setCheckoutPreview(null)
    api.success('用户已退出登录')
  }

  useEffect(() => {
    void loadProducts(categoryId)
  }, [categoryId])

  useEffect(() => {
    void loadCategories()
    void loadCoupons()
    void loadPosts()
    void loadProfile()
    void loadCart()
    void loadOrders()
    void loadAddresses()
    void loadMyCoupons()
  }, [])

  const uploadFiles: UploadFile[] = postImages.map((url, index) => ({
    uid: `${index}`,
    name: url.split('/').pop() || `image-${index}`,
    status: 'done',
    url: absoluteAssetUrl(url),
  }))

  return (
    <main className="shop-page">
      {contextHolder}
      <section className="shop-hero">
        <div>
          <Text className="eyebrow">社交新零售电商平台</Text>
          <Title level={1}>一次买够 It's Mygo</Title>
          <Paragraph>浏览商品、领取优惠券、加入购物车、模拟支付、确认收货，并在社区分享种草内容。</Paragraph>
          <Space size={16} wrap>
            <Statistic title="商品" value={products.length} />
            <Statistic title="购物车件数" value={cart.reduce((total, item) => total + item.quantity, 0)} />
            <Statistic title="订单" value={orders.length} />
          </Space>
        </div>
        <Card className="login-card" title={profile ? '当前用户' : '用户登录 / 注册'}>
          {profile ? (
            <Descriptions size="small" column={1}>
              <Descriptions.Item label="昵称">{profile.nickname}</Descriptions.Item>
              <Descriptions.Item label="手机">{profile.mobile}</Descriptions.Item>
              <Descriptions.Item label="积分">{profile.points}</Descriptions.Item>
            </Descriptions>
          ) : null}
          <Space direction="vertical" style={{ width: '100%' }}>
            <Input value={mobile} onChange={(event) => setMobile(event.target.value)} placeholder="手机号" />
            <Input.Password value={password} onChange={(event) => setPassword(event.target.value)} placeholder="密码" />
            <Input value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder="昵称" />
            <Space wrap>
              <Button type="primary" onClick={login}>登录</Button>
              <Button onClick={register}>注册并登录</Button>
              <Button onClick={loadProfile}>刷新用户</Button>
              <Button danger disabled={!profile} onClick={logout}>退出登录</Button>
            </Space>
          </Space>
        </Card>
      </section>

      <Row gutter={[24, 24]}>
        <Col span={24}>
          <Card className="category-card">
            <Space size={[12, 12]} wrap>
              <Button
                type={categoryId === undefined ? 'primary' : 'default'}
                onClick={() => setCategoryId(undefined)}
              >
                全部
              </Button>
              {categoryTree.map((category) => (
                <Button
                  key={category.id}
                  type={categoryId === category.id ? 'primary' : 'default'}
                  onClick={() => setCategoryId(category.id)}
                >
                  #{category.id} {category.label}
                </Button>
              ))}
            </Space>
          </Card>
        </Col>

        <Col span={16}>
          <Card
            title="商品商城"
            extra={
              <Space>
                <Input.Search
                  allowClear
                  placeholder="搜索商品"
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  onSearch={() => loadProducts()}
                />
                <Button onClick={() => loadProducts()}>刷新</Button>
              </Space>
            }
          >
            <Skeleton loading={loading} active>
              {products.length === 0 ? (
                <Empty description="暂无商品，请先在商家端上传商品" />
              ) : (
                <Row gutter={[16, 16]}>
                  {products.map((product) => (
                    <Col span={8} key={product.id}>
                      <Card
                        hoverable
                        className="product-card"
                        cover={
                          product.cover_url ? (
                            <Image preview={false} src={absoluteAssetUrl(product.cover_url)} />
                          ) : (
                            <div className="product-cover">商品图</div>
                          )
                        }
                        actions={[<Button type="link" onClick={() => openProduct(product.id)}>查看详情</Button>]}
                      >
                        <Space direction="vertical" size={6}>
                          <Space wrap>
                            <Tag color="blue">商品 #{product.id}</Tag>
                            <Tag>店铺 #{product.merchant_id}</Tag>
                          </Space>
                          <Text strong>{product.name}</Text>
                          <Text type="secondary">{product.merchant_name}</Text>
                          <Text className="price">￥{yuan(product.price_cent)}</Text>
                        </Space>
                      </Card>
                    </Col>
                  ))}
                </Row>
              )}
            </Skeleton>
          </Card>

          <Card title="社区广场" className="section-card">
            <Row gutter={[16, 16]}>
              {posts.map((post) => (
                <Col span={8} key={post.id}>
                  <Card
                    hoverable
                    className="post-card"
                    cover={
                      post.image_urls[0] ? (
                        <Image preview={false} src={absoluteAssetUrl(post.image_urls[0])} />
                      ) : (
                        <div className="post-cover">{statusText(post.type)}</div>
                      )
                    }
                    onClick={() => openPost(post)}
                  >
                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                      <Space>
                        <Tag color={post.type === 'grass' ? 'purple' : 'blue'}>{statusText(post.type)}</Tag>
                        <Tag color={statusColor(post.status)}>{statusText(post.status)}</Tag>
                      </Space>
                      <Text strong>{post.title}</Text>
                      <Paragraph ellipsis={{ rows: 2 }}>{post.content}</Paragraph>
                      <div className="linked-products">
                        关联商品：{post.product_ids.length ? post.product_ids.map((id) => `#${id}`).join('、') : '无'}
                      </div>
                      <Space split={<Divider type="vertical" />}>
                        <Text>赞 {post.like_count}</Text>
                        <Text>评 {post.comment_count}</Text>
                      </Space>
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
            {posts.length === 0 ? <Empty description="暂无社区内容" /> : null}
            <Divider />
            <Card size="small" title="发布社区内容">
              <Row gutter={[12, 12]}>
                <Col span={8}><Input value={postTitle} onChange={(event) => setPostTitle(event.target.value)} placeholder="标题" /></Col>
                <Col span={8}><Input value={postProductIds} onChange={(event) => setPostProductIds(event.target.value)} placeholder="关联商品 ID，逗号分隔" /></Col>
                <Col span={8}>
                  <Upload
                    fileList={uploadFiles}
                    beforeUpload={(file) => uploadPostImage(file)}
                    onRemove={(file) => {
                      setPostImages((items) => items.filter((item) => absoluteAssetUrl(item) !== file.url))
                      return true
                    }}
                  >
                    <Button>上传帖子图片</Button>
                  </Upload>
                </Col>
                <Col span={24}><Input.TextArea rows={3} value={postContent} onChange={(event) => setPostContent(event.target.value)} /></Col>
                <Col span={24}>
                  <Space>
                    <Button onClick={() => createPost('normal')}>发布普通帖</Button>
                    <Button type="primary" onClick={() => createPost('grass')}>发布种草帖</Button>
                    <Button onClick={loadPosts}>刷新帖子</Button>
                  </Space>
                </Col>
              </Row>
            </Card>
          </Card>
        </Col>

        <Col span={8}>
          <Space direction="vertical" size={24} style={{ width: '100%' }}>
            <Card title="购物车">
              <List
                dataSource={cart}
                locale={{ emptyText: '购物车为空' }}
                renderItem={(item) => (
                  <List.Item
                    actions={[
                      <InputNumber
                        min={1}
                        value={item.quantity}
                        onChange={(value) => changeCartQuantity(item, Number(value) || 1)}
                      />,
                      <Button danger type="link" onClick={() => removeCartItem(item)}>移除</Button>,
                    ]}
                  >
                    <List.Item.Meta
                      title={item.product_name}
                      description={`${item.sku_name} / SKU #${item.sku_id}`}
                    />
                    <Text>￥{yuan(item.price_cent * item.quantity)}</Text>
                  </List.Item>
                )}
              />
              <Divider />
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text strong>购物车合计：￥{yuan(cartTotal)}</Text>
                <Select
                  allowClear
                  placeholder="选择我的优惠券"
                  style={{ width: '100%' }}
                  value={selectedUserCouponId}
                  onChange={setSelectedUserCouponId}
                  options={[
                    { value: undefined, label: '不使用优惠券' },
                    ...availableUserCoupons.map((coupon) => ({
                      value: coupon.id,
                      label: `#${coupon.id} ${coupon.template.name}（${statusText(coupon.status)}）`,
                    })),
                  ]}
                />
                <Space wrap>
                  <Button onClick={loadCart}>刷新购物车</Button>
                  <Button onClick={checkout}>结算预览</Button>
                  <Button type="primary" onClick={createOrder}>提交订单</Button>
                </Space>
                {checkoutPreview ? (
                  <Descriptions size="small" column={1}>
                    <Descriptions.Item label="商品合计">￥{yuan(checkoutPreview.total_amount_cent)}</Descriptions.Item>
                    <Descriptions.Item label="优惠">￥{yuan(checkoutPreview.discount_amount_cent)}</Descriptions.Item>
                    <Descriptions.Item label="应付">￥{yuan(checkoutPreview.pay_amount_cent)}</Descriptions.Item>
                  </Descriptions>
                ) : null}
              </Space>
            </Card>

            <Card title="收货地址">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Input value={receiverName} onChange={(event) => setReceiverName(event.target.value)} placeholder="收货人" />
                <Input value={receiverMobile} onChange={(event) => setReceiverMobile(event.target.value)} placeholder="手机号" />
                <Input value={detailAddress} onChange={(event) => setDetailAddress(event.target.value)} placeholder="详细地址" />
                <Button onClick={createAddress}>新增地址</Button>
                <Select
                  placeholder="选择地址"
                  value={selectedAddressId}
                  onChange={setSelectedAddressId}
                  options={addresses.map((address) => ({
                    value: address.id,
                    label: `#${address.id} ${address.receiver_name} ${address.city}${address.detail_address}`,
                  }))}
                />
              </Space>
            </Card>

            <Card title="优惠券">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space wrap>
                  <Button onClick={loadCoupons}>刷新可领</Button>
                  <Button onClick={loadMyCoupons}>刷新我的</Button>
                </Space>
                {coupons.map((coupon) => (
                  <Card size="small" key={coupon.id}>
                    <Space direction="vertical">
                      <Text strong>{coupon.name}</Text>
                      <Text>满 ￥{yuan(coupon.min_amount_cent)} 减 ￥{yuan(coupon.discount_value)}</Text>
                      <Button type="primary" onClick={() => claimCoupon(coupon.id)}>领取</Button>
                    </Space>
                  </Card>
                ))}
              </Space>
            </Card>
          </Space>
        </Col>

        <Col span={24}>
          <Card title="我的订单">
            <List
              grid={{ gutter: 16, column: 3 }}
              dataSource={orders}
              locale={{ emptyText: '暂无订单' }}
              renderItem={(order) => (
                <List.Item>
                  <Card
                    className={selectedOrderId === order.id ? 'selected-order-card' : ''}
                    onClick={() => {
                      setSelectedOrderId(order.id)
                      setPaymentId(order.payment_id)
                    }}
                  >
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Space wrap>
                        <Tag color="blue">订单 #{order.id}</Tag>
                        <Tag>支付单 #{order.payment_id}</Tag>
                        <Badge color={statusColor(order.status)} text={statusText(order.status)} />
                      </Space>
                      <Text strong>{order.order_no}</Text>
                      <Text>{order.items.map((item) => `${item.product_name} x${item.quantity}`).join('、')}</Text>
                      <Text className="price">￥{yuan(order.pay_amount_cent)}</Text>
                      {order.logistics_company ? <Text type="secondary">物流：{order.logistics_company} / {order.tracking_no}</Text> : null}
                      <Space wrap>
                        <Button type="primary" disabled={order.status !== 'shipping'} onClick={() => confirmOrder(order.id)}>确认收货</Button>
                        <Button disabled={order.status !== 'completed'} onClick={reviewSelectedOrder}>评价</Button>
                        <Button disabled={!['shipping', 'pending_receipt', 'completed'].includes(order.status)} onClick={refundSelectedOrder}>售后</Button>
                      </Space>
                    </Space>
                  </Card>
                </List.Item>
              )}
            />
            <Divider />
            <Space>
              <InputNumber value={paymentId} onChange={(value) => setPaymentId(Number(value) || undefined)} placeholder="支付单 ID" />
              <Button type="primary" onClick={payOrder}>模拟支付</Button>
              <Button onClick={loadOrders}>刷新订单</Button>
            </Space>
          </Card>
        </Col>
      </Row>

      <Drawer
        open={!!selectedProduct}
        width={980}
        title="商品详情"
        onClose={() => setSelectedProduct(null)}
      >
        {selectedProduct ? (
          <Row gutter={[24, 24]} className="product-detail-layout">
            <Col span={11}>
              <Image
                className="detail-image"
                src={absoluteAssetUrl(selectedProduct.cover_url || selectedProduct.images[0])}
                fallback=""
                preview={false}
              />
              <Card size="small" title="评价区" className="section-card">
                <Text type="secondary">评价接口已支持，商品详情页后续可继续扩展评价列表。</Text>
              </Card>
            </Col>
            <Col span={13}>
              <Space direction="vertical" size={18} style={{ width: '100%' }}>
                <Space wrap>
                  <Tag color="blue">商品 #{selectedProduct.id}</Tag>
                  <Tag>店铺 #{selectedProduct.merchant.id}</Tag>
                  <Tag>分类 #{selectedProduct.category_id ?? '-'}</Tag>
                </Space>
                <Title level={2}>{selectedProduct.name}</Title>
                <Paragraph>{selectedProduct.description || '暂无描述'}</Paragraph>
                <Text className="detail-price">￥{yuan(selectedSku?.price_cent)}</Text>
                <div className="sku-grid">
                  {selectedProduct.skus.map((sku) => (
                    <Button
                      key={sku.id}
                      type={selectedSkuId === sku.id ? 'primary' : 'default'}
                      onClick={() => setSelectedSkuId(sku.id)}
                    >
                      {sku.name} / SKU #{sku.id} / 库存 {sku.stock}
                    </Button>
                  ))}
                </div>
                <Space>
                  <InputNumber min={1} value={quantity} onChange={(value) => setQuantity(Number(value) || 1)} />
                  <Button type="primary" size="large" onClick={addCart}>加入购物车</Button>
                </Space>
              </Space>
            </Col>
          </Row>
        ) : null}
      </Drawer>

      <Modal
        open={!!selectedPost}
        title={selectedPost?.title}
        onCancel={() => setSelectedPost(null)}
        footer={null}
        width={760}
      >
        {selectedPost ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Space>
              <Tag color={selectedPost.type === 'grass' ? 'purple' : 'blue'}>{statusText(selectedPost.type)}</Tag>
              <Tag color={statusColor(selectedPost.status)}>{statusText(selectedPost.status)}</Tag>
              <Text type="secondary">作者：{selectedPost.author?.nickname || '匿名'}</Text>
            </Space>
            <Paragraph>{selectedPost.content}</Paragraph>
            {selectedPost.image_urls.length ? (
              <Image.PreviewGroup>
                <Space wrap>{selectedPost.image_urls.map((url) => <Image width={120} key={url} src={absoluteAssetUrl(url)} />)}</Space>
              </Image.PreviewGroup>
            ) : null}
            <div className="linked-products">关联商品：{selectedPost.product_ids.map((id) => `#${id}`).join('、') || '无'}</div>
            <Space>
              <Button onClick={() => communityService.likePost(selectedPost.id).then(() => loadPosts())}>点赞</Button>
            </Space>
            <Divider />
            <List
              header="评论"
              dataSource={comments}
              locale={{ emptyText: '暂无评论' }}
              renderItem={(comment) => (
                <List.Item>
                  <List.Item.Meta title={comment.author?.nickname || '匿名'} description={comment.content} />
                </List.Item>
              )}
            />
            <Space.Compact style={{ width: '100%' }}>
              <Input value={commentContent} onChange={(event) => setCommentContent(event.target.value)} placeholder="写评论" />
              <Button type="primary" onClick={() => commentPost(selectedPost.id)}>发送</Button>
            </Space.Compact>
          </Space>
        ) : null}
      </Modal>

      <ApiHistory results={apiHistory} />
    </main>
  )
}
