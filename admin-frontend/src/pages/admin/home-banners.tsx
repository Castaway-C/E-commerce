import { Button, Card, Form, Image, Input, InputNumber, Popconfirm, Select, Space, Switch, Table, Tag, Typography, Upload, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useState } from 'react'
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined, UploadOutlined } from '@ant-design/icons'

import { http } from '../../services/http'
import { adminHomeService, type HomeBanner, type HomeBannerPayload } from '../../services/home'
import { uploadService } from '../../services/upload'
import { SESSION, type PageResult, type Product } from './shared'

const { Text, Title } = Typography

type BannerFormValues = HomeBannerPayload

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1'

function assetUrl(url?: string | null) {
  if (!url) return undefined
  if (/^https?:\/\//.test(url)) return url
  if (url.startsWith('data:') || url.startsWith('blob:')) return url
  const apiBase = String(API_BASE_URL)
  const assetOrigin = /^https?:\/\//.test(apiBase)
    ? apiBase.replace(/\/api\/v\d+\/?$/, '').replace(/\/$/, '')
    : 'http://localhost:8000'
  return `${assetOrigin}${url.startsWith('/') ? url : `/${url}`}`
}

function getApiErrorMessage(error: unknown) {
  const payload = error as { response?: { data?: { message?: string } }; message?: string }
  return payload.response?.data?.message ?? payload.message ?? '请求失败'
}

export function AdminHomeBannersPage() {
  const [form] = Form.useForm<BannerFormValues>()
  const [banners, setBanners] = useState<HomeBanner[]>([])
  const [editingBanner, setEditingBanner] = useState<HomeBanner | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [productOptions, setProductOptions] = useState<Array<{ value: number; label: string }>>([])
  const [productLoading, setProductLoading] = useState(false)

  function formatProductOption(product: Product) {
    const merchantName = product.merchant?.name ? ` / ${product.merchant.name}` : ''
    return { value: product.id, label: `#${product.id} ${product.name}${merchantName}` }
  }

  async function searchProducts(keyword = '') {
    setProductLoading(true)
    try {
      const response = await http.get<unknown, { data: PageResult<Product> }>('/admin/products', {
        params: { keyword: keyword || undefined, page_size: 30, sort_by: 'newest', sort_order: 'desc' },
        headers: { 'X-Admin-Session': SESSION },
      })
      setProductOptions((response.data?.list ?? []).map(formatProductOption))
    } catch (error) {
      message.error(`加载商品选项失败：${getApiErrorMessage(error)}`)
    } finally {
      setProductLoading(false)
    }
  }

  async function ensureProductOption(productId?: number | null) {
    if (!productId || productOptions.some((option) => option.value === productId)) return
    try {
      const response = await http.get<unknown, { data: Product }>(`/admin/products/${productId}`, {
        headers: { 'X-Admin-Session': SESSION },
      })
      const product = response.data
      if (!product) return
      setProductOptions((items) =>
        items.some((item) => item.value === product.id) ? items : [formatProductOption(product), ...items],
      )
    } catch {
      setProductOptions((items) =>
        items.some((item) => item.value === productId) ? items : [{ value: productId, label: `商品 #${productId}` }, ...items],
      )
    }
  }

  async function loadBanners() {
    setLoading(true)
    try {
      const response = await adminHomeService.listBanners()
      setBanners(response.data ?? [])
    } catch (error) {
      message.error(`加载首页轮播失败：${getApiErrorMessage(error)}`)
    } finally {
      setLoading(false)
    }
  }

  async function submitBanner(values: BannerFormValues) {
    setSubmitting(true)
    const payload: HomeBannerPayload = {
      title: values.title ?? '',
      subtitle: values.subtitle || null,
      image_url: values.image_url,
      target_type: values.target_type ?? 'none',
      target_id: values.target_type === 'product' ? values.target_id : null,
      target_url: values.target_type === 'url' ? values.target_url : null,
      sort_order: values.sort_order ?? 0,
      is_active: values.is_active ?? true,
    }
    try {
      if (editingBanner) {
        await adminHomeService.updateBanner(editingBanner.id, payload)
        message.success('轮播图已更新')
      } else {
        await adminHomeService.createBanner(payload)
        message.success('轮播图已创建')
      }
      form.resetFields()
      form.setFieldValue('target_type', 'none')
      form.setFieldValue('is_active', true)
      setEditingBanner(null)
      await loadBanners()
    } catch (error) {
      message.error(`保存轮播图失败：${getApiErrorMessage(error)}`)
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteBanner(bannerId: number) {
    try {
      await adminHomeService.deleteBanner(bannerId)
      message.success('轮播图已删除')
      if (editingBanner?.id === bannerId) setEditingBanner(null)
      await loadBanners()
    } catch (error) {
      message.error(`删除轮播图失败：${getApiErrorMessage(error)}`)
    }
  }

  async function toggleBanner(banner: HomeBanner) {
    try {
      await adminHomeService.updateBanner(banner.id, { is_active: !banner.is_active })
      message.success(banner.is_active ? '轮播图已停用' : '轮播图已启用')
      await loadBanners()
    } catch (error) {
      message.error(`更新轮播图状态失败：${getApiErrorMessage(error)}`)
    }
  }

  async function uploadBannerImage(file: File) {
    setUploading(true)
    try {
      const response = await uploadService.uploadImage(file, 'platform')
      if (response.data?.url) {
        form.setFieldValue('image_url', response.data.url)
        message.success('图片已上传')
      }
    } catch (error) {
      message.error(`上传图片失败：${getApiErrorMessage(error)}`)
    } finally {
      setUploading(false)
    }
  }

  function startEdit(banner: HomeBanner) {
    setEditingBanner(banner)
    if (banner.target_type === 'product') void ensureProductOption(banner.target_id)
    form.setFieldsValue({
      title: banner.title,
      subtitle: banner.subtitle ?? '',
      image_url: banner.image_url,
      target_type: banner.target_type,
      target_id: banner.target_id ?? undefined,
      target_url: banner.target_url ?? '',
      sort_order: banner.sort_order,
      is_active: banner.is_active,
    })
  }

  useEffect(() => {
    form.setFieldValue('target_type', 'none')
    form.setFieldValue('is_active', true)
    void loadBanners()
    void searchProducts()
  }, [])

  const columns: ColumnsType<HomeBanner> = [
    {
      title: '图片',
      dataIndex: 'image_url',
      width: 180,
      render: (url: string) => <Image src={assetUrl(url)} width={150} height={72} style={{ objectFit: 'cover', borderRadius: 8 }} />,
    },
    {
      title: '内容',
      render: (_, row) => (
        <Space direction="vertical" size={2}>
          <Text strong>{row.title}</Text>
          <Text type="secondary">{row.subtitle || '-'}</Text>
          <Text type="secondary">轮播 #{row.id}</Text>
        </Space>
      ),
    },
    {
      title: '跳转',
      render: (_, row) => {
        if (row.target_type === 'product') return <Tag color="blue">商品 #{row.target_id}</Tag>
        if (row.target_type === 'url') return <Tag color="purple">链接</Tag>
        return <Tag>不跳转</Tag>
      },
    },
    { title: '排序', dataIndex: 'sort_order', width: 90 },
    {
      title: '状态',
      dataIndex: 'is_active',
      width: 100,
      render: (active: boolean) => <Tag color={active ? 'green' : 'default'}>{active ? '展示中' : '已停用'}</Tag>,
    },
    {
      title: '操作',
      width: 220,
      render: (_, row) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => startEdit(row)}>
            编辑
          </Button>
          <Button
            onClick={() => void toggleBanner(row)}
          >
            {row.is_active ? '停用' : '启用'}
          </Button>
          <Popconfirm title="删除轮播图？" okText="删除" cancelText="取消" okButtonProps={{ danger: true }} onConfirm={() => void deleteBanner(row.id)}>
            <Button danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <main className="admin-page">
      <section className="admin-hero">
        <div>
          <Text className="eyebrow">首页运营</Text>
          <Title level={1}>首页轮播</Title>
        </div>
        <Button icon={<ReloadOutlined />} onClick={() => void loadBanners()} loading={loading}>
          刷新
        </Button>
      </section>

      <Card className="section-card" title={editingBanner ? `编辑轮播 #${editingBanner.id}` : '新增轮播'}>
        <Form form={form} layout="vertical" onFinish={(values) => void submitBanner(values as BannerFormValues)}>
          <Form.Item label="标题" name="title">
            <Input placeholder="例如：夏日好物专场" />
          </Form.Item>
          <Form.Item label="副标题" name="subtitle">
            <Input placeholder="可选，用于首页轮播说明" />
          </Form.Item>
          <Form.Item label="轮播图片" required>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Form.Item name="image_url" noStyle rules={[{ required: true, message: '请上传或填写图片地址' }]}>
                <Input placeholder="图片 URL，会由上传自动填入" />
              </Form.Item>
              <Upload
                showUploadList={false}
                accept="image/*"
                disabled={uploading}
                beforeUpload={(file) => {
                  void uploadBannerImage(file)
                  return false
                }}
              >
                <Button icon={<UploadOutlined />} loading={uploading}>上传图片</Button>
              </Upload>
              <Form.Item noStyle shouldUpdate={(prev, next) => prev.image_url !== next.image_url}>
                {({ getFieldValue }) => {
                  const imageUrl = getFieldValue('image_url')
                  return imageUrl ? (
                    <Image
                      src={assetUrl(imageUrl)}
                      width={260}
                      height={110}
                      style={{ objectFit: 'cover', borderRadius: 8 }}
                    />
                  ) : null
                }}
              </Form.Item>
            </Space>
          </Form.Item>
          <Form.Item label="跳转类型" name="target_type" initialValue="none">
            <Select
              onChange={(value) => {
                form.setFieldsValue({ target_id: undefined, target_url: '' })
                if (value === 'product') void searchProducts()
              }}
              options={[
                { value: 'none', label: '不跳转' },
                { value: 'product', label: '跳转商品详情' },
                { value: 'url', label: '跳转链接' },
              ]}
            />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, next) => prev.target_type !== next.target_type}>
            {({ getFieldValue }) => {
              const targetType = getFieldValue('target_type')
              if (targetType === 'product') {
                return (
                  <Form.Item label="跳转商品" name="target_id" rules={[{ required: true, message: '请选择跳转商品' }]}>
                    <Select
                      showSearch
                      filterOption={false}
                      loading={productLoading}
                      placeholder="搜索并选择商品"
                      options={productOptions}
                      onFocus={() => void searchProducts()}
                      onSearch={(keyword) => void searchProducts(keyword)}
                    />
                  </Form.Item>
                )
              }
              if (targetType === 'url') {
                return (
                  <Form.Item label="跳转链接" name="target_url" rules={[{ required: true, message: '请输入跳转链接' }]}>
                    <Input placeholder="https://..." />
                  </Form.Item>
                )
              }
              return null
            }}
          </Form.Item>
          <Form.Item label="排序" name="sort_order" initialValue={0} tooltip="数字越小越靠前">
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="是否展示" name="is_active" valuePropName="checked" initialValue>
            <Switch checkedChildren="展示" unCheckedChildren="停用" />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" icon={<PlusOutlined />} loading={submitting} disabled={uploading}>
              {editingBanner ? '保存轮播' : '创建轮播'}
            </Button>
            <Button
              onClick={() => {
                setEditingBanner(null)
                form.resetFields()
                form.setFieldValue('target_type', 'none')
                form.setFieldValue('is_active', true)
              }}
            >
              清空
            </Button>
          </Space>
        </Form>
      </Card>

      <Card className="section-card" title="轮播列表">
        <Table rowKey="id" loading={loading} columns={columns} dataSource={banners} pagination={{ pageSize: 8 }} />
      </Card>
    </main>
  )
}
