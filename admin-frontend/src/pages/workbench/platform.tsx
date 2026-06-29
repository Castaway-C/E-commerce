import { useEffect, useMemo, useState } from 'react'
import { http } from '../../services/http'
import {
  Empty,
  Field,
  Panel,
  ResultBoard,
  formatError,
  ids,
  pickData,
  randomText,
  statusText,
  type ApiResult,
  yuan,
  yuanToCent,
} from './shared'

type PageResult<T> = {
  list: T[]
  total: number
}

type Summary = {
  user_count: number
  product_count: number
  order_count: number
  paid_order_count: number
  gross_merchandise_cent: number
  pending_shipment_count: number
  after_sale_count: number
}

type UserItem = {
  id: number
  mobile: string
  nickname: string
  level: string
  points: number
  is_active: boolean
}

type AdminAccount = {
  id: number
  username: string
  real_name: string
  role: string
  merchant_id?: number | null
  is_active: boolean
}

type MerchantApplication = {
  id: number
  admin_id: number
  merchant_id?: number | null
  merchant_name: string
  announcement?: string | null
  status: string
  reject_reason?: string | null
}

type Category = {
  id: number
  name: string
  parent_id?: number | null
  sort_order: number
}

type Product = {
  id: number
  name: string
  description?: string
  category_id?: number | null
  status: string
  merchant: { id: number; name: string }
  skus: Array<{ id: number; name: string; price_cent: number; stock: number }>
}

type Coupon = {
  id: number
  name: string
  scope_type: string
  scope_ids?: number[]
  discount_value: number
  min_amount_cent: number
  status: string
  total_quantity: number
  claimed_quantity: number
}

type Post = {
  id: number
  title: string
  type: string
  status: string
  author?: { nickname: string }
  like_count: number
  comment_count: number
}

type Comment = {
  id: number
  post_id: number
  content: string
  status: string
  author?: { nickname: string }
}

type Order = {
  id: number
  order_no: string
  user_id: number
  merchant_id: number
  status: string
  pay_amount_cent: number
}

type Refund = {
  id: number
  order_id: number
  user_id: number
  refund_amount_cent: number
  reason_type: string
  reason: string
  status: string
}

type OperationLog = {
  id: number
  admin_id: number
  action: string
  resource_type: string
  resource_id?: number | null
  description: string
}

function asList<T>(data: unknown) {
  return ((data as PageResult<T> | null)?.list ?? []) as T[]
}

function directList<T>(data: unknown) {
  return ((data as T[] | null) ?? []) as T[]
}

function firstSku(product: Product | null) {
  return product?.skus[0] ?? null
}

export function PlatformWorkbenchPage() {
  const [lastResult, setLastResult] = useState<ApiResult>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [users, setUsers] = useState<UserItem[]>([])
  const [accounts, setAccounts] = useState<AdminAccount[]>([])
  const [applications, setApplications] = useState<MerchantApplication[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [refunds, setRefunds] = useState<Refund[]>([])
  const [logs, setLogs] = useState<OperationLog[]>([])

  const [keyword, setKeyword] = useState('')
  const [applicationStatus, setApplicationStatus] = useState('pending')
  const [rejectReason, setRejectReason] = useState('资料不完整')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [productKeyword, setProductKeyword] = useState('')
  const [productCategoryId, setProductCategoryId] = useState('')
  const [productMerchantId, setProductMerchantId] = useState('')
  const [categoryName, setCategoryName] = useState(randomText('分类'))
  const [categoryParentId, setCategoryParentId] = useState('')
  const [categorySortOrder, setCategorySortOrder] = useState('0')
  const [skuPriceYuan, setSkuPriceYuan] = useState('19.99')
  const [skuStock, setSkuStock] = useState('10')
  const [couponName, setCouponName] = useState(randomText('平台券'))
  const [couponScopeType, setCouponScopeType] = useState('all')
  const [couponScopeIds, setCouponScopeIds] = useState('')
  const [couponDiscountYuan, setCouponDiscountYuan] = useState('5.00')
  const [couponMinYuan, setCouponMinYuan] = useState('10.00')
  const [couponTotal, setCouponTotal] = useState('20')
  const [grantUserIds, setGrantUserIds] = useState('')
  const [shippingCompany, setShippingCompany] = useState('测试快递')
  const [trackingNo, setTrackingNo] = useState(randomText('LOG'))
  const [logAction, setLogAction] = useState('')

  const selectedSku = useMemo(() => firstSku(selectedProduct), [selectedProduct])

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

  async function loadSummary() {
    const data = await run('平台看板', () => http.get('/admin/dashboard/summary'))
    if (data) setSummary(data as Summary)
  }

  async function loadUsers() {
    const data = await run('用户列表', () => http.get('/admin/users', { params: { keyword: keyword || undefined } }))
    setUsers(asList<UserItem>(data))
  }

  async function loadAccounts() {
    const data = await run('后台账号', () => http.get('/admin/accounts'))
    setAccounts(asList<AdminAccount>(data))
  }

  async function loadApplications() {
    const data = await run('商家入驻申请', () =>
      http.get('/admin/merchant/applications', {
        params: { status: applicationStatus || undefined },
      }),
    )
    setApplications(asList<MerchantApplication>(data))
  }

  async function auditApplication(applicationId: number, approved: boolean) {
    await run(approved ? '入驻审核通过' : '入驻审核拒绝', () =>
      http.post(`/admin/merchant/applications/${applicationId}/audit`, {
        approved,
        reject_reason: approved ? null : rejectReason,
      }),
    )
    await loadApplications()
    await loadAccounts()
  }

  async function loadCategories() {
    const data = await run('分类列表', () => http.get('/categories'))
    setCategories(directList<Category>(data))
  }

  async function createCategory() {
    await run('创建分类', () =>
      http.post('/admin/categories', {
        name: categoryName,
        parent_id: categoryParentId ? Number(categoryParentId) : null,
        sort_order: Number(categorySortOrder) || 0,
      }),
    )
    await loadCategories()
  }

  async function loadProducts() {
    const data = await run('商品列表', () =>
      http.get('/admin/products', {
        params: {
          keyword: productKeyword || undefined,
          category_id: productCategoryId ? Number(productCategoryId) : undefined,
          merchant_id: productMerchantId ? Number(productMerchantId) : undefined,
        },
      }),
    )
    const list = asList<Product>(data)
    setProducts(list)
    if (!selectedProduct && list[0]) setSelectedProduct(list[0])
  }

  async function productAction(productId: number, action: 'approve' | 'reject' | 'publish' | 'unpublish') {
    const map = {
      approve: () => http.post(`/admin/products/${productId}/audit`, { approved: true }),
      reject: () => http.post(`/admin/products/${productId}/audit`, { approved: false }),
      publish: () => http.post(`/admin/products/${productId}/publish`),
      unpublish: () => http.post(`/admin/products/${productId}/unpublish`),
    }
    await run(`商品操作：${action}`, map[action])
    await loadProducts()
  }

  async function updateSelectedSku() {
    if (!selectedProduct || !selectedSku) return
    await run('修改 SKU 价格库存', () =>
      http.patch(`/admin/products/${selectedProduct.id}/skus/${selectedSku.id}`, {
        price_cent: yuanToCent(skuPriceYuan),
        stock: Number(skuStock),
      }),
    )
    await loadProducts()
  }

  async function loadCoupons() {
    const data = await run('优惠券模板', () => http.get('/admin/promotions/coupons'))
    setCoupons(directList<Coupon>(data))
  }

  async function createCoupon() {
    await run('创建优惠券', () =>
      http.post('/admin/promotions/coupons', {
        name: couponName,
        scope_type: couponScopeType,
        scope_ids: ids(couponScopeIds),
        discount_type: 'amount',
        discount_value: yuanToCent(couponDiscountYuan) ?? 0,
        min_amount_cent: yuanToCent(couponMinYuan) ?? 0,
        total_quantity: Number(couponTotal) || 1,
        per_user_limit: 1,
      }),
    )
    await loadCoupons()
  }

  async function loadCommunity() {
    const postData = await run('待审帖子', () =>
      http.get('/admin/community/posts', { params: { status: 'pending_audit' } }),
    )
    setPosts(asList<Post>(postData))
    const commentData = await run('待审评论', () =>
      http.get('/admin/community/comments', { params: { status: 'pending_audit' } }),
    )
    setComments(asList<Comment>(commentData))
  }

  async function loadOrders() {
    const data = await run('订单列表', () => http.get('/admin/orders'))
    setOrders(asList<Order>(data))
  }

  async function shipOrder(orderId: number) {
    await run('订单发货', () =>
      http.post(`/admin/orders/${orderId}/ship`, {
        logistics_company: shippingCompany,
        tracking_no: trackingNo,
      }),
    )
    await loadOrders()
  }

  async function loadRefunds() {
    const data = await run('售后列表', () => http.get('/admin/refunds'))
    setRefunds(asList<Refund>(data))
  }

  async function loadLogs() {
    const data = await run('操作日志', () =>
      http.get('/admin/operation-logs', {
        params: { action: logAction || undefined },
      }),
    )
    setLogs(asList<OperationLog>(data))
  }

  async function loadInitialData() {
    await loadSummary()
    await loadUsers()
    await loadAccounts()
    await loadApplications()
    await loadCategories()
    await loadProducts()
    await loadCoupons()
    await loadCommunity()
    await loadOrders()
    await loadRefunds()
    await loadLogs()
  }

  useEffect(() => {
    void loadInitialData()
  }, [])

  useEffect(() => {
    if (selectedSku) {
      setSkuPriceYuan(yuan(selectedSku.price_cent))
      setSkuStock(String(selectedSku.stock))
    }
  }, [selectedSku])

  return (
    <main className="admin-page">
      <header className="page-header polished-header">
        <div>
          <p className="eyebrow">平台运营</p>
          <h1>审核、监管和平台配置</h1>
          <p>平台不直接创建店铺或商品。店铺来自商家入驻审核，商品由商家创建后提交平台审核。</p>
        </div>
        <div className="summary-grid">
          <div>
            <strong>{summary?.user_count ?? '-'}</strong>
            <span>用户</span>
          </div>
          <div>
            <strong>{summary?.product_count ?? '-'}</strong>
            <span>商品</span>
          </div>
          <div>
            <strong>{summary?.order_count ?? '-'}</strong>
            <span>订单</span>
          </div>
          <div>
            <strong>￥{yuan(summary?.gross_merchandise_cent)}</strong>
            <span>成交额</span>
          </div>
          <div>
            <strong>{summary?.pending_shipment_count ?? '-'}</strong>
            <span>待发货</span>
          </div>
          <div>
            <strong>{summary?.after_sale_count ?? '-'}</strong>
            <span>售后</span>
          </div>
        </div>
      </header>

      <div className="workbench-grid">
        <Panel title="商家入驻审核" description="审核通过后系统创建店铺并绑定商家账号。">
          <div className="toolbar">
            <label className="field">
              <span>申请状态</span>
              <select value={applicationStatus} onChange={(event) => setApplicationStatus(event.target.value)}>
                <option value="">全部</option>
                <option value="pending">待审核</option>
                <option value="approved">已通过</option>
                <option value="rejected">已拒绝</option>
              </select>
            </label>
            <Field label="拒绝原因" value={rejectReason} onChange={setRejectReason} />
            <button onClick={loadApplications}>刷新申请</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>申请 ID</th>
                  <th>店铺资料</th>
                  <th>账号/店铺 ID</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((application) => (
                  <tr key={application.id}>
                    <td><span className="id-badge">#{application.id}</span></td>
                    <td>
                      <strong>{application.merchant_name}</strong>
                      <br />
                      <small>{application.announcement || '无公告'}</small>
                      {application.reject_reason ? <p className="danger-text">拒绝原因：{application.reject_reason}</p> : null}
                    </td>
                    <td>
                      管理账号 #{application.admin_id}
                      <br />
                      <small>店铺 {application.merchant_id ? `#${application.merchant_id}` : '审核通过后生成'}</small>
                    </td>
                    <td><span className="status-pill">{statusText(application.status)}</span></td>
                    <td>
                      <div className="button-row">
                        <button onClick={() => auditApplication(application.id, true)}>通过</button>
                        <button onClick={() => auditApplication(application.id, false)}>拒绝</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {applications.length === 0 ? <Empty>暂无入驻申请。</Empty> : null}
          </div>
        </Panel>

        <Panel title="分类管理" description="分类仅平台可创建。分类 ID 在平台和商家商品表单中直接展示，创建商品时可选用。">
          <div className="form-grid">
            <Field label="分类名称" value={categoryName} onChange={setCategoryName} />
            <Field label="父级分类 ID" value={categoryParentId} onChange={setCategoryParentId} placeholder="可为空" />
            <Field label="排序值" value={categorySortOrder} onChange={setCategorySortOrder} />
            <button onClick={createCategory}>创建分类</button>
            <button onClick={loadCategories}>刷新分类</button>
          </div>
          <div className="category-grid">
            {categories.map((category) => (
              <div className="category-chip" key={category.id}>
                <strong>#{category.id}</strong>
                <span>{category.name}</span>
                <small>父级 {category.parent_id ?? '-'} / 排序 {category.sort_order}</small>
              </div>
            ))}
          </div>
          {categories.length === 0 ? <Empty>暂无分类。</Empty> : null}
        </Panel>

        <Panel title="商品审核与管理" description="平台查看全平台商品，可审核、上下架和监管库存；商品创建由商家端完成。">
          <div className="toolbar">
            <Field label="商品关键词" value={productKeyword} onChange={setProductKeyword} />
            <Field label="分类 ID" value={productCategoryId} onChange={setProductCategoryId} />
            <Field label="店铺 ID" value={productMerchantId} onChange={setProductMerchantId} />
            <button onClick={loadProducts}>查询商品</button>
            <button onClick={updateSelectedSku} disabled={!selectedSku}>修改选中 SKU</button>
          </div>
          {selectedProduct && selectedSku ? (
            <div className="selected-panel">
              <div>
                <span className="id-badge">商品 #{selectedProduct.id}</span>
                <h3>{selectedProduct.name}</h3>
                <p>店铺 #{selectedProduct.merchant.id} {selectedProduct.merchant.name} / 分类 #{selectedProduct.category_id ?? '-'}</p>
              </div>
              <div className="form-grid compact">
                <Field label={`SKU #${selectedSku.id} 价格（元）`} value={skuPriceYuan} onChange={setSkuPriceYuan} />
                <Field label="库存" value={skuStock} onChange={setSkuStock} />
              </div>
            </div>
          ) : null}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>商品 ID</th>
                  <th>商品</th>
                  <th>店铺/分类</th>
                  <th>状态</th>
                  <th>SKU 明细</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr className={selectedProduct?.id === product.id ? 'selected-row' : ''} key={product.id}>
                    <td><span className="id-badge">#{product.id}</span></td>
                    <td>
                      <button className="link-button" onClick={() => setSelectedProduct(product)}>
                        {product.name}
                      </button>
                      <br />
                      <small>{product.description || '暂无描述'}</small>
                    </td>
                    <td>
                      店铺 #{product.merchant.id}
                      <br />
                      <small>{product.merchant.name} / 分类 #{product.category_id ?? '-'}</small>
                    </td>
                    <td><span className="status-pill">{statusText(product.status)}</span></td>
                    <td>
                      {product.skus.map((sku) => (
                        <div className="sku-line" key={sku.id}>
                          <span>SKU #{sku.id}</span>
                          <span>{sku.name}</span>
                          <span>￥{yuan(sku.price_cent)}</span>
                          <span>库存 {sku.stock}</span>
                        </div>
                      ))}
                    </td>
                    <td>
                      <div className="button-row">
                        <button onClick={() => productAction(product.id, 'approve')}>审核通过</button>
                        <button onClick={() => productAction(product.id, 'reject')}>审核拒绝</button>
                        <button onClick={() => productAction(product.id, 'publish')}>上架</button>
                        <button onClick={() => productAction(product.id, 'unpublish')}>下架</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {products.length === 0 ? <Empty>暂无商品。</Empty> : null}
          </div>
        </Panel>

        <Panel title="用户与后台账号" description="平台运营可查看用户和后台账号，可启停账号或重置密码。">
          <div className="toolbar">
            <Field label="用户关键词" value={keyword} onChange={setKeyword} />
            <button onClick={loadUsers}>查询用户</button>
            <button onClick={loadAccounts}>刷新账号</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>用户 ID</th>
                  <th>用户</th>
                  <th>等级/积分</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td><span className="id-badge">#{user.id}</span></td>
                    <td>
                      {user.nickname}
                      <br />
                      <small>{user.mobile}</small>
                    </td>
                    <td>{user.level} / {user.points}</td>
                    <td>{user.is_active ? '正常' : '禁用'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3>后台账号</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>账号 ID</th>
                  <th>账号</th>
                  <th>角色</th>
                  <th>商家 ID</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id}>
                    <td><span className="id-badge">#{account.id}</span></td>
                    <td>
                      {account.username}
                      <br />
                      <small>{account.real_name}</small>
                    </td>
                    <td>{statusText(account.role)}</td>
                    <td>{account.merchant_id ? `#${account.merchant_id}` : '-'}</td>
                    <td>
                      <div className="button-row">
                        <button
                          onClick={async () => {
                            await run('启停账号', () =>
                              http.patch(`/admin/accounts/${account.id}/status`, { is_active: !account.is_active }),
                            )
                            await loadAccounts()
                          }}
                        >
                          {account.is_active ? '禁用' : '启用'}
                        </button>
                        <button
                          onClick={async () => {
                            await run('重置密码', () =>
                              http.post(`/admin/accounts/${account.id}/reset-password`, { password: '12345678' }),
                            )
                            await loadAccounts()
                          }}
                        >
                          重置密码
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="促销优惠券" description="平台可创建全平台或指定范围优惠券，也可批量发券、停用和手动过期。">
          <div className="form-grid">
            <Field label="券名称" value={couponName} onChange={setCouponName} />
            <label className="field">
              <span>适用范围</span>
              <select value={couponScopeType} onChange={(event) => setCouponScopeType(event.target.value)}>
                <option value="all">全平台</option>
                <option value="merchant">店铺</option>
                <option value="category">分类</option>
                <option value="product">商品</option>
                <option value="sku">SKU</option>
              </select>
            </label>
            <Field label="范围 ID，逗号分隔" value={couponScopeIds} onChange={setCouponScopeIds} />
            <Field label="优惠金额（元）" value={couponDiscountYuan} onChange={setCouponDiscountYuan} />
            <Field label="门槛金额（元）" value={couponMinYuan} onChange={setCouponMinYuan} />
            <Field label="发放总量" value={couponTotal} onChange={setCouponTotal} />
            <button onClick={createCoupon}>创建优惠券</button>
          </div>
          <div className="toolbar">
            <Field label="批量发券用户 ID" value={grantUserIds} onChange={setGrantUserIds} />
            <button onClick={loadCoupons}>刷新优惠券</button>
            <button
              onClick={async () => {
                await run('手动过期优惠券', () => http.post('/admin/promotions/coupons/expire'))
                await loadCoupons()
              }}
            >
              手动过期
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>模板 ID</th>
                  <th>名称</th>
                  <th>范围</th>
                  <th>优惠</th>
                  <th>领取</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon) => (
                  <tr key={coupon.id}>
                    <td><span className="id-badge">#{coupon.id}</span></td>
                    <td>{coupon.name}</td>
                    <td>
                      {coupon.scope_type}
                      <br />
                      <small>ID：{coupon.scope_ids?.join(', ') || '-'}</small>
                    </td>
                    <td>满 ￥{yuan(coupon.min_amount_cent)} 减 ￥{yuan(coupon.discount_value)}</td>
                    <td>{coupon.claimed_quantity}/{coupon.total_quantity}</td>
                    <td><span className="status-pill">{statusText(coupon.status)}</span></td>
                    <td>
                      <div className="button-row">
                        <button
                          onClick={async () => {
                            await run('批量发券', () =>
                              http.post(`/admin/promotions/coupons/${coupon.id}/batch-grant`, {
                                user_ids: ids(grantUserIds),
                              }),
                            )
                            await loadCoupons()
                          }}
                        >
                          批量发券
                        </button>
                        <button
                          onClick={async () => {
                            await run('停用优惠券', () => http.post(`/admin/promotions/coupons/${coupon.id}/disable`))
                            await loadCoupons()
                          }}
                        >
                          停用
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="社区审核" description="帖子和评论以待审核列表显示，审核动作直接跟随对应内容。">
          <div className="toolbar">
            <button onClick={loadCommunity}>刷新社区审核</button>
          </div>
          <h3>待审帖子</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>帖子 ID</th>
                  <th>标题</th>
                  <th>类型</th>
                  <th>互动</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr key={post.id}>
                    <td><span className="id-badge">#{post.id}</span></td>
                    <td>{post.title}</td>
                    <td>{post.type}</td>
                    <td>赞 {post.like_count} / 评 {post.comment_count}</td>
                    <td>
                      <div className="button-row">
                        <button
                          onClick={async () => {
                            await run('帖子审核通过', () =>
                              http.post(`/admin/community/posts/${post.id}/audit`, { approved: true }),
                            )
                            await loadCommunity()
                          }}
                        >
                          通过
                        </button>
                        <button
                          onClick={async () => {
                            await run('帖子审核拒绝', () =>
                              http.post(`/admin/community/posts/${post.id}/audit`, { approved: false }),
                            )
                            await loadCommunity()
                          }}
                        >
                          拒绝
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {posts.length === 0 ? <Empty>暂无待审帖子。</Empty> : null}
          </div>
          <h3>待审评论</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>评论 ID</th>
                  <th>帖子 ID</th>
                  <th>内容</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {comments.map((comment) => (
                  <tr key={comment.id}>
                    <td><span className="id-badge">#{comment.id}</span></td>
                    <td>#{comment.post_id}</td>
                    <td>{comment.content}</td>
                    <td>
                      <div className="button-row">
                        <button
                          onClick={async () => {
                            await run('评论审核通过', () =>
                              http.post(`/admin/community/comments/${comment.id}/audit`, { approved: true }),
                            )
                            await loadCommunity()
                          }}
                        >
                          通过
                        </button>
                        <button
                          onClick={async () => {
                            await run('评论审核拒绝', () =>
                              http.post(`/admin/community/comments/${comment.id}/audit`, { approved: false }),
                            )
                            await loadCommunity()
                          }}
                        >
                          拒绝
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {comments.length === 0 ? <Empty>暂无待审评论。</Empty> : null}
          </div>
        </Panel>

        <Panel title="订单与售后" description="平台可查看全平台订单、处理发货和售后。物流只记录公司和单号，不做轨迹查询。">
          <div className="toolbar">
            <Field label="物流公司" value={shippingCompany} onChange={setShippingCompany} />
            <Field label="物流单号" value={trackingNo} onChange={setTrackingNo} />
            <button onClick={loadOrders}>刷新订单</button>
            <button onClick={loadRefunds}>刷新售后</button>
            <button
              onClick={() =>
                run('导出订单 CSV', async () => ({
                  preview: String(await http.get('/admin/orders/export', { responseType: 'text' })).slice(0, 800),
                }))
              }
            >
              导出订单
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>订单 ID</th>
                  <th>订单号</th>
                  <th>用户/店铺</th>
                  <th>金额</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td><span className="id-badge">#{order.id}</span></td>
                    <td>{order.order_no}</td>
                    <td>
                      用户 #{order.user_id}
                      <br />
                      <small>店铺 #{order.merchant_id}</small>
                    </td>
                    <td>￥{yuan(order.pay_amount_cent)}</td>
                    <td><span className="status-pill">{statusText(order.status)}</span></td>
                    <td><button onClick={() => shipOrder(order.id)}>发货</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3>售后申请</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>售后 ID</th>
                  <th>订单/用户</th>
                  <th>金额</th>
                  <th>原因</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {refunds.map((refund) => (
                  <tr key={refund.id}>
                    <td><span className="id-badge">#{refund.id}</span></td>
                    <td>
                      订单 #{refund.order_id}
                      <br />
                      <small>用户 #{refund.user_id}</small>
                    </td>
                    <td>￥{yuan(refund.refund_amount_cent)}</td>
                    <td>
                      {refund.reason_type}
                      <br />
                      <small>{refund.reason}</small>
                    </td>
                    <td><span className="status-pill">{statusText(refund.status)}</span></td>
                    <td>
                      <div className="button-row">
                        <button onClick={async () => { await run('同意售后', () => http.post(`/admin/refunds/${refund.id}/approve`)); await loadRefunds() }}>同意</button>
                        <button onClick={async () => { await run('拒绝售后', () => http.post(`/admin/refunds/${refund.id}/reject`)); await loadRefunds() }}>拒绝</button>
                        <button onClick={async () => { await run('确认退货', () => http.post(`/admin/refunds/${refund.id}/receive`)); await loadRefunds() }}>确认退货</button>
                        <button onClick={async () => { await run('退款完成', () => http.post(`/admin/refunds/${refund.id}/refund`)); await loadRefunds() }}>退款完成</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="操作日志" description="用于检查关键后台动作是否写入日志。">
          <div className="toolbar">
            <Field label="action 筛选" value={logAction} onChange={setLogAction} />
            <button onClick={loadLogs}>查询日志</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>日志 ID</th>
                  <th>管理员</th>
                  <th>动作</th>
                  <th>资源</th>
                  <th>说明</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td><span className="id-badge">#{log.id}</span></td>
                    <td>#{log.admin_id}</td>
                    <td>{log.action}</td>
                    <td>{log.resource_type} {log.resource_id ? `#${log.resource_id}` : ''}</td>
                    <td>{log.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <ResultBoard result={lastResult} />
    </main>
  )
}
