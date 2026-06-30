import {
  Button,
  Card,
  Col,
  Form,
  Image,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { UploadFile } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { http } from '../../services/http'
import { uploadService } from '../../services/upload'
import {
  DebugLogs,
  StatusTag,
  formatError,
  ids,
  pickData,
  statusText,
  type ApiLog,
  yuan,
  yuanToCent,
} from './adminShared'

const { Title, Paragraph, Text } = Typography
const SESSION = 'merchant'

type PageResult<T> = { list: T[]; total: number }
type AdminProfile = { id: number; username: string; real_name: string; role: string; merchant_id?: number | null }
type Category = { id: number; name: string; parent_id?: number | null; sort_order: number }
type Product = {
  id: number
  name: string
  description?: string
  cover_url?: string | null
  images?: string[]
  category_id?: number | null
  status: string
  merchant: { id: number; name: string }
  skus: Array<{ id: number; name: string; price_cent: number; stock: number }>
}
type Order = { id: number; order_no: string; user_id: number; merchant_id: number; status: string; pay_amount_cent: number }
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

function assetUrl(url?: string | null) {
  if (!url) return undefined
  return /^https?:\/\//.test(url) ? url : `http://localhost:8000${url}`
}

function pageList<T>(data: unknown) {
  return ((data as PageResult<T> | null)?.list ?? []) as T[]
}

function directList<T>(data: unknown) {
  return ((data as T[] | null) ?? []) as T[]
}

export function MerchantWorkbenchPage() {
  const [api, contextHolder] = message.useMessage()
  const [logs, setLogs] = useState<ApiLog[]>([])
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [shippingForm] = Form.useForm()
  const merchantId = profile?.merchant_id ?? null

  async function run<T>(title: string, action: () => Promise<unknown>): Promise<T | null> {
    try {
      const response = await action()
      const data = pickData(response)
      setLogs((items) => [{ title, ok: true, data, time: new Date().toLocaleTimeString() }, ...items].slice(0, 8))
      return data as T
    } catch (error) {
      const data = formatError(error)
      setLogs((items) => [{ title, ok: false, data, time: new Date().toLocaleTimeString() }, ...items].slice(0, 8))
      api.error(`${title}失败`)
      return null
    }
  }

  async function loadMe() {
    const data = await run<AdminProfile>('当前商家账号', () => http.get('/admin/auth/me', { headers: { 'X-Admin-Session': SESSION } }))
    if (data) setProfile(data)
  }

  async function loadCategories() {
    const data = await run<Category[]>('分类列表', () => http.get('/categories'))
    setCategories(directList<Category>(data))
  }

  async function loadProducts() {
    const data = await run<PageResult<Product>>('本店商品', () => http.get('/admin/products', { headers: { 'X-Admin-Session': SESSION } }))
    setProducts(pageList<Product>(data))
  }

  async function createProduct(values: {
    category_id?: number
    name: string
    description?: string
    sku_name: string
    price_yuan: number
    stock: number
  }) {
    if (!merchantId) {
      api.warning('当前账号尚未绑定店铺，请先完成平台审核')
      return
    }
    await run('创建商品', () =>
      http.post(
        '/admin/products',
        {
          merchant_id: merchantId,
          category_id: values.category_id ?? null,
          name: values.name,
          description: values.description ?? '',
          cover_url: imageUrls[0] ?? null,
          image_urls: imageUrls,
          skus: [
            {
              name: values.sku_name,
              price_cent: yuanToCent(values.price_yuan),
              stock: values.stock,
              spec_values: { 规格: values.sku_name },
            },
          ],
        },
        { headers: { 'X-Admin-Session': SESSION } },
      ),
    )
    setImageUrls([])
    await loadProducts()
  }

  async function updateSelectedSku(values: { price_yuan?: number; stock?: number }) {
    const sku = selectedProduct?.skus[0]
    if (!selectedProduct || !sku) return
    await run('修改 SKU', () =>
      http.patch(
        `/admin/products/${selectedProduct.id}/skus/${sku.id}`,
        {
          price_cent: values.price_yuan === undefined ? undefined : yuanToCent(values.price_yuan),
          stock: values.stock,
        },
        { headers: { 'X-Admin-Session': SESSION } },
      ),
    )
    await loadProducts()
  }

  async function productStatus(productId: number, action: 'publish' | 'unpublish') {
    await run(action === 'publish' ? '商品上架' : '商品下架', () =>
      http.post(`/admin/products/${productId}/${action}`, undefined, { headers: { 'X-Admin-Session': SESSION } }),
    )
    await loadProducts()
  }

  async function loadOrders() {
    const data = await run<PageResult<Order>>('本店订单', () => http.get('/admin/orders', { headers: { 'X-Admin-Session': SESSION } }))
    setOrders(pageList<Order>(data))
  }

  async function shipOrder(orderId: number) {
    const values = shippingForm.getFieldsValue()
    await run('订单发货', () =>
      http.post(
        `/admin/orders/${orderId}/ship`,
        {
          logistics_company: values.logistics_company || '商家配送',
          tracking_no: values.tracking_no || `NO${Date.now()}`,
        },
        { headers: { 'X-Admin-Session': SESSION } },
      ),
    )
    await loadOrders()
  }

  async function loadCoupons() {
    const data = await run<Coupon[]>('本店优惠券', () => http.get('/admin/promotions/coupons', { headers: { 'X-Admin-Session': SESSION } }))
    setCoupons(directList<Coupon>(data))
  }

  async function createCoupon(values: { name: string; discount_yuan: number; min_yuan: number; total_quantity: number }) {
    if (!merchantId) return
    await run('创建本店优惠券', () =>
      http.post(
        '/admin/promotions/coupons',
        {
          name: values.name,
          scope_type: 'merchant',
          scope_ids: [merchantId],
          discount_type: 'amount',
          discount_value: yuanToCent(values.discount_yuan),
          min_amount_cent: yuanToCent(values.min_yuan),
          total_quantity: values.total_quantity,
          per_user_limit: 1,
        },
        { headers: { 'X-Admin-Session': SESSION } },
      ),
    )
    await loadCoupons()
  }

  async function uploadImage(file: File) {
    const data = await run<{ url: string }>('上传商品图片', () => uploadService.uploadImage(file, SESSION))
    if (data?.url) setImageUrls((items) => [...items, data.url])
    return false
  }

  useEffect(() => {
    void loadMe()
    void loadCategories()
    void loadProducts()
    void loadOrders()
    void loadCoupons()
  }, [])

  const uploadFiles: UploadFile[] = imageUrls.map((url, index) => ({
    uid: `${index}`,
    name: url.split('/').pop() || `image-${index}`,
    status: 'done',
    url: assetUrl(url),
  }))

  const productColumns: ColumnsType<Product> = [
    {
      title: '商品',
      dataIndex: 'name',
      render: (_, record) => (
        <Space>
          {record.cover_url ? <Image width={58} height={58} src={assetUrl(record.cover_url)} /> : <div className="table-thumb">图</div>}
          <Space direction="vertical" size={0}>
            <Text strong>{record.name}</Text>
            <Text type="secondary">商品 #{record.id} / 分类 #{record.category_id ?? '-'}</Text>
          </Space>
        </Space>
      ),
    },
    { title: '状态', dataIndex: 'status', render: (status) => <StatusTag status={status} /> },
    {
      title: 'SKU',
      render: (_, record) => record.skus.map((sku) => (
        <Tag key={sku.id}>SKU #{sku.id} {sku.name} ￥{yuan(sku.price_cent)} 库存 {sku.stock}</Tag>
      )),
    },
    {
      title: '操作',
      render: (_, record) => (
        <Space>
          <Button onClick={() => setSelectedProduct(record)}>编辑首个 SKU</Button>
          <Button onClick={() => productStatus(record.id, 'publish')}>上架</Button>
          <Button danger onClick={() => productStatus(record.id, 'unpublish')}>下架</Button>
        </Space>
      ),
    },
  ]

  const orderColumns: ColumnsType<Order> = [
    { title: '订单', dataIndex: 'order_no', render: (value, record) => <span>{value}<br /><Text type="secondary">#{record.id}</Text></span> },
    { title: '用户', dataIndex: 'user_id', render: (value) => `#${value}` },
    { title: '金额', dataIndex: 'pay_amount_cent', render: (value) => `￥${yuan(value)}` },
    { title: '状态', dataIndex: 'status', render: (status) => <StatusTag status={status} /> },
    { title: '操作', render: (_, record) => <Button disabled={record.status !== 'pending_shipment'} onClick={() => shipOrder(record.id)}>发货</Button> },
  ]

  return (
    <main className="admin-page">
      {contextHolder}
      <section className="admin-hero">
        <div>
          <Text className="eyebrow">商家运营</Text>
          <Title level={1}>商品上传、订单发货与优惠券</Title>
          <Paragraph>商家账号使用独立会话，可与平台账号同时登录。商品创建后直接上架，平台保留管理权。</Paragraph>
        </div>
        <Card>
          <Space direction="vertical">
            <Text strong>{profile?.real_name || profile?.username || '未登录商家账号'}</Text>
            <Text>角色：{statusText(profile?.role)}</Text>
            <Tag color="purple">店铺 ID：{merchantId ? `#${merchantId}` : '待平台审核'}</Tag>
            <Button onClick={loadMe}>刷新商家状态</Button>
          </Space>
        </Card>
      </section>

      <Row gutter={[24, 24]}>
        <Col span={10}>
          <Card title="上传商品">
            <Form layout="vertical" onFinish={createProduct} initialValues={{ sku_name: '默认规格', price_yuan: 19.9, stock: 20 }}>
              <Form.Item label="分类" name="category_id">
                <Select
                  allowClear
                  options={categories.map((item) => ({ value: item.id, label: `#${item.id} ${item.name}` }))}
                />
              </Form.Item>
              <Form.Item label="商品名称" name="name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item label="商品描述" name="description">
                <Input.TextArea rows={3} />
              </Form.Item>
              <Form.Item label="商品图片">
                <Upload fileList={uploadFiles} beforeUpload={(file) => uploadImage(file)} onRemove={(file) => {
                  setImageUrls((items) => items.filter((item) => assetUrl(item) !== file.url))
                  return true
                }}>
                  <Button>上传图片</Button>
                </Upload>
              </Form.Item>
              <Row gutter={12}>
                <Col span={8}><Form.Item label="SKU 名称" name="sku_name" rules={[{ required: true }]}><Input /></Form.Item></Col>
                <Col span={8}><Form.Item label="价格（元）" name="price_yuan" rules={[{ required: true }]}><InputNumber min={0} precision={2} style={{ width: '100%' }} /></Form.Item></Col>
                <Col span={8}><Form.Item label="库存" name="stock" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
              </Row>
              <Button type="primary" htmlType="submit" disabled={!merchantId}>创建并上架</Button>
            </Form>
          </Card>
        </Col>
        <Col span={14}>
          <Card title="本店商品" extra={<Button onClick={loadProducts}>刷新</Button>}>
            <Table rowKey="id" columns={productColumns} dataSource={products} pagination={{ pageSize: 6 }} />
            {selectedProduct ? (
              <Card size="small" title={`编辑商品 #${selectedProduct.id} 首个 SKU`}>
                <Form layout="inline" onFinish={updateSelectedSku} initialValues={{
                  price_yuan: Number(yuan(selectedProduct.skus[0]?.price_cent)),
                  stock: selectedProduct.skus[0]?.stock,
                }}>
                  <Form.Item label="价格（元）" name="price_yuan"><InputNumber min={0} precision={2} /></Form.Item>
                  <Form.Item label="库存" name="stock"><InputNumber min={0} /></Form.Item>
                  <Button type="primary" htmlType="submit">保存</Button>
                </Form>
              </Card>
            ) : null}
          </Card>
        </Col>
        <Col span={24}>
          <Card title="本店订单" extra={<Button onClick={loadOrders}>刷新订单</Button>}>
            <Form layout="inline" form={shippingForm} initialValues={{ logistics_company: '商家配送', tracking_no: `NO${Date.now()}` }}>
              <Form.Item label="物流公司" name="logistics_company"><Input /></Form.Item>
              <Form.Item label="物流单号" name="tracking_no"><Input /></Form.Item>
            </Form>
            <Table rowKey="id" columns={orderColumns} dataSource={orders} pagination={{ pageSize: 8 }} />
          </Card>
        </Col>
        <Col span={24}>
          <Card title="本店优惠券">
            <Form layout="inline" onFinish={createCoupon} initialValues={{ discount_yuan: 5, min_yuan: 20, total_quantity: 50 }}>
              <Form.Item label="名称" name="name" rules={[{ required: true }]}><Input /></Form.Item>
              <Form.Item label="优惠（元）" name="discount_yuan"><InputNumber min={0} precision={2} /></Form.Item>
              <Form.Item label="门槛（元）" name="min_yuan"><InputNumber min={0} precision={2} /></Form.Item>
              <Form.Item label="数量" name="total_quantity"><InputNumber min={1} /></Form.Item>
              <Button type="primary" htmlType="submit" disabled={!merchantId}>创建优惠券</Button>
              <Button onClick={loadCoupons}>刷新</Button>
            </Form>
            <Table
              rowKey="id"
              dataSource={coupons}
              pagination={{ pageSize: 6 }}
              columns={[
                { title: '券 ID', dataIndex: 'id', render: (id) => <Tag>#{id}</Tag> },
                { title: '名称', dataIndex: 'name' },
                { title: '优惠', render: (_, record) => `满 ￥${yuan(record.min_amount_cent)} 减 ￥${yuan(record.discount_value)}` },
                { title: '领取', render: (_, record) => `${record.claimed_quantity}/${record.total_quantity}` },
                { title: '状态', dataIndex: 'status', render: (status) => <StatusTag status={status} /> },
              ]}
            />
          </Card>
        </Col>
      </Row>

      <DebugLogs logs={logs} />
    </main>
  )
}
