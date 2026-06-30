import { Button, Card, Col, Form, Input, InputNumber, Row, Select, Space, Statistic, Table, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useState } from 'react'
import { http } from '../../services/http'
import { DebugLogs, StatusTag, formatError, ids, pickData, statusText, type ApiLog, yuan, yuanToCent } from './adminShared'

const { Title, Paragraph, Text } = Typography
const SESSION = 'platform'

type PageResult<T> = { list: T[]; total: number }
type Summary = {
  user_count: number
  product_count: number
  order_count: number
  gross_merchandise_cent: number
  pending_shipment_count: number
  after_sale_count: number
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
type Category = { id: number; name: string; parent_id?: number | null; sort_order: number }
type Product = {
  id: number
  name: string
  description?: string
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
type Post = { id: number; title: string; type: string; status: string; author?: { nickname: string }; like_count: number; comment_count: number }

function pageList<T>(data: unknown) {
  return ((data as PageResult<T> | null)?.list ?? []) as T[]
}

function directList<T>(data: unknown) {
  return ((data as T[] | null) ?? []) as T[]
}

export function PlatformWorkbenchPage() {
  const [api, contextHolder] = message.useMessage()
  const [logs, setLogs] = useState<ApiLog[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [applications, setApplications] = useState<MerchantApplication[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [rejectReason, setRejectReason] = useState('资料不完整')
  const [grantUserIds, setGrantUserIds] = useState('')

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

  async function loadSummary() {
    const data = await run<Summary>('平台看板', () => http.get('/admin/dashboard/summary', { headers: { 'X-Admin-Session': SESSION } }))
    if (data) setSummary(data)
  }

  async function loadApplications(status?: string) {
    const data = await run<PageResult<MerchantApplication>>('商家入驻申请', () =>
      http.get('/admin/merchant/applications', { params: { status }, headers: { 'X-Admin-Session': SESSION } }),
    )
    setApplications(pageList<MerchantApplication>(data))
  }

  async function auditApplication(id: number, approved: boolean) {
    await run(approved ? '入驻通过' : '入驻拒绝', () =>
      http.post(
        `/admin/merchant/applications/${id}/audit`,
        { approved, reject_reason: approved ? null : rejectReason },
        { headers: { 'X-Admin-Session': SESSION } },
      ),
    )
    await loadApplications()
  }

  async function loadCategories() {
    const data = await run<Category[]>('分类列表', () => http.get('/categories'))
    setCategories(directList<Category>(data))
  }

  async function createCategory(values: { name: string; parent_id?: number; sort_order?: number }) {
    await run('创建分类', () =>
      http.post(
        '/admin/categories',
        { name: values.name, parent_id: values.parent_id ?? null, sort_order: values.sort_order ?? 0 },
        { headers: { 'X-Admin-Session': SESSION } },
      ),
    )
    await loadCategories()
  }

  async function loadProducts(values?: { keyword?: string; category_id?: number; merchant_id?: number }) {
    const data = await run<PageResult<Product>>('商品列表', () =>
      http.get('/admin/products', { params: values, headers: { 'X-Admin-Session': SESSION } }),
    )
    setProducts(pageList<Product>(data))
  }

  async function productStatus(id: number, action: 'publish' | 'unpublish') {
    await run(action === 'publish' ? '商品上架' : '商品下架', () =>
      http.post(`/admin/products/${id}/${action}`, undefined, { headers: { 'X-Admin-Session': SESSION } }),
    )
    await loadProducts()
  }

  async function loadOrders(values?: { status?: string }) {
    const data = await run<PageResult<Order>>('订单列表', () =>
      http.get('/admin/orders', { params: values, headers: { 'X-Admin-Session': SESSION } }),
    )
    setOrders(pageList<Order>(data))
  }

  async function loadCoupons() {
    const data = await run<Coupon[]>('优惠券列表', () => http.get('/admin/promotions/coupons', { headers: { 'X-Admin-Session': SESSION } }))
    setCoupons(directList<Coupon>(data))
  }

  async function createCoupon(values: { name: string; scope_type: string; scope_ids?: string; discount_yuan: number; min_yuan: number; total_quantity: number }) {
    await run('创建平台优惠券', () =>
      http.post(
        '/admin/promotions/coupons',
        {
          name: values.name,
          scope_type: values.scope_type,
          scope_ids: ids(values.scope_ids),
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

  async function loadPosts() {
    const data = await run<PageResult<Post>>('社区内容', () =>
      http.get('/admin/community/posts', { params: { status: 'published' }, headers: { 'X-Admin-Session': SESSION } }),
    )
    setPosts(pageList<Post>(data))
  }

  async function hidePost(id: number) {
    await run('隐藏帖子', () => http.post(`/admin/community/posts/${id}/hide`, undefined, { headers: { 'X-Admin-Session': SESSION } }))
    await loadPosts()
  }

  useEffect(() => {
    void loadSummary()
    void loadApplications()
    void loadCategories()
    void loadProducts()
    void loadOrders()
    void loadCoupons()
    void loadPosts()
  }, [])

  const applicationColumns: ColumnsType<MerchantApplication> = [
    { title: '申请 ID', dataIndex: 'id', render: (id) => <Tag>#{id}</Tag> },
    { title: '店铺资料', render: (_, row) => <span><Text strong>{row.merchant_name}</Text><br /><Text type="secondary">{row.announcement || '-'}</Text></span> },
    { title: '账号/店铺', render: (_, row) => `账号 #${row.admin_id} / 店铺 ${row.merchant_id ? `#${row.merchant_id}` : '-'}` },
    { title: '状态', dataIndex: 'status', render: (status) => <StatusTag status={status} /> },
    { title: '操作', render: (_, row) => (
      <Space>
        <Button type="primary" disabled={row.status === 'approved'} onClick={() => auditApplication(row.id, true)}>通过</Button>
        <Button danger disabled={row.status === 'approved'} onClick={() => auditApplication(row.id, false)}>拒绝</Button>
      </Space>
    ) },
  ]

  const productColumns: ColumnsType<Product> = [
    { title: '商品', render: (_, row) => <span><Text strong>{row.name}</Text><br /><Text type="secondary">商品 #{row.id} / 店铺 #{row.merchant.id} / 分类 #{row.category_id ?? '-'}</Text></span> },
    { title: '状态', dataIndex: 'status', render: (status) => <StatusTag status={status} /> },
    { title: 'SKU', render: (_, row) => row.skus.map((sku) => <Tag key={sku.id}>#{sku.id} ￥{yuan(sku.price_cent)} 库存 {sku.stock}</Tag>) },
    { title: '管理', render: (_, row) => <Space><Button onClick={() => productStatus(row.id, 'publish')}>上架</Button><Button danger onClick={() => productStatus(row.id, 'unpublish')}>下架</Button></Space> },
  ]

  return (
    <main className="admin-page">
      {contextHolder}
      <section className="admin-hero">
        <div>
          <Text className="eyebrow">平台管理</Text>
          <Title level={1}>商家审核、分类配置与平台监管</Title>
          <Paragraph>平台只审核商家入驻，不创建商品和店铺；商品、帖子、评论发布后由平台进行管理。</Paragraph>
        </div>
      </section>

      <Row gutter={[24, 24]}>
        <Col span={4}><Card><Statistic title="用户" value={summary?.user_count ?? 0} /></Card></Col>
        <Col span={4}><Card><Statistic title="商品" value={summary?.product_count ?? 0} /></Card></Col>
        <Col span={4}><Card><Statistic title="订单" value={summary?.order_count ?? 0} /></Card></Col>
        <Col span={4}><Card><Statistic title="成交额" value={yuan(summary?.gross_merchandise_cent)} prefix="￥" /></Card></Col>
        <Col span={4}><Card><Statistic title="待发货" value={summary?.pending_shipment_count ?? 0} /></Card></Col>
        <Col span={4}><Card><Statistic title="售后" value={summary?.after_sale_count ?? 0} /></Card></Col>

        <Col span={24}>
          <Card title="商家入驻审核">
            <Form layout="inline" onFinish={(values) => loadApplications(values.status)}>
              <Form.Item label="状态" name="status"><Select allowClear style={{ width: 150 }} options={[
                { value: 'pending', label: '待审核' },
                { value: 'approved', label: '已通过' },
                { value: 'rejected', label: '已拒绝' },
              ]} /></Form.Item>
              <Form.Item label="拒绝原因"><Input value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} /></Form.Item>
              <Button type="primary" htmlType="submit">查询</Button>
              <Button onClick={() => loadApplications()}>刷新</Button>
            </Form>
            <Table rowKey="id" columns={applicationColumns} dataSource={applications} pagination={{ pageSize: 8 }} />
          </Card>
        </Col>

        <Col span={8}>
          <Card title="分类管理">
            <Form layout="vertical" onFinish={createCategory}>
              <Form.Item label="分类名称" name="name" rules={[{ required: true }]}><Input /></Form.Item>
              <Form.Item label="父级分类 ID" name="parent_id"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
              <Form.Item label="排序" name="sort_order" initialValue={0}><InputNumber style={{ width: '100%' }} /></Form.Item>
              <Space><Button type="primary" htmlType="submit">创建分类</Button><Button onClick={loadCategories}>刷新</Button></Space>
            </Form>
            <Space wrap className="category-tags">
              {categories.map((item) => <Tag key={item.id} color="blue">#{item.id} {item.name}</Tag>)}
            </Space>
          </Card>
        </Col>

        <Col span={16}>
          <Card title="商品监管">
            <Form layout="inline" onFinish={loadProducts}>
              <Form.Item label="关键词" name="keyword"><Input /></Form.Item>
              <Form.Item label="分类 ID" name="category_id"><InputNumber min={1} /></Form.Item>
              <Form.Item label="店铺 ID" name="merchant_id"><InputNumber min={1} /></Form.Item>
              <Button type="primary" htmlType="submit">查询</Button>
              <Button onClick={() => loadProducts()}>刷新</Button>
            </Form>
            <Table rowKey="id" columns={productColumns} dataSource={products} pagination={{ pageSize: 8 }} />
          </Card>
        </Col>

        <Col span={24}>
          <Card title="订单管理">
            <Form layout="inline" onFinish={loadOrders}>
              <Form.Item label="状态" name="status"><Select allowClear style={{ width: 160 }} options={[
                { value: 'pending_payment', label: '待支付' },
                { value: 'pending_shipment', label: '待发货' },
                { value: 'shipping', label: '待收货' },
                { value: 'completed', label: '已完成' },
              ]} /></Form.Item>
              <Button type="primary" htmlType="submit">查询</Button>
              <Button onClick={() => loadOrders()}>刷新</Button>
              <Button onClick={() => run('导出订单 CSV', () => http.get('/admin/orders/export', { responseType: 'text', headers: { 'X-Admin-Session': SESSION } }))}>导出 CSV</Button>
            </Form>
            <Table
              rowKey="id"
              dataSource={orders}
              pagination={{ pageSize: 8 }}
              columns={[
                { title: '订单', dataIndex: 'order_no', render: (value, row) => <span>{value}<br /><Text type="secondary">#{row.id}</Text></span> },
                { title: '用户/店铺', render: (_, row) => `用户 #${row.user_id} / 店铺 #${row.merchant_id}` },
                { title: '金额', dataIndex: 'pay_amount_cent', render: (value) => `￥${yuan(value)}` },
                { title: '状态', dataIndex: 'status', render: (status) => <StatusTag status={status} /> },
              ]}
            />
          </Card>
        </Col>

        <Col span={24}>
          <Card title="平台优惠券">
            <Form layout="inline" onFinish={createCoupon} initialValues={{ scope_type: 'all', discount_yuan: 5, min_yuan: 20, total_quantity: 100 }}>
              <Form.Item label="名称" name="name" rules={[{ required: true }]}><Input /></Form.Item>
              <Form.Item label="范围" name="scope_type"><Select style={{ width: 130 }} options={[
                { value: 'all', label: '全平台' },
                { value: 'category', label: '分类' },
                { value: 'product', label: '商品' },
                { value: 'sku', label: 'SKU' },
              ]} /></Form.Item>
              <Form.Item label="范围 ID" name="scope_ids"><Input placeholder="逗号分隔" /></Form.Item>
              <Form.Item label="优惠" name="discount_yuan"><InputNumber min={0} precision={2} /></Form.Item>
              <Form.Item label="门槛" name="min_yuan"><InputNumber min={0} precision={2} /></Form.Item>
              <Form.Item label="数量" name="total_quantity"><InputNumber min={1} /></Form.Item>
              <Button type="primary" htmlType="submit">创建</Button>
              <Button onClick={loadCoupons}>刷新</Button>
            </Form>
            <Form layout="inline" className="query-form">
              <Form.Item label="批量发券用户 ID"><Input value={grantUserIds} onChange={(event) => setGrantUserIds(event.target.value)} /></Form.Item>
            </Form>
            <Table
              rowKey="id"
              dataSource={coupons}
              pagination={{ pageSize: 6 }}
              columns={[
                { title: '券 ID', dataIndex: 'id', render: (id) => <Tag>#{id}</Tag> },
                { title: '名称', dataIndex: 'name' },
                { title: '范围', render: (_, row) => `${row.scope_type} ${row.scope_ids?.join(',') || ''}` },
                { title: '优惠', render: (_, row) => `满 ￥${yuan(row.min_amount_cent)} 减 ￥${yuan(row.discount_value)}` },
                { title: '领取', render: (_, row) => `${row.claimed_quantity}/${row.total_quantity}` },
                { title: '状态', dataIndex: 'status', render: (status) => <StatusTag status={status} /> },
                { title: '操作', render: (_, row) => (
                  <Space>
                    <Button onClick={() => run('批量发券', () => http.post(`/admin/promotions/coupons/${row.id}/batch-grant`, { user_ids: ids(grantUserIds) }, { headers: { 'X-Admin-Session': SESSION } }))}>批量发券</Button>
                    <Button danger onClick={() => run('停用优惠券', () => http.post(`/admin/promotions/coupons/${row.id}/disable`, undefined, { headers: { 'X-Admin-Session': SESSION } })).then(loadCoupons)}>停用</Button>
                  </Space>
                ) },
              ]}
            />
          </Card>
        </Col>

        <Col span={24}>
          <Card title="社区管理">
            <Button onClick={loadPosts}>刷新社区内容</Button>
            <Table
              rowKey="id"
              dataSource={posts}
              pagination={{ pageSize: 8 }}
              columns={[
                { title: '帖子 ID', dataIndex: 'id', render: (id) => <Tag>#{id}</Tag> },
                { title: '标题', dataIndex: 'title' },
                { title: '类型', dataIndex: 'type' },
                { title: '状态', dataIndex: 'status', render: (status) => <StatusTag status={status} /> },
                { title: '互动', render: (_, row) => `赞 ${row.like_count} / 评 ${row.comment_count}` },
                { title: '管理', render: (_, row) => <Button danger onClick={() => hidePost(row.id)}>隐藏</Button> },
              ]}
            />
          </Card>
        </Col>
      </Row>

      <DebugLogs logs={logs} />
    </main>
  )
}
