import {
  Button,
  Card,
  Col,
  Empty,
  Image,
  Input,
  InputNumber,
  Pagination,
  Row,
  Select,
  Skeleton,
  Space,
  Tag,
  Typography,
  message,
} from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getApiErrorMessage } from '../../services/http'
import {
  productService,
  type Category,
  type ProductListItem,
} from '../../services/product'
import { absoluteAssetUrl, yuan } from '../../utils/format'

const { Text } = Typography

type CategoryTreeItem = Category & {
  label: string
  depth: number
  parentName?: string
}

type PageData<T> = {
  list?: T[]
  total?: number
  page?: number
  page_size?: number
}

export function ProductPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryId, setCategoryId] = useState<number | undefined>()
  const [keyword, setKeyword] = useState('')
  const [minPriceYuan, setMinPriceYuan] = useState<number | null>(null)
  const [maxPriceYuan, setMaxPriceYuan] = useState<number | null>(null)
  const [productSort, setProductSort] = useState('newest:desc')
  const [products, setProducts] = useState<ProductListItem[]>([])
  const [productPage, setProductPage] = useState(1)
  const [productPageSize, setProductPageSize] = useState(12)
  const [productTotal, setProductTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  const categoryTree = useMemo<CategoryTreeItem[]>(() => {
    const childrenByParent = new Map<number | null, Category[]>()
    categories.forEach((category) => {
      const parentId = category.parent_id ?? null
      childrenByParent.set(parentId, [...(childrenByParent.get(parentId) ?? []), category])
    })
    childrenByParent.forEach((items) => items.sort((a, b) => a.sort_order - b.sort_order || a.id - b.id))
    const walk = (parent: Category, depth: number, ancestors: string[]): CategoryTreeItem[] => {
      const labelParts = [...ancestors, parent.name]
      const children = childrenByParent.get(parent.id) ?? []
      return [
        {
          ...parent,
          label: labelParts.join(' / '),
          depth,
          parentName: ancestors[ancestors.length - 1],
        },
        ...children.flatMap((child) => walk(child, depth + 1, labelParts)),
      ]
    }
    return (childrenByParent.get(null) ?? []).flatMap((parent) => walk(parent, 1, []))
  }, [categories])

  async function loadCategories() {
    try {
      const response = await productService.listCategories()
      setCategories((response.data as Category[]) ?? [])
    } catch (error) {
      message.error(`分类列表加载失败：${getApiErrorMessage(error)}`)
    }
  }

  async function loadProducts(nextCategoryId = categoryId, nextPage = productPage, nextPageSize = productPageSize) {
    const [sortBy, sortOrder] = productSort.split(':')
    setLoading(true)
    try {
      const response = await productService.listProducts({
        keyword: keyword || undefined,
        category_id: nextCategoryId,
        min_price_cent: minPriceYuan === null ? undefined : Math.round(minPriceYuan * 100),
        max_price_cent: maxPriceYuan === null ? undefined : Math.round(maxPriceYuan * 100),
        sort_by: sortBy,
        sort_order: sortOrder,
        page: nextPage,
        page_size: nextPageSize,
      })
      const data = response.data as PageData<ProductListItem>
      setProducts(data?.list ?? [])
      setProductTotal(data?.total ?? 0)
      setProductPage(data?.page ?? nextPage)
      setProductPageSize(data?.page_size ?? nextPageSize)
    } catch (error) {
      message.error(`商品列表加载失败：${getApiErrorMessage(error)}`)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadCategories()
    void loadProducts(undefined, 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    void loadProducts(categoryId, 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, minPriceYuan, maxPriceYuan, productSort])

  return (
    <main style={{ padding: 16 }}>
      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Card title="商品筛选" size="small">
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <div>
                <Text type="secondary">分类</Text>
                <div style={{ marginTop: 8 }}>
                  <Button
                    block
                    type={categoryId === undefined ? 'primary' : 'default'}
                    style={{ textAlign: 'left', marginBottom: 6 }}
                    onClick={() => setCategoryId(undefined)}
                  >
                    全部商品
                  </Button>
                  {categoryTree.map((category) => (
                    <Button
                      key={category.id}
                      block
                      type={categoryId === category.id ? 'primary' : 'default'}
                      style={{ textAlign: 'left', marginBottom: 6, paddingLeft: 8 + (category.depth - 1) * 16 }}
                      title={category.label}
                      onClick={() => setCategoryId(category.id)}
                    >
                      <span>
                        #{category.id} {category.name}
                        {category.depth > 1 ? <Text type="secondary" style={{ fontSize: 12 }}> · {category.parentName}</Text> : null}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Text type="secondary">价格范围（元）</Text>
                <Space.Compact style={{ width: '100%', marginTop: 8 }}>
                  <InputNumber
                    min={0}
                    precision={2}
                    placeholder="最低价"
                    value={minPriceYuan ?? undefined}
                    onChange={(value) => setMinPriceYuan(value === null ? null : Number(value))}
                    style={{ width: '50%' }}
                  />
                  <InputNumber
                    min={0}
                    precision={2}
                    placeholder="最高价"
                    value={maxPriceYuan ?? undefined}
                    onChange={(value) => setMaxPriceYuan(value === null ? null : Number(value))}
                    style={{ width: '50%' }}
                  />
                </Space.Compact>
              </div>
              <div>
                <Text type="secondary">排序方式</Text>
                <Select
                  style={{ width: '100%', marginTop: 8 }}
                  value={productSort}
                  onChange={setProductSort}
                  options={[
                    { value: 'newest:desc', label: '最新上架' },
                    { value: 'price:asc', label: '价格升序' },
                    { value: 'price:desc', label: '价格降序' },
                    { value: 'sales:desc', label: '销量优先' },
                  ]}
                />
              </div>
              <Button block onClick={() => loadProducts(categoryId, 1)}>刷新商品</Button>
            </Space>
          </Card>
        </Col>

        <Col span={18}>
          <Card
            title="商品商城"
            extra={
              <Input.Search
                allowClear
                placeholder="搜索商品"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                onSearch={() => loadProducts(categoryId, 1)}
                style={{ width: 220 }}
              />
            }
          >
            <Skeleton loading={loading} active>
              {products.length === 0 ? (
                <Empty description="暂无商品" />
              ) : (
                <Row gutter={[16, 16]}>
                  {products.map((product) => (
                    <Col span={8} key={product.id}>
                      <Link to={`/products/${product.id}`}>
                        <Card
                          hoverable
                          cover={
                            product.cover_url ? (
                              <Image preview={false} src={absoluteAssetUrl(product.cover_url)} style={{ height: 180, objectFit: 'cover' }} />
                            ) : (
                              <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa' }}>
                                <Text type="secondary">商品图</Text>
                              </div>
                            )
                          }
                        >
                          <Space direction="vertical" size={6} style={{ width: '100%' }}>
                            <Space wrap>
                              <Tag color="blue">商品 #{product.id}</Tag>
                              <Tag color="purple">店铺 #{product.merchant_id}</Tag>
                            </Space>
                            <Text strong ellipsis style={{ display: 'block' }}>{product.name}</Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>{product.merchant_name}</Text>
                            <Space size={8} align="baseline">
                              <Text style={{ color: '#f50', fontSize: 18 }}>￥{yuan(product.price_cent)}</Text>
                              {product.market_price_cent ? (
                                <Text delete type="secondary">￥{yuan(product.market_price_cent)}</Text>
                              ) : null}
                            </Space>
                            {product.tags.length > 0 ? (
                              <Space wrap size={4}>
                                {product.tags.map((tag) => (
                                  <Tag key={tag}>{tag}</Tag>
                                ))}
                              </Space>
                            ) : null}
                            <Text type="secondary" style={{ fontSize: 12 }}>销量 {product.sales_count}</Text>
                            <Button type="link" style={{ padding: 0 }}>查看详情</Button>
                          </Space>
                        </Card>
                      </Link>
                    </Col>
                  ))}
                </Row>
              )}
              <div style={{ marginTop: 16, textAlign: 'right' }}>
                <Pagination
                  current={productPage}
                  pageSize={productPageSize}
                  total={productTotal}
                  showSizeChanger
                  showTotal={(total) => `共 ${total} 件商品`}
                  onChange={(page, pageSize) => loadProducts(categoryId, page, pageSize)}
                />
              </div>
            </Skeleton>
          </Card>
        </Col>
      </Row>
    </main>
  )
}
