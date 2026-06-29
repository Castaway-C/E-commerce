import { useEffect, useMemo, useState } from 'react'
import { addressService, type Address } from '../../services/address'
import { authService, type UserProfile } from '../../services/auth'
import { communityService, type CommunityPost } from '../../services/community'
import { orderService, type CartItem, type CheckoutResult, type Order } from '../../services/order'
import { productService, type ProductDetail, type ProductListItem } from '../../services/product'
import { promotionService, type CouponTemplate, type UserCoupon } from '../../services/promotion'

type ApiResult = {
  title: string
  ok: boolean
  data: unknown
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

function newMobile() {
  return `137${String(Date.now()).slice(-8)}`
}

function randomToken(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`
}

function statusText(status?: string) {
  const map: Record<string, string> = {
    pending_payment: '待支付',
    paid: '待发货',
    shipped: '待收货',
    completed: '已完成',
    cancelled: '已取消',
    pending_audit: '待审核',
    approved: '已通过',
    rejected: '已拒绝',
    hidden: '已隐藏',
    active: '可用',
    used: '已使用',
    expired: '已过期',
  }
  return status ? map[status] ?? status : '-'
}

function DataPanel({ result }: { result: ApiResult | null }) {
  return (
    <details className="debug-panel">
      <summary>接口返回排查</summary>
      {result ? (
        <pre>{JSON.stringify(result, null, 2)}</pre>
      ) : (
        <p className="muted">正常使用时不用看这里。接口报错或数据异常时，可展开查看最近一次请求结果。</p>
      )}
    </details>
  )
}

export function UserTestConsolePage() {
  const [lastResult, setLastResult] = useState<ApiResult | null>(null)
  const [mobile, setMobile] = useState(newMobile())
  const [password, setPassword] = useState('12345678')
  const [nickname, setNickname] = useState('测试用户')
  const [profile, setProfile] = useState<UserProfile | null>(null)

  const [keyword, setKeyword] = useState('')
  const [products, setProducts] = useState<ProductListItem[]>([])
  const [selectedProduct, setSelectedProduct] = useState<ProductDetail | null>(null)
  const [selectedSkuId, setSelectedSkuId] = useState('')
  const [quantity, setQuantity] = useState('1')

  const [addresses, setAddresses] = useState<Address[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState('')
  const [receiverName, setReceiverName] = useState('测试收货人')
  const [receiverMobile, setReceiverMobile] = useState(mobile)
  const [detailAddress, setDetailAddress] = useState('测试路 1 号')

  const [cart, setCart] = useState<CartItem[]>([])
  const [checkoutPreview, setCheckoutPreview] = useState<CheckoutResult | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrderId, setSelectedOrderId] = useState('')
  const [paymentId, setPaymentId] = useState('')

  const [coupons, setCoupons] = useState<CouponTemplate[]>([])
  const [myCoupons, setMyCoupons] = useState<UserCoupon[]>([])
  const [selectedUserCouponId, setSelectedUserCouponId] = useState('')

  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [selectedPostId, setSelectedPostId] = useState('')
  const [postTitle, setPostTitle] = useState('我的购物体验')
  const [postContent, setPostContent] = useState('这是一条用于测试社区流程的内容。')
  const [postProductIds, setPostProductIds] = useState('')
  const [commentContent, setCommentContent] = useState('这是一条测试评论。')

  const selectedSku = useMemo(() => {
    return selectedProduct?.skus.find((sku) => String(sku.id) === selectedSkuId) ?? selectedProduct?.skus[0]
  }, [selectedProduct, selectedSkuId])

  const selectedOrder = useMemo(() => {
    return orders.find((order) => String(order.id) === selectedOrderId) ?? null
  }, [orders, selectedOrderId])

  async function run(title: string, action: () => Promise<unknown>) {
    try {
      const response = await action()
      const data = pickData(response)
      setLastResult({ title, ok: true, data })
      return data
    } catch (error) {
      const data = formatError(error)
      setLastResult({ title, ok: false, data })
      return null
    }
  }

  async function loadProfile() {
    const data = await run('读取当前用户', () => authService.profile())
    if (data) setProfile(data as UserProfile)
  }

  async function login() {
    await run('用户登录', () => authService.login({ account: mobile, password }))
    await loadProfile()
  }

  async function register() {
    await run('用户注册', () => authService.register({ mobile, password, nickname }))
    await login()
  }

  async function loadProducts() {
    const response = await run('商品列表', () => productService.listProducts())
    const page = response as { list?: ProductListItem[] } | null
    const nextProducts = page?.list ?? []
    const filtered = keyword
      ? nextProducts.filter((product) => product.name.includes(keyword) || product.merchant_name.includes(keyword))
      : nextProducts
    setProducts(filtered)
  }

  async function openProduct(productId: number) {
    const data = await run('商品详情', () => productService.getProduct(productId))
    if (data) {
      const detail = data as ProductDetail
      setSelectedProduct(detail)
      setPostProductIds(String(detail.id))
      if (detail.skus[0]) setSelectedSkuId(String(detail.skus[0].id))
    }
  }

  async function loadAddresses() {
    const data = await run('地址列表', () => addressService.listAddresses())
    const list = (data as Address[] | null) ?? []
    setAddresses(list)
    if (!selectedAddressId && list[0]) setSelectedAddressId(String(list[0].id))
  }

  async function createAddress() {
    const data = await run('新增地址', () =>
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
      setSelectedAddressId(String((data as Address).id))
      await loadAddresses()
    }
  }

  async function loadCart() {
    const data = await run('购物车', () => orderService.listCart())
    setCart((data as CartItem[] | null) ?? [])
  }

  async function addCart() {
    if (!selectedSku) return
    await run('加入购物车', () =>
      orderService.addCartItem({ sku_id: selectedSku.id, quantity: Math.max(1, Number(quantity) || 1) }),
    )
    await loadCart()
  }

  async function loadCoupons() {
    const data = await run('可领取优惠券', () => promotionService.listCoupons())
    setCoupons((data as CouponTemplate[] | null) ?? [])
  }

  async function loadMyCoupons() {
    const data = await run('我的优惠券', () => promotionService.listMyCoupons())
    const list = (data as UserCoupon[] | null) ?? []
    setMyCoupons(list)
    if (!selectedUserCouponId && list[0]) setSelectedUserCouponId(String(list[0].id))
  }

  async function claimCoupon(couponId: number) {
    await run('领取优惠券', () => promotionService.claimCoupon(couponId))
    await loadMyCoupons()
  }

  async function checkout() {
    const data = await run('结算预览', () => orderService.checkout())
    if (data) setCheckoutPreview(data as CheckoutResult)
  }

  async function createOrder() {
    const data = await run('提交订单', () =>
      orderService.createOrder({
        client_order_token: randomToken('order'),
        shipping_address_id: selectedAddressId ? Number(selectedAddressId) : null,
        coupon_id: selectedUserCouponId ? Number(selectedUserCouponId) : null,
        source_post_id: selectedPostId ? Number(selectedPostId) : null,
      }),
    )
    const result = data as { payment_id?: number; order_ids?: number[] } | null
    if (result?.payment_id) setPaymentId(String(result.payment_id))
    if (result?.order_ids?.[0]) setSelectedOrderId(String(result.order_ids[0]))
    await loadOrders()
    await loadCart()
  }

  async function payOrder() {
    if (!paymentId) return
    await run('模拟支付', () => orderService.pay(Number(paymentId)))
    await loadOrders()
  }

  async function loadOrders() {
    const data = await run('我的订单', () => orderService.listOrders())
    const list = ((data as { list?: Order[] } | null)?.list ?? []) as Order[]
    setOrders(list)
    if (!selectedOrderId && list[0]) setSelectedOrderId(String(list[0].id))
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
    const data = await run('社区帖子', () => communityService.listPosts())
    const list = ((data as { list?: CommunityPost[] } | null)?.list ?? []) as CommunityPost[]
    setPosts(list)
    if (!selectedPostId && list[0]) setSelectedPostId(String(list[0].id))
  }

  async function createPost(type: 'normal' | 'grass') {
    await run(type === 'grass' ? '发布种草帖' : '发布普通帖', () =>
      communityService.createPost({
        type,
        title: postTitle,
        content: postContent,
        product_ids: splitIds(postProductIds),
        topic_tags: ['测试'],
        image_urls: [],
      }),
    )
    await loadPosts()
  }

  async function commentPost(postId: number) {
    await run('发表评论', () => communityService.createComment(postId, commentContent))
    await loadPosts()
  }

  useEffect(() => {
    void loadProducts()
    void loadCoupons()
    void loadPosts()
  }, [])

  return (
    <main className="shop-page">
      <header className="page-header">
        <div className="hero-copy">
          <p className="eyebrow">一次买够 It's Mygo</p>
          <h1>一次买够用户端</h1>
          <p>用于按真实购物习惯联调：浏览商品、加购、下单、支付、收货、评价售后和社区互动。</p>
          <div className="hero-stats">
            <div>
              <strong>{products.length}</strong>
              <span>可浏览商品</span>
            </div>
            <div>
              <strong>{cart.reduce((total, item) => total + item.quantity, 0)}</strong>
              <span>购物车件数</span>
            </div>
            <div>
              <strong>{orders.length}</strong>
              <span>我的订单</span>
            </div>
          </div>
        </div>
        <section className="account-card">
          <h2>当前用户</h2>
          {profile ? (
            <div className="info-list">
              <span>用户：{profile.nickname}</span>
              <span>手机：{profile.mobile}</span>
              <span>积分：{profile.points}</span>
            </div>
          ) : (
            <p className="muted">未登录，先注册或登录后再测试购物流程。</p>
          )}
          <div className="compact-form">
            <input value={mobile} onChange={(event) => setMobile(event.target.value)} placeholder="手机号" />
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="密码"
              type="password"
            />
            <input value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder="昵称" />
          </div>
          <div className="button-row">
            <button onClick={login}>登录</button>
            <button onClick={register}>注册并登录</button>
            <button onClick={loadProfile}>刷新用户</button>
          </div>
        </section>
      </header>

      <div className="shop-layout">
        <section className="content-column">
          <section className="panel">
            <div className="section-title">
              <div>
                <h2>商品浏览</h2>
                <p>商品信息直接显示在列表中，选择商品后可查看 SKU 并加入购物车。</p>
              </div>
              <div className="inline-tools">
                <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="按商品/店铺筛选" />
                <button onClick={loadProducts}>刷新商品</button>
              </div>
            </div>
            <div className="product-grid">
              {products.map((product) => (
                <article className="product-card" key={product.id}>
                  <div className="placeholder-image">商品图</div>
                  <div className="product-meta">
                    <span>商品 #{product.id}</span>
                    <span>店铺 #{product.merchant_id}</span>
                  </div>
                  <h3>{product.name}</h3>
                  <p>{product.merchant_name}</p>
                  <strong>￥{yuan(product.price_cent)}</strong>
                  <span className="muted">销量 {product.sales_count}</span>
                  <button onClick={() => openProduct(product.id)}>查看并选择</button>
                </article>
              ))}
              {products.length === 0 ? <p className="muted">暂无商品。请先在商家运营或平台运营创建并上架商品。</p> : null}
            </div>

            {selectedProduct ? (
              <div className="detail-panel">
                <div>
                  <h3>{selectedProduct.name}</h3>
                  <p>{selectedProduct.description || '暂无描述'}</p>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>选择</th>
                        <th>规格</th>
                        <th>价格</th>
                        <th>库存</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedProduct.skus.map((sku) => (
                  <tr key={sku.id}>
                          <td>
                            <input
                              checked={selectedSkuId === String(sku.id)}
                              name="sku"
                              onChange={() => setSelectedSkuId(String(sku.id))}
                              type="radio"
                            />
                          </td>
                          <td>{sku.name} <span className="id-pill">SKU #{sku.id}</span></td>
                          <td>￥{yuan(sku.price_cent)}</td>
                          <td>{sku.stock}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="inline-tools">
                  <input value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="数量" />
                  <button onClick={addCart}>加入购物车</button>
                </div>
              </div>
            ) : null}
          </section>

          <section className="panel">
            <div className="section-title">
              <div>
                <h2>购物车与结算</h2>
                <p>先确认购物车和地址，再提交订单。优惠券按“我的优惠券”选择。</p>
              </div>
              <div className="button-row">
                <button onClick={loadCart}>刷新购物车</button>
                <button onClick={checkout}>结算预览</button>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>商品</th>
                    <th>规格</th>
                    <th>单价</th>
                    <th>数量</th>
                    <th>状态</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item) => (
                    <tr key={item.sku_id}>
                      <td>{item.product_name}</td>
                      <td>{item.sku_name}</td>
                      <td>￥{yuan(item.price_cent)}</td>
                      <td>{item.quantity}</td>
                      <td>{item.invalid_reason || (item.checked ? '已选中' : '未选中')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {checkoutPreview ? (
              <div className="summary-line">
                <span>商品合计：￥{yuan(checkoutPreview.total_amount_cent)}</span>
                <span>优惠：￥{yuan(checkoutPreview.discount_amount_cent)}</span>
                <strong>应付：￥{yuan(checkoutPreview.pay_amount_cent)}</strong>
              </div>
            ) : null}
            <div className="checkout-row">
              <label>
                收货地址
                <select value={selectedAddressId} onChange={(event) => setSelectedAddressId(event.target.value)}>
                  <option value="">请选择地址</option>
                  {addresses.map((address) => (
                    <option key={address.id} value={address.id}>
                      {address.receiver_name} {address.city} {address.detail_address}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                优惠券
                <select value={selectedUserCouponId} onChange={(event) => setSelectedUserCouponId(event.target.value)}>
                  <option value="">不使用优惠券</option>
                  {myCoupons.map((coupon) => (
                    <option key={coupon.id} value={coupon.id}>
                      {coupon.template.name}（{statusText(coupon.status)}）
                    </option>
                  ))}
                </select>
              </label>
              <button onClick={createOrder}>提交订单</button>
            </div>
            <div className="checkout-row">
              <input value={paymentId} onChange={(event) => setPaymentId(event.target.value)} placeholder="支付单 ID" />
              <button onClick={payOrder}>模拟支付</button>
            </div>
          </section>

          <section className="panel">
            <div className="section-title">
              <div>
                <h2>我的订单</h2>
                <p>商家发货后，用户在这里确认收货；完成后可评价或发起售后。</p>
              </div>
              <button onClick={loadOrders}>刷新订单</button>
            </div>
            <div className="order-list">
              {orders.map((order) => (
                <article
                  className={`order-card ${selectedOrderId === String(order.id) ? 'selected' : ''}`}
                  key={order.id}
                  onClick={() => {
                    setSelectedOrderId(String(order.id))
                    setPaymentId(String(order.payment_id))
                  }}
                >
                  <div>
                    <h3>{order.order_no}</h3>
                    <div className="product-meta">
                      <span>订单 #{order.id}</span>
                      <span>支付单 #{order.payment_id}</span>
                      <span>店铺 #{order.merchant_id}</span>
                    </div>
                    <p>{order.items.map((item) => `${item.product_name} x${item.quantity}`).join('、')}</p>
                    {order.logistics_company ? (
                      <p className="muted">
                        物流：{order.logistics_company} / {order.tracking_no}
                      </p>
                    ) : null}
                  </div>
                  <div className="order-side">
                    <strong>￥{yuan(order.pay_amount_cent)}</strong>
                    <span className="status-pill">{statusText(order.status)}</span>
                    {order.status === 'shipped' ? <button onClick={() => confirmOrder(order.id)}>确认收货</button> : null}
                  </div>
                </article>
              ))}
              {orders.length === 0 ? <p className="muted">暂无订单。</p> : null}
            </div>
            <div className="button-row">
              <button disabled={!selectedOrder} onClick={reviewSelectedOrder}>
                给选中订单评价
              </button>
              <button disabled={!selectedOrder} onClick={refundSelectedOrder}>
                给选中订单申请售后
              </button>
            </div>
          </section>
        </section>

        <aside className="side-column">
          <section className="panel">
            <div className="section-title">
              <h2>收货地址</h2>
              <button onClick={loadAddresses}>刷新</button>
            </div>
            <div className="compact-form">
              <input value={receiverName} onChange={(event) => setReceiverName(event.target.value)} placeholder="收货人" />
              <input
                value={receiverMobile}
                onChange={(event) => setReceiverMobile(event.target.value)}
                placeholder="手机号"
              />
              <input
                value={detailAddress}
                onChange={(event) => setDetailAddress(event.target.value)}
                placeholder="详细地址"
              />
              <button onClick={createAddress}>新增地址</button>
            </div>
            <div className="simple-list">
              {addresses.map((address) => (
                <button
                  className={selectedAddressId === String(address.id) ? 'list-row selected' : 'list-row'}
                  key={address.id}
                  onClick={() => setSelectedAddressId(String(address.id))}
                >
                  <span>{address.receiver_name}</span>
                  <small>地址 #{address.id} / {address.receiver_mobile}</small>
                  <small>
                    {address.city} {address.detail_address}
                  </small>
                </button>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="section-title">
              <h2>优惠券</h2>
              <div className="button-row">
                <button onClick={loadCoupons}>可领</button>
                <button onClick={loadMyCoupons}>我的</button>
              </div>
            </div>
            <div className="simple-list">
              {coupons.map((coupon) => (
                <article className="coupon-row" key={coupon.id}>
                  <div>
                    <strong>{coupon.name}</strong>
                    <span>券模板 #{coupon.id} / {statusText(coupon.status)}</span>
                    <span>满 ￥{yuan(coupon.min_amount_cent)} 减 ￥{yuan(coupon.discount_value)}</span>
                  </div>
                  <button onClick={() => claimCoupon(coupon.id)}>领取</button>
                </article>
              ))}
            </div>
            <div className="simple-list">
              {myCoupons.map((coupon) => (
                <button
                  className={selectedUserCouponId === String(coupon.id) ? 'list-row selected' : 'list-row'}
                  key={coupon.id}
                  onClick={() => setSelectedUserCouponId(String(coupon.id))}
                >
                  <span>{coupon.template.name}</span>
                  <small>我的券 #{coupon.id} / 模板 #{coupon.template.id}</small>
                  <small>{statusText(coupon.status)}</small>
                </button>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="section-title">
              <h2>社区</h2>
              <button onClick={loadPosts}>刷新帖子</button>
            </div>
            <div className="compact-form">
              <input value={postTitle} onChange={(event) => setPostTitle(event.target.value)} placeholder="标题" />
              <textarea value={postContent} onChange={(event) => setPostContent(event.target.value)} placeholder="内容" />
              <input
                value={postProductIds}
                onChange={(event) => setPostProductIds(event.target.value)}
                placeholder="关联商品 ID，多个用逗号"
              />
              <div className="button-row">
                <button onClick={() => createPost('normal')}>发普通帖</button>
                <button onClick={() => createPost('grass')}>发种草帖</button>
              </div>
            </div>
            <div className="simple-list">
              {posts.map((post) => (
                <article className={selectedPostId === String(post.id) ? 'post-row selected' : 'post-row'} key={post.id}>
                  <button className="plain-select" onClick={() => setSelectedPostId(String(post.id))}>
                    <strong>{post.title}</strong>
                    <span>帖子 #{post.id} / {post.type}</span>
                    <span>
                      {post.author?.nickname || '匿名'} / {statusText(post.status)} / 点赞 {post.like_count} / 评论{' '}
                      {post.comment_count}
                    </span>
                  </button>
                  <div className="button-row">
                    <button onClick={() => communityService.likePost(post.id).then(() => loadPosts())}>点赞</button>
                    <button onClick={() => commentPost(post.id)}>评论</button>
                  </div>
                </article>
              ))}
            </div>
            <textarea
              value={commentContent}
              onChange={(event) => setCommentContent(event.target.value)}
              placeholder="评论内容"
            />
          </section>
        </aside>
      </div>

      <DataPanel result={lastResult} />
    </main>
  )
}
