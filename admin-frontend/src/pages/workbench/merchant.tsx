import { useEffect, useMemo, useState } from 'react'
import { http } from '../../services/http'
import {
  Empty,
  Field,
  Panel,
  ResultBoard,
  TextArea,
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

type AdminProfile = {
  id: number
  username: string
  real_name: string
  role: string
  merchant_id?: number | null
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

type Order = {
  id: number
  order_no: string
  user_id: number
  merchant_id: number
  status: string
  pay_amount_cent: number
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

function asList<T>(data: unknown) {
  return ((data as PageResult<T> | null)?.list ?? []) as T[]
}

function directList<T>(data: unknown) {
  return ((data as T[] | null) ?? []) as T[]
}

export function MerchantWorkbenchPage() {
  const [lastResult, setLastResult] = useState<ApiResult>(null)
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  const [categoryId, setCategoryId] = useState('')
  const [productName, setProductName] = useState(randomText('本店商品'))
  const [productDescription, setProductDescription] = useState('商家运营创建的测试商品')
  const [skuName, setSkuName] = useState('默认规格')
  const [skuPriceYuan, setSkuPriceYuan] = useState('19.99')
  const [skuStock, setSkuStock] = useState('10')
  const [couponName, setCouponName] = useState(randomText('本店券'))
  const [couponDiscountYuan, setCouponDiscountYuan] = useState('5.00')
  const [couponMinYuan, setCouponMinYuan] = useState('10.00')
  const [couponTotal, setCouponTotal] = useState('20')
  const [batchProductIds, setBatchProductIds] = useState('')
  const [shippingCompany, setShippingCompany] = useState('测试快递')
  const [trackingNo, setTrackingNo] = useState(randomText('LOG'))

  const selectedSku = useMemo(() => selectedProduct?.skus[0] ?? null, [selectedProduct])
  const merchantId = profile?.merchant_id ?? null

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

  async function loadMe() {
    const data = await run('当前商家账号', () => http.get('/admin/auth/me'))
    if (data) setProfile(data as AdminProfile)
  }

  async function loadCategories() {
    const data = await run('分类列表', () => http.get('/categories'))
    const list = directList<Category>(data)
    setCategories(list)
    if (!categoryId && list[0]) setCategoryId(String(list[0].id))
  }

  async function loadProducts() {
    const data = await run('本店商品列表', () => http.get('/admin/products'))
    const list = asList<Product>(data)
    setProducts(list)
    if (!selectedProduct && list[0]) setSelectedProduct(list[0])
  }

  async function createProduct() {
    if (!merchantId) return
    const data = await run('创建本店商品', () =>
      http.post('/admin/products', {
        merchant_id: merchantId,
        category_id: categoryId ? Number(categoryId) : null,
        name: productName,
        description: productDescription,
        image_urls: [],
        skus: [
          {
            name: skuName,
            price_cent: yuanToCent(skuPriceYuan) ?? 0,
            stock: Number(skuStock) || 0,
            spec_values: { 规格: skuName },
          },
        ],
      }),
    )
    if (data) setSelectedProduct(data as Product)
    await loadProducts()
  }

  async function updateProduct() {
    if (!selectedProduct) return
    await run('编辑本店商品', () =>
      http.put(`/admin/products/${selectedProduct.id}`, {
        category_id: categoryId ? Number(categoryId) : null,
        name: productName,
        description: productDescription,
      }),
    )
    await loadProducts()
  }

  async function updateSku() {
    if (!selectedProduct || !selectedSku) return
    await run('修改 SKU', () =>
      http.patch(`/admin/products/${selectedProduct.id}/skus/${selectedSku.id}`, {
        name: skuName,
        price_cent: yuanToCent(skuPriceYuan),
        stock: Number(skuStock),
      }),
    )
    await loadProducts()
  }

  async function productAction(productId: number, action: 'submit' | 'publish' | 'unpublish') {
    const map = {
      submit: () => http.post(`/admin/products/${productId}/submit-audit`),
      publish: () => http.post(`/admin/products/${productId}/publish`),
      unpublish: () => http.post(`/admin/products/${productId}/unpublish`),
    }
    await run(`本店商品操作：${action}`, map[action])
    await loadProducts()
  }

  async function batchAction(action: 'publish' | 'unpublish') {
    await run(action === 'publish' ? '批量上架' : '批量下架', () =>
      http.post(`/admin/products/batch-${action}`, { product_ids: ids(batchProductIds) }),
    )
    await loadProducts()
  }

  async function loadOrders() {
    const data = await run('本店订单列表', () => http.get('/admin/orders'))
    setOrders(asList<Order>(data))
  }

  async function shipOrder(orderId: number) {
    await run('本店订单发货', () =>
      http.post(`/admin/orders/${orderId}/ship`, {
        logistics_company: shippingCompany,
        tracking_no: trackingNo,
      }),
    )
    await loadOrders()
  }

  async function loadCoupons() {
    const data = await run('本店优惠券', () => http.get('/admin/promotions/coupons'))
    setCoupons(directList<Coupon>(data))
  }

  async function createCoupon() {
    if (!merchantId) return
    await run('创建本店优惠券', () =>
      http.post('/admin/promotions/coupons', {
        name: couponName,
        scope_type: 'merchant',
        scope_ids: [merchantId],
        discount_type: 'amount',
        discount_value: yuanToCent(couponDiscountYuan) ?? 0,
        min_amount_cent: yuanToCent(couponMinYuan) ?? 0,
        total_quantity: Number(couponTotal) || 1,
        per_user_limit: 1,
      }),
    )
    await loadCoupons()
  }

  useEffect(() => {
    void loadMe()
    void loadCategories()
    void loadProducts()
    void loadOrders()
    void loadCoupons()
  }, [])

  useEffect(() => {
    if (selectedProduct) {
      setProductName(selectedProduct.name)
      setProductDescription(selectedProduct.description || '')
      setCategoryId(selectedProduct.category_id ? String(selectedProduct.category_id) : '')
      if (selectedProduct.skus[0]) {
        setSkuName(selectedProduct.skus[0].name)
        setSkuPriceYuan(yuan(selectedProduct.skus[0].price_cent))
        setSkuStock(String(selectedProduct.skus[0].stock))
      }
    }
  }, [selectedProduct])

  return (
    <main className="admin-page">
      <header className="page-header polished-header">
        <div>
          <p className="eyebrow">商家运营</p>
          <h1>本店商品、订单和优惠券</h1>
          <p>当前店铺 ID 由账号绑定，不能手动输入。分类由平台维护，商家创建商品时选择分类 ID。</p>
        </div>
        <section className="status-card hero-status">
          <h2>当前店铺</h2>
          {profile ? (
            <div className="info-list">
              <span>{profile.real_name || profile.username}</span>
              <span>角色：{statusText(profile.role)}</span>
              <strong>店铺 ID：{merchantId ? `#${merchantId}` : '未绑定'}</strong>
            </div>
          ) : (
            <Empty>未读取账号。请先登录商家账号。</Empty>
          )}
          <button onClick={loadMe}>刷新当前账号</button>
        </section>
      </header>

      <div className="workbench-grid">
        <Panel title="本店商品" description="创建商品、提交审核、上下架和维护首个 SKU。商品 ID、分类 ID、SKU ID 都在表格中直接显示。">
          <div className="selected-panel">
            <div>
              <span className="id-badge">店铺 {merchantId ? `#${merchantId}` : '未绑定'}</span>
              <h3>{selectedProduct ? `正在编辑：#${selectedProduct.id} ${selectedProduct.name}` : '创建新商品'}</h3>
              <p>平台审核通过后商品才会对用户可见。</p>
            </div>
            <div className="category-grid compact-list">
              {categories.map((category) => (
                <button
                  className={categoryId === String(category.id) ? 'category-chip active' : 'category-chip'}
                  key={category.id}
                  onClick={() => setCategoryId(String(category.id))}
                >
                  <strong>#{category.id}</strong>
                  <span>{category.name}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="form-grid">
            <label className="field">
              <span>商品分类</span>
              <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                <option value="">不选择分类</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    #{category.id} {category.name}
                  </option>
                ))}
              </select>
            </label>
            <Field label="商品名称" value={productName} onChange={setProductName} />
            <Field label="规格名称" value={skuName} onChange={setSkuName} />
            <Field label="价格（元）" value={skuPriceYuan} onChange={setSkuPriceYuan} />
            <Field label="库存" value={skuStock} onChange={setSkuStock} />
            <TextArea label="商品描述" value={productDescription} onChange={setProductDescription} />
          </div>
          <div className="toolbar">
            <button onClick={createProduct} disabled={!merchantId}>创建商品</button>
            <button onClick={updateProduct} disabled={!selectedProduct}>保存选中商品</button>
            <button onClick={updateSku} disabled={!selectedSku}>修改选中 SKU</button>
            <Field label="批量商品 ID" value={batchProductIds} onChange={setBatchProductIds} />
            <button onClick={() => batchAction('publish')}>批量上架</button>
            <button onClick={() => batchAction('unpublish')}>批量下架</button>
            <button onClick={loadProducts}>刷新商品</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>商品 ID</th>
                  <th>商品</th>
                  <th>分类</th>
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
                    <td>#{product.category_id ?? '-'}</td>
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
                        <button onClick={() => productAction(product.id, 'submit')}>提交审核</button>
                        <button onClick={() => productAction(product.id, 'publish')}>上架</button>
                        <button onClick={() => productAction(product.id, 'unpublish')}>下架</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {products.length === 0 ? <Empty>暂无本店商品。</Empty> : null}
          </div>
        </Panel>

        <Panel title="本店订单" description="商家处理自己店铺的订单发货。项目不实现物流轨迹查询，只记录物流公司和单号。">
          <div className="toolbar">
            <Field label="物流公司" value={shippingCompany} onChange={setShippingCompany} />
            <Field label="物流单号" value={trackingNo} onChange={setTrackingNo} />
            <button onClick={loadOrders}>刷新订单</button>
            <button
              onClick={() =>
                run('导出本店订单 CSV', async () => ({
                  preview: String(await http.get('/admin/orders/export', { responseType: 'text' })).slice(0, 800),
                }))
              }
            >
              导出 CSV
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>订单 ID</th>
                  <th>订单号</th>
                  <th>用户 ID</th>
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
                    <td>#{order.user_id}</td>
                    <td>￥{yuan(order.pay_amount_cent)}</td>
                    <td><span className="status-pill">{statusText(order.status)}</span></td>
                    <td><button onClick={() => shipOrder(order.id)}>发货</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {orders.length === 0 ? <Empty>暂无本店订单。</Empty> : null}
          </div>
        </Panel>

        <Panel title="本店优惠券" description="商家只创建本店铺范围优惠券；范围自动绑定当前店铺 ID。">
          <div className="form-grid">
            <Field label="券名称" value={couponName} onChange={setCouponName} />
            <Field label="优惠金额（元）" value={couponDiscountYuan} onChange={setCouponDiscountYuan} />
            <Field label="门槛金额（元）" value={couponMinYuan} onChange={setCouponMinYuan} />
            <Field label="发放总量" value={couponTotal} onChange={setCouponTotal} />
            <button onClick={createCoupon} disabled={!merchantId}>创建本店券</button>
            <button onClick={loadCoupons}>刷新优惠券</button>
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
                      <button
                        onClick={async () => {
                          await run('停用本店券', () => http.post(`/admin/promotions/coupons/${coupon.id}/disable`))
                          await loadCoupons()
                        }}
                      >
                        停用
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {coupons.length === 0 ? <Empty>暂无本店优惠券。</Empty> : null}
          </div>
        </Panel>
      </div>

      <ResultBoard result={lastResult} />
    </main>
  )
}
