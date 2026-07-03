import { Button, Card, Col, Drawer, Empty, Image, InputNumber, Row, Select, Skeleton, Space, Statistic, Tag, Typography, message } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { orderService } from '../../services/order'
import {
  productService,
  type Merchant,
  type MerchantFollowStatus,
  type ProductDetail,
  type ProductListItem,
} from '../../services/product'
import { promotionService, type CouponTemplate } from '../../services/promotion'

const { Title, Text, Paragraph } = Typography

function yuan(valueCent?: number | null) {
  return ((valueCent ?? 0) / 100).toFixed(2)
}

function absoluteAssetUrl(url?: string | null) {
  if (!url) return undefined
  if (/^https?:\/\//.test(url)) return url
  return `http://localhost:8000${url}`
}

function pickErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    return response?.data?.message
  }
  return undefined
}

export function MerchantPage() {
  const { merchantId } = useParams()
  const numericMerchantId = Number(merchantId)
  const [merchant, setMerchant] = useState<Merchant | null>(null)
  const [products, setProducts] = useState<ProductListItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [minPriceYuan, setMinPriceYuan] = useState<number | null>(null)
  const [maxPriceYuan, setMaxPriceYuan] = useState<number | null>(null)
  const [sort, setSort] = useState('newest:desc')
  const [selectedProduct, setSelectedProduct] = useState<ProductDetail | null>(null)
  const [selectedSkuId, setSelectedSkuId] = useState<number>()
  const [quantity, setQuantity] = useState(1)
  const [coupons, setCoupons] = useState<CouponTemplate[]>([])
  const [followStatus, setFollowStatus] = useState<MerchantFollowStatus | null>(null)

  const selectedSku = useMemo(() => {
    return selectedProduct?.skus.find((sku) => sku.id === selectedSkuId) ?? selectedProduct?.skus[0]
  }, [selectedProduct, selectedSkuId])

  const selectedProductImages = useMemo(() => {
    if (!selectedProduct) return []
    const urls = [...selectedProduct.images]
    if (selectedProduct.cover_url && !urls.includes(selectedProduct.cover_url)) {
      urls.unshift(selectedProduct.cover_url)
    }
    return urls
  }, [selectedProduct])

  async function loadMerchant() {
    if (!Number.isFinite(numericMerchantId) || numericMerchantId <= 0) return
    setLoading(true)
    try {
      const [merchantResponse, productResponse, followResponse] = await Promise.all([
        productService.getMerchant(numericMerchantId),
        productService.listMerchantProducts(numericMerchantId, buildProductParams()),
        productService.getMerchantFollowStatus(numericMerchantId),
      ])
      setMerchant(merchantResponse.data)
      setProducts(productResponse.data.list)
      setTotal(productResponse.data.total)
      setFollowStatus(followResponse.data)
    } catch (error) {
      message.error(pickErrorMessage(error) ?? '店铺信息加载失败')
    } finally {
      setLoading(false)
    }
  }

  async function loadCoupons() {
    if (!Number.isFinite(numericMerchantId) || numericMerchantId <= 0) return
    try {
      const response = await promotionService.listCoupons({ merchant_id: numericMerchantId })
      setCoupons(response.data)
    } catch (error) {
      message.error(pickErrorMessage(error) ?? '店铺优惠券加载失败')
    }
  }

  async function claimCoupon(couponId: number) {
    try {
      await promotionService.claimCoupon(couponId)
      message.success('优惠券领取成功')
      await loadCoupons()
    } catch (error) {
      message.error(pickErrorMessage(error) ?? '领取失败，请确认已登录且未超过领取限制')
    }
  }

  async function toggleFollow() {
    try {
      const response = followStatus?.followed
        ? await productService.unfollowMerchant(numericMerchantId)
        : await productService.followMerchant(numericMerchantId)
      setFollowStatus(response.data)
      message.success(response.data.followed ? '已关注店铺' : '已取消关注')
    } catch (error) {
      message.error(pickErrorMessage(error) ?? '请先登录用户账号')
    }
  }

  function buildProductParams() {
    const [sortBy, sortOrder] = sort.split(':')
    return {
      min_price_cent: minPriceYuan === null ? undefined : Math.round(minPriceYuan * 100),
      max_price_cent: maxPriceYuan === null ? undefined : Math.round(maxPriceYuan * 100),
      sort_by: sortBy,
      sort_order: sortOrder,
      page: 1,
      page_size: 24,
    }
  }

  async function openProduct(productId: number) {
    try {
      const response = await productService.getProduct(productId)
      setSelectedProduct(response.data)
      setSelectedSkuId(response.data.skus[0]?.id)
      setQuantity(1)
    } catch (error) {
      message.error(pickErrorMessage(error) ?? '商品详情加载失败')
    }
  }

  async function addCart() {
    if (!selectedSku) {
      message.warning('请先选择 SKU')
      return
    }
    try {
      await orderService.addCartItem({ sku_id: selectedSku.id, quantity })
      message.success('已加入购物车')
    } catch (error) {
      message.error(pickErrorMessage(error) ?? '加入购物车失败，请确认已登录用户账号')
    }
  }

  useEffect(() => {
    void loadMerchant()
    void loadCoupons()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numericMerchantId])

  if (!Number.isFinite(numericMerchantId) || numericMerchantId <= 0) {
    return (
      <main className="shop-page">
        <Card>
          <Empty description="店铺 ID 不正确" />
        </Card>
      </main>
    )
  }

  return (
    <main className="shop-page">
      <section className="shop-hero merchant-hero">
        <Skeleton loading={loading && !merchant} active>
          <Space size={24} align="center" wrap>
            {merchant?.logo_url ? (
              <Image width={88} height={88} preview={false} src={absoluteAssetUrl(merchant.logo_url)} className="merchant-logo" />
            ) : (
              <div className="merchant-logo-placeholder">店</div>
            )}
            <Space direction="vertical" size={8}>
              <Text className="eyebrow">店铺主页</Text>
              <Title level={1} style={{ margin: 0 }}>{merchant?.name ?? `店铺 #${numericMerchantId}`}</Title>
              <Space wrap>
                <Tag color="purple">店铺 ID #{numericMerchantId}</Tag>
                <Tag color="blue">在售商品 {total}</Tag>
                <Tag color="geekblue">关注 {followStatus?.follower_count ?? 0}</Tag>
              </Space>
              <Paragraph style={{ margin: 0 }}>
                {merchant?.announcement || '店铺暂未填写公告，后续可扩展店铺介绍、客服入口、店铺活动和关注能力。'}
              </Paragraph>
              <Button type={followStatus?.followed ? 'default' : 'primary'} onClick={toggleFollow}>
                {followStatus?.followed ? '已关注，点击取消' : '关注店铺'}
              </Button>
            </Space>
          </Space>
        </Skeleton>
      </section>

      <Row gutter={[24, 24]}>
        <Col span={6}>
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Card title="店铺筛选">
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <Statistic title="商品总数" value={total} />
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  precision={2}
                  placeholder="最低价"
                  addonAfter="元"
                  value={minPriceYuan}
                  onChange={setMinPriceYuan}
                />
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  precision={2}
                  placeholder="最高价"
                  addonAfter="元"
                  value={maxPriceYuan}
                  onChange={setMaxPriceYuan}
                />
                <Select
                  style={{ width: '100%' }}
                  value={sort}
                  onChange={setSort}
                  options={[
                    { value: 'newest:desc', label: '最新上架' },
                    { value: 'price:asc', label: '价格升序' },
                    { value: 'price:desc', label: '价格降序' },
                    { value: 'sales:desc', label: '销量优先' },
                  ]}
                />
                <Button type="primary" block onClick={loadMerchant}>查询店铺商品</Button>
                <Link to="/">
                  <Button block>返回商城首页</Button>
                </Link>
              </Space>
            </Card>

            <Card title="店铺优惠券" extra={<Button size="small" onClick={loadCoupons}>刷新</Button>}>
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                {coupons.length === 0 ? (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无可领取优惠券" />
                ) : coupons.map((coupon) => {
                  const leftCount = coupon.total_quantity === 0 ? '不限' : coupon.total_quantity - coupon.claimed_quantity
                  return (
                    <Card size="small" key={coupon.id} className="coupon-mini-card">
                      <Space direction="vertical" size={6} style={{ width: '100%' }}>
                        <Space wrap>
                          <Tag color={coupon.scope_type === 'merchant' ? 'purple' : 'blue'}>
                            {coupon.scope_type === 'merchant' ? '本店可用' : '平台通用'}
                          </Tag>
                          <Tag>券 #{coupon.id}</Tag>
                        </Space>
                        <Text strong>{coupon.name}</Text>
                        <Text className="price">满 ￥{yuan(coupon.min_amount_cent)} 减 ￥{yuan(coupon.discount_value)}</Text>
                        <Text type="secondary">剩余 {leftCount} / 每人限领 {coupon.per_user_limit}</Text>
                        <Button
                          type="primary"
                          block
                          disabled={coupon.total_quantity !== 0 && coupon.claimed_quantity >= coupon.total_quantity}
                          onClick={() => claimCoupon(coupon.id)}
                        >
                          领取
                        </Button>
                      </Space>
                    </Card>
                  )
                })}
              </Space>
            </Card>
          </Space>
        </Col>

        <Col span={18}>
          <Card
            title="店铺商品"
            extra={<Button onClick={loadMerchant}>刷新</Button>}
          >
            <Skeleton loading={loading} active>
              {products.length === 0 ? (
                <Empty description="当前店铺暂无符合条件的在售商品" />
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
                        actions={[
                          <Button type="link" onClick={() => openProduct(product.id)}>查看详情</Button>,
                        ]}
                      >
                        <Space direction="vertical" size={8}>
                          <Space wrap>
                            <Tag color="blue">商品 #{product.id}</Tag>
                            <Tag>销量 {product.sales_count}</Tag>
                          </Space>
                          <Text strong>{product.name}</Text>
                          <Space size={8} align="baseline">
                            <Text className="price">￥{yuan(product.price_cent)}</Text>
                            {product.market_price_cent ? (
                              <Text delete type="secondary">￥{yuan(product.market_price_cent)}</Text>
                            ) : null}
                          </Space>
                        </Space>
                      </Card>
                    </Col>
                  ))}
                </Row>
              )}
            </Skeleton>
          </Card>
        </Col>
      </Row>

      <Drawer
        title="商品详情"
        width={980}
        open={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        destroyOnClose
      >
        {selectedProduct ? (
          <Row gutter={[28, 28]} className="product-detail-layout">
            <Col span={11}>
              {selectedProductImages[0] ? (
                <Image className="detail-image" src={absoluteAssetUrl(selectedProductImages[0])} />
              ) : (
                <div className="product-cover detail-image">商品图</div>
              )}
              {selectedProductImages.length > 1 ? (
                <Space wrap className="detail-gallery">
                  {selectedProductImages.slice(1).map((url, index) => (
                    <Image key={`${url}-${index}`} width={86} height={86} src={absoluteAssetUrl(url)} />
                  ))}
                </Space>
              ) : null}
            </Col>
            <Col span={13}>
              <Space direction="vertical" size={18} style={{ width: '100%' }}>
                <Space wrap>
                  <Tag color="blue">商品 #{selectedProduct.id}</Tag>
                  <Tag color="purple">店铺 #{selectedProduct.merchant.id}</Tag>
                  <Tag>分类 #{selectedProduct.category_id ?? '-'}</Tag>
                  <Tag color="gold">
                    {selectedProduct.review_summary.average_score ?? '-'} 分 / {selectedProduct.review_summary.count} 评
                  </Tag>
                </Space>
                <Title level={2}>{selectedProduct.name}</Title>
                <Space size={12} align="baseline">
                  <Text className="detail-price">￥{yuan(selectedSku?.price_cent)}</Text>
                  {selectedSku?.market_price_cent ? (
                    <Text delete type="secondary">￥{yuan(selectedSku.market_price_cent)}</Text>
                  ) : null}
                </Space>
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
                  <Link to="/cart">
                    <Button size="large">去购物车</Button>
                  </Link>
                </Space>
                <Card size="small" title="图文详情">
                  <Paragraph style={{ whiteSpace: 'pre-line' }}>{selectedProduct.description || '暂无描述'}</Paragraph>
                  {selectedProductImages.length ? (
                    <Space direction="vertical" size={12} className="detail-content-images">
                      {selectedProductImages.map((url, index) => (
                        <Image key={`${url}-content-${index}`} src={absoluteAssetUrl(url)} />
                      ))}
                    </Space>
                  ) : null}
                </Card>
              </Space>
            </Col>
          </Row>
        ) : null}
      </Drawer>
    </main>
  )
}
