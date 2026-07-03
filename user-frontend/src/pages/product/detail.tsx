import {
  Avatar,
  Button,
  Card,
  Col,
  Empty,
  Image,
  InputNumber,
  List,
  Rate,
  Row,
  Select,
  Skeleton,
  Space,
  Tag,
  Typography,
  message,
} from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { authService } from '../../services/auth'
import { getApiErrorMessage } from '../../services/http'
import { orderService } from '../../services/order'
import {
  productService,
  type ProductDetail,
  type ProductFavoriteStatus,
  type ProductReview,
} from '../../services/product'
import { absoluteAssetUrl, yuan } from '../../utils/format'

const { Title, Text, Paragraph } = Typography

type PageData<T> = {
  list?: T[]
  total?: number
  page?: number
  page_size?: number
}

export function ProductDetailPage() {
  const params = useParams<{ productId: string }>()
  const productId = params.productId ? Number(params.productId) : NaN

  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [reviews, setReviews] = useState<ProductReview[]>([])
  const [reviewFilterScore, setReviewFilterScore] = useState<number | undefined>()
  const [reviewOnlyWithImage, setReviewOnlyWithImage] = useState(false)
  const [selectedSkuId, setSelectedSkuId] = useState<number | undefined>()
  const [quantity, setQuantity] = useState(1)
  const [favoriteStatus, setFavoriteStatus] = useState<ProductFavoriteStatus | null>(null)
  const [loading, setLoading] = useState(false)

  const selectedSku = useMemo(() => {
    return product?.skus.find((sku) => sku.id === selectedSkuId) ?? product?.skus[0]
  }, [product, selectedSkuId])

  const productImages = useMemo(() => {
    if (!product) return []
    const urls = [...product.images]
    if (product.cover_url && !urls.includes(product.cover_url)) {
      urls.unshift(product.cover_url)
    }
    return urls
  }, [product])

  async function loadProduct(id: number) {
    setLoading(true)
    try {
      const [detailResponse, statusResponse] = await Promise.all([
        productService.getProduct(id).catch((error) => {
          message.error(`商品详情加载失败：${getApiErrorMessage(error)}`)
          return null
        }),
        productService.getProductFavoriteStatus(id).catch((error) => {
          message.error(`商品收藏状态加载失败：${getApiErrorMessage(error)}`)
          return null
        }),
      ])
      if (detailResponse) {
        const data = detailResponse.data as ProductDetail
        setProduct(data)
        setSelectedSkuId(data.skus[0]?.id)
        setFavoriteStatus(statusResponse ? (statusResponse.data as ProductFavoriteStatus) : null)
        await loadProductReviews(data.id)
      } else {
        setProduct(null)
      }
    } finally {
      setLoading(false)
    }
  }

  async function loadProductReviews(id: number) {
    try {
      const response = await productService.listProductReviews(id, {
        page_size: 20,
        score: reviewFilterScore,
        has_image: reviewOnlyWithImage || undefined,
      })
      const data = response.data as PageData<ProductReview>
      setReviews(data?.list ?? [])
    } catch (error) {
      message.error(`商品评价加载失败：${getApiErrorMessage(error)}`)
      setReviews([])
    }
  }

  async function toggleFavorite() {
    if (!product) return
    if (!authService.hasToken()) {
      message.warning('请先登录用户账号')
      return
    }
    try {
      const response = favoriteStatus?.favorited
        ? await productService.unfavoriteProduct(product.id)
        : await productService.favoriteProduct(product.id)
      setFavoriteStatus(response.data as ProductFavoriteStatus)
      message.success(favoriteStatus?.favorited ? '已取消收藏' : '收藏成功')
    } catch (error) {
      message.error(`${favoriteStatus?.favorited ? '取消收藏' : '收藏'}失败：${getApiErrorMessage(error)}`)
    }
  }

  async function addCart() {
    if (!selectedSku) return
    try {
      await orderService.addCartItem({
        sku_id: selectedSku.id,
        quantity,
      })
      message.success('已加入购物车')
    } catch (error) {
      message.error(`加入购物车失败：${getApiErrorMessage(error)}`)
    }
  }

  useEffect(() => {
    if (Number.isFinite(productId)) {
      setProduct(null)
      setReviews([])
      setQuantity(1)
      setReviewFilterScore(undefined)
      setReviewOnlyWithImage(false)
      void loadProduct(productId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId])

  useEffect(() => {
    if (product) {
      void loadProductReviews(product.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewFilterScore, reviewOnlyWithImage])

  if (!Number.isFinite(productId)) {
    return (
      <main style={{ padding: 16 }}>
        <Empty description="商品 ID 无效">
          <Link to="/products">返回商品列表</Link>
        </Empty>
      </main>
    )
  }

  return (
    <main style={{ padding: 16 }}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Link to="/products">← 返回商品列表</Link>

        <Skeleton loading={loading} active>
          {product ? (
            <>
              <Row gutter={[24, 24]}>
                <Col span={11}>
                  {productImages[0] ? (
                    <Image
                      src={absoluteAssetUrl(productImages[0])}
                      fallback=""
                      preview={false}
                      style={{ width: '100%', maxHeight: 360, objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: 360, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa' }}>
                      <Text type="secondary">商品图片</Text>
                    </div>
                  )}
                  {productImages.length ? (
                    <Image.PreviewGroup>
                      <Space wrap style={{ marginTop: 12 }}>
                        {productImages.map((url, index) => (
                          <Image
                            key={`${url}-${index}`}
                            width={84}
                            height={84}
                            src={absoluteAssetUrl(url)}
                            style={{ objectFit: 'cover' }}
                          />
                        ))}
                      </Space>
                    </Image.PreviewGroup>
                  ) : null}
                </Col>
                <Col span={13}>
                  <Space direction="vertical" size={16} style={{ width: '100%' }}>
                    <Space wrap>
                      <Tag color="blue">商品 #{product.id}</Tag>
                      <Link to={`/merchants/${product.merchant.id}`}>
                        <Tag color="purple">店铺 #{product.merchant.id} {product.merchant.name}</Tag>
                      </Link>
                      <Tag>分类 #{product.category_id ?? '-'}</Tag>
                      <Tag color="gold">
                        {product.review_summary.average_score ?? '-'} 分 / {product.review_summary.count} 评
                      </Tag>
                    </Space>
                    <Title level={3} style={{ margin: 0 }}>{product.name}</Title>
                    <Space size={12} align="baseline">
                      <Text style={{ color: '#f50', fontSize: 28 }}>￥{yuan(selectedSku?.price_cent)}</Text>
                      {selectedSku?.market_price_cent ? (
                        <Text delete type="secondary">￥{yuan(selectedSku.market_price_cent)}</Text>
                      ) : null}
                    </Space>
                    <div>
                      <Text type="secondary">选择规格</Text>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                        {product.skus.map((sku) => (
                          <Button
                            key={sku.id}
                            type={selectedSkuId === sku.id ? 'primary' : 'default'}
                            onClick={() => setSelectedSkuId(sku.id)}
                            disabled={sku.stock <= 0}
                          >
                            {sku.name} / SKU #{sku.id} / 库存 {sku.stock}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <Space>
                      <Text type="secondary">购买数量</Text>
                      <InputNumber min={1} value={quantity} onChange={(value) => setQuantity(Number(value) || 1)} />
                    </Space>
                    <Space wrap>
                      <Button type="primary" size="large" onClick={addCart} disabled={!selectedSku || selectedSku.stock <= 0}>
                        加入购物车
                      </Button>
                      <Button size="large" onClick={toggleFavorite}>
                        {favoriteStatus?.favorited ? '已收藏，点击取消' : '收藏商品'}
                      </Button>
                      <Tag color="magenta">收藏 {favoriteStatus?.favorite_count ?? 0}</Tag>
                    </Space>
                  </Space>
                </Col>
              </Row>

              <Card size="small" title="图文详情">
                <Paragraph style={{ whiteSpace: 'pre-line' }}>{product.description || '暂无描述'}</Paragraph>
                {productImages.length ? (
                  <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    {productImages.map((url, index) => (
                      <Image key={`${url}-content-${index}`} src={absoluteAssetUrl(url)} style={{ width: '100%' }} />
                    ))}
                  </Space>
                ) : null}
              </Card>

              <Card
                size="small"
                title="评价区"
                extra={
                  <Space wrap>
                    <Select
                      allowClear
                      style={{ width: 120 }}
                      placeholder="评分筛选"
                      value={reviewFilterScore}
                      onChange={setReviewFilterScore}
                      options={[5, 4, 3, 2, 1].map((score) => ({ value: score, label: `${score} 星` }))}
                    />
                    <Button
                      type={reviewOnlyWithImage ? 'primary' : 'default'}
                      onClick={() => setReviewOnlyWithImage((value) => !value)}
                    >
                      只看有图
                    </Button>
                    {product ? (
                      <Button size="small" onClick={() => loadProductReviews(product.id)}>刷新评价</Button>
                    ) : null}
                  </Space>
                }
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Space wrap>
                    <Tag color="gold">
                      平均 {product.review_summary.average_score ?? '-'} 分
                    </Tag>
                    <Tag>共 {product.review_summary.count} 条评价</Tag>
                  </Space>
                  <List
                    size="small"
                    dataSource={reviews}
                    locale={{ emptyText: '暂无公开评价' }}
                    renderItem={(review) => (
                      <List.Item>
                        <Space direction="vertical" size={6} style={{ width: '100%' }}>
                          <Space wrap>
                            <Rate disabled value={review.score} />
                            <Space size={6}>
                              <Avatar size="small" src={absoluteAssetUrl(review.user_avatar_url)}>
                                {review.user_nickname?.[0] ?? '用'}
                              </Avatar>
                              <Text type="secondary">{review.user_nickname || `用户 #${review.user_id}`}</Text>
                            </Space>
                          </Space>
                          <Text>{review.content || '用户未填写文字评价'}</Text>
                          {review.image_urls.length ? (
                            <Image.PreviewGroup>
                              <Space wrap>
                                {review.image_urls.map((url) => (
                                  <Image key={url} width={72} height={72} src={absoluteAssetUrl(url)} />
                                ))}
                              </Space>
                            </Image.PreviewGroup>
                          ) : null}
                        </Space>
                      </List.Item>
                    )}
                  />
                </Space>
              </Card>
            </>
          ) : (
            <Empty description="商品不存在或已下架">
              <Link to="/products">返回商品列表</Link>
            </Empty>
          )}
        </Skeleton>
      </Space>
    </main>
  )
}
