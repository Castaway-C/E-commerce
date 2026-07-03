import { useEffect, useMemo, useState } from 'react'
import {
  Avatar,
  Button,
  Card,
  Col,
  Divider,
  Drawer,
  Empty,
  Image,
  Input,
  List,
  Modal,
  QRCode,
  Row,
  Segmented,
  Select,
  Space,
  Statistic,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd'
import type { UploadFile } from 'antd'

import {
  communityService,
  type CommunityComment,
  type CommunityPost,
  type CommunityTopic,
  type CommunityUserProfile,
} from '../../services/community'
import { getApiErrorMessage } from '../../services/http'
import { orderService } from '../../services/order'
import { productService, type ProductDetail, type ProductListItem } from '../../services/product'
import { uploadService } from '../../services/upload'
import {
  absoluteAssetUrl,
  pickErrorMessage,
  randomToken,
  splitTags,
  statusColor,
  statusText,
  yuan,
} from '../../utils/format'

const { Title, Text, Paragraph } = Typography

function productDetailToListItem(product: ProductDetail): ProductListItem {
  return {
    id: product.id,
    name: product.name,
    cover_url: product.cover_url,
    price_cent: product.skus[0]?.price_cent ?? 0,
    market_price_cent: product.skus[0]?.market_price_cent,
    merchant_id: product.merchant.id,
    merchant_name: product.merchant.name,
    sales_count: 0,
    tags: [],
  }
}

function pickData(response: unknown) {
  if (response && typeof response === 'object' && 'data' in response) {
    return (response as { data: unknown }).data
  }
  return response
}

const SECTION_OPTIONS = [
  { value: 'square', label: '综合广场' },
  { value: 'grass', label: '种草专区' },
  { value: 'merchant', label: '商家动态' },
  { value: 'help', label: '询问求助' },
  { value: 'experience', label: '体验分享' },
]

const POST_SECTION_OPTIONS = [
  { value: 'square', label: '综合广场' },
  { value: 'grass', label: '种草专区' },
  { value: 'experience', label: '体验分享' },
  { value: 'help', label: '询问求助' },
  { value: 'merchant', label: '商家动态' },
]

export function CommunityPage() {
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null)
  const [comments, setComments] = useState<CommunityComment[]>([])
  const [communityProductMap, setCommunityProductMap] = useState<Record<number, ProductListItem>>({})
  const [communitySection, setCommunitySection] = useState<string | undefined>()
  const [communityTopic, setCommunityTopic] = useState<string | undefined>()
  const [communityTopics, setCommunityTopics] = useState<CommunityTopic[]>([])
  const [selectedCommunityUser, setSelectedCommunityUser] = useState<CommunityUserProfile | null>(null)
  const [selectedCommunityUserPosts, setSelectedCommunityUserPosts] = useState<CommunityPost[]>([])
  const [postSection, setPostSection] = useState('experience')
  const [postTitle, setPostTitle] = useState('我的购物体验')
  const [postContent, setPostContent] = useState('这是一条用于社区展示的内容。')
  const [selectedPostProductIds, setSelectedPostProductIds] = useState<number[]>([])
  const [postProductSearchResults, setPostProductSearchResults] = useState<ProductListItem[]>([])
  const [postProductSearchKeyword, setPostProductSearchKeyword] = useState('')
  const [postTopicTags, setPostTopicTags] = useState('体验')
  const [postImages, setPostImages] = useState<string[]>([])
  const [commentContent, setCommentContent] = useState('这是一条评论。')
  const [alipayQrCode, setAlipayQrCode] = useState('')
  const [noticeText, setNoticeText] = useState('')

  // 种草来源下单
  const [sourcePostId, setSourcePostId] = useState('')
  const [sourceSkuId, setSourceSkuId] = useState('')

  const communityProductIds = useMemo(() => {
    const ids = new Set<number>()
    posts.forEach((post) => post.product_ids.forEach((id) => ids.add(id)))
    selectedPost?.product_ids.forEach((id) => ids.add(id))
    selectedCommunityUserPosts.forEach((post) => post.product_ids.forEach((id) => ids.add(id)))
    return Array.from(ids)
  }, [posts, selectedPost, selectedCommunityUserPosts])

  const postProductOptions = useMemo(() => {
    const map = new Map<number, ProductListItem>()
    postProductSearchResults.forEach((product) => map.set(product.id, product))
    selectedPostProductIds.forEach((id) => {
      const product = communityProductMap[id]
      if (product) map.set(id, product)
    })
    return Array.from(map.values()).map((product) => ({
      value: product.id,
      label: `#${product.id} ${product.name} / ${product.merchant_name} / ￥${yuan(product.price_cent)}`,
    }))
  }, [postProductSearchResults, selectedPostProductIds, communityProductMap])

  const uploadFiles: UploadFile[] = postImages.map((url, index) => ({
    uid: `${index}`,
    name: url.split('/').pop() || `image-${index}`,
    status: 'done',
    url: absoluteAssetUrl(url),
  }))

  async function run<T>(title: string, action: () => Promise<unknown>): Promise<T | null> {
    try {
      const response = await action()
      return pickData(response) as T
    } catch (error) {
      message.error(`${title}失败：${getApiErrorMessage(error)}`)
      return null
    }
  }

  async function loadPosts() {
    const data = await run<{ list?: CommunityPost[] }>('社区帖子', () =>
      communityService.listPosts({ section: communitySection, topic: communityTopic }),
    )
    setPosts(data?.list ?? [])
  }

  async function loadCommunityTopics() {
    const data = await run<CommunityTopic[]>('热门话题', () => communityService.listTopics({ limit: 12 }))
    setCommunityTopics(data ?? [])
  }

  async function loadCommunityProducts(productIds: number[]) {
    const missingIds = productIds.filter((id) => !communityProductMap[id])
    if (missingIds.length === 0) return
    const details = await Promise.all(
      missingIds.map((id) =>
        run<ProductDetail>('社区关联商品详情', () => productService.getProduct(id)),
      ),
    )
    const items = details.filter(Boolean).map((detail) => productDetailToListItem(detail as ProductDetail))
    if (items.length === 0) return
    setCommunityProductMap((current) => {
      const next = { ...current }
      items.forEach((item) => {
        next[item.id] = item
      })
      return next
    })
  }

  function filterByTopic(topic: string) {
    setCommunityTopic(topic)
    setCommunitySection(undefined)
  }

  function clearCommunityTopic() {
    setCommunityTopic(undefined)
  }

  async function openCommunityUser(userId: number) {
    const [profileData, postsData] = await Promise.all([
      run<CommunityUserProfile>('社区个人主页', () => communityService.getUserProfile(userId)),
      run<{ list?: CommunityPost[] }>('作者帖子', () => communityService.listUserPosts(userId, { page_size: 12 })),
    ])
    if (profileData) setSelectedCommunityUser(profileData)
    setSelectedCommunityUserPosts(postsData?.list ?? [])
  }

  async function openPost(post: CommunityPost) {
    setSelectedCommunityUser(null)
    setSelectedPost(post)
    const data = await run<{ list?: CommunityComment[] }>('帖子评论', () => communityService.listComments(post.id))
    setComments(data?.list ?? [])
  }

  async function createPost(type: 'normal' | 'grass') {
    try {
      await communityService.createPost({
        type,
        section: type === 'grass' ? 'grass' : postSection,
        title: postTitle,
        content: postContent,
        product_ids: selectedPostProductIds,
        topic_tags: splitTags(postTopicTags),
        image_urls: postImages,
      })
      setPostImages([])
      message.success(type === 'grass' ? '种草帖已发布' : '普通帖已发布')
      await loadPosts()
      await loadCommunityTopics()
    } catch (error) {
      const bizMessage = pickErrorMessage(error)
      message.error(
        bizMessage ?? (type === 'grass' ? '发布种草帖失败，种草帖必须关联已完成订单购买过的商品' : '发布普通帖失败'),
      )
    }
  }

  async function commentPost(postId: number) {
    const data = await run<CommunityComment>('发表评论', () => communityService.createComment(postId, commentContent))
    if (data && selectedPost) {
      message.success('评论已发表')
      await openPost(selectedPost)
    }
  }

  async function likePost(postId: number) {
    const data = await run<{ liked: boolean; like_count: number }>('点赞', () => communityService.likePost(postId))
    if (data) {
      message.success(`点赞状态：${data.liked ? '已点赞' : '已取消'}，点赞数：${data.like_count}`)
      await loadPosts()
      if (selectedPost) {
        setSelectedPost({ ...selectedPost, like_count: data.like_count })
      }
    }
  }

  async function uploadPostImage(file: File) {
    const data = await run<{ url: string }>('上传帖子图片', () => uploadService.uploadImage(file))
    if (data?.url) setPostImages((items) => [...items, data.url])
    return false
  }

  async function searchPostProducts(keyword = '') {
    const trimmedKeyword = keyword.trim()
    setPostProductSearchKeyword(trimmedKeyword)
    const data = await run<{ list?: ProductListItem[] }>('搜索关联商品', () =>
      productService.listProducts({
        keyword: trimmedKeyword || undefined,
        page: 1,
        page_size: 30,
      }),
    )
    let list = data?.list ?? []
    const numericId = Number(trimmedKeyword.replace(/^#/, ''))
    if (Number.isInteger(numericId) && numericId > 0 && !list.some((product) => product.id === numericId)) {
      const detail = await run<ProductDetail>('按商品 ID 搜索关联商品', () => productService.getProduct(numericId))
      if (detail) list = [productDetailToListItem(detail), ...list]
    }
    setPostProductSearchResults(list)
    if (list.length > 0) {
      setCommunityProductMap((current) => {
        const next = { ...current }
        list.forEach((product) => {
          next[product.id] = product
        })
        return next
      })
    }
  }

  async function handleSourceOrder() {
    setNoticeText('')
    setAlipayQrCode('')
    const postId = Number(sourcePostId)
    const skuId = Number(sourceSkuId)
    if (!Number.isFinite(postId) || postId <= 0) {
      message.error('请输入有效的种草帖 ID')
      return
    }
    if (!Number.isFinite(skuId) || skuId <= 0) {
      message.error('请输入有效的 SKU ID')
      return
    }
    try {
      await orderService.addCartItem({ sku_id: skuId, quantity: 1, source_post_id: postId })
      const response = await orderService.createOrder({
        client_order_token: randomToken('community_source'),
        source_post_id: postId,
      })
      const paymentId = response.data.payment_id
      const alipayResponse = await orderService.precreateAlipay(paymentId)
      setAlipayQrCode(alipayResponse.data.qr_code)
      setNoticeText(
        `来源订单已创建，请使用支付宝沙箱支付。支付单 ID：${paymentId}，订单 ID：${response.data.order_ids.join(',')}`,
      )
      message.success('来源订单已创建，请扫码支付')
    } catch (error) {
      const msg = getApiErrorMessage(error)
      message.error(`来源下单失败：${msg}`)
      setNoticeText(`来源下单失败：${msg}`)
    }
  }

  function renderCommunityProductCards(productIds: number[], compact = false) {
    if (productIds.length === 0) {
      return <Text type="secondary">暂无关联商品</Text>
    }
    return (
      <div className={compact ? 'community-product-cards compact' : 'community-product-cards'}>
        {productIds.map((productId) => {
          const product = communityProductMap[productId]
          return (
            <Card key={productId} size="small" className="community-product-card">
              {product ? (
                <Space size={10} align="center">
                  {product.cover_url ? (
                    <Image
                      width={compact ? 46 : 64}
                      height={compact ? 46 : 64}
                      preview={false}
                      src={absoluteAssetUrl(product.cover_url)}
                    />
                  ) : (
                    <div className="community-product-thumb">图</div>
                  )}
                  <Space direction="vertical" size={2}>
                    <Text strong ellipsis style={{ maxWidth: compact ? 135 : 260 }}>
                      {product.name}
                    </Text>
                    <Text type="secondary">商品 #{product.id} / {product.merchant_name}</Text>
                    <Text className="community-product-price">￥{yuan(product.price_cent)}</Text>
                  </Space>
                </Space>
              ) : (
                <Space direction="vertical" size={2}>
                  <Text strong>商品 #{productId}</Text>
                  <Text type="secondary">正在加载商品信息</Text>
                </Space>
              )}
            </Card>
          )
        })}
      </div>
    )
  }

  useEffect(() => {
    void loadPosts()
  }, [communitySection, communityTopic])

  useEffect(() => {
    if (communityProductIds.length) void loadCommunityProducts(communityProductIds)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communityProductIds])

  useEffect(() => {
    void loadCommunityTopics()
    void searchPostProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <main className="shop-page community-page">
      <Card
        title="社区广场"
        className="section-card community-section"
        extra={<Button onClick={loadPosts}>刷新帖子</Button>}
      >
        <Segmented
          className="community-tabs"
          value={communitySection ?? 'square'}
          onChange={(value) => setCommunitySection(value === 'square' ? undefined : String(value))}
          options={SECTION_OPTIONS}
        />
        <Paragraph type="secondary" className="community-hint">
          综合广场展示所有公开帖子；种草专区用于从帖子进入商品并保留种草来源，普通帖和商家动态可关联商品但不产生种草奖励。
        </Paragraph>
        <Space wrap className="community-topic-bar">
          <Text type="secondary">热门话题：</Text>
          {communityTopics.length ? (
            communityTopics.map((topic) => (
              <Tag
                key={topic.name}
                color={communityTopic === topic.name ? 'purple' : 'default'}
                className="clickable-tag"
                onClick={() => filterByTopic(topic.name)}
              >
                #{topic.name} {topic.post_count}
              </Tag>
            ))
          ) : (
            <Text type="secondary">暂无话题</Text>
          )}
          {communityTopic ? (
            <Button size="small" onClick={clearCommunityTopic}>清除话题：#{communityTopic}</Button>
          ) : null}
        </Space>
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          {posts.map((post) => (
            <Col xs={24} sm={12} md={8} lg={6} key={post.id}>
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
                  <Space wrap>
                    <Tag color={post.type === 'grass' ? 'purple' : 'blue'}>{statusText(post.type)}</Tag>
                    <Tag>{statusText(post.section)}</Tag>
                    <Tag color={statusColor(post.status)}>{statusText(post.status)}</Tag>
                  </Space>
                  <Text strong>{post.title}</Text>
                  <Space size={6} onClick={(event) => event.stopPropagation()}>
                    <Avatar size="small" src={absoluteAssetUrl(post.author.avatar_url)}>
                      {post.author.nickname?.[0] ?? '用'}
                    </Avatar>
                    <Button type="link" size="small" onClick={() => openCommunityUser(post.author.id)}>
                      {post.author.nickname}
                    </Button>
                  </Space>
                  <Paragraph ellipsis={{ rows: 2 }}>{post.content}</Paragraph>
                  {post.topic_tags.length ? (
                    <Space wrap size={4}>
                      {post.topic_tags.map((tag) => (
                        <Tag
                          key={tag}
                          className="clickable-tag"
                          color={communityTopic === tag ? 'purple' : 'default'}
                          onClick={(event) => {
                            event.stopPropagation()
                            filterByTopic(tag)
                          }}
                        >
                          #{tag}
                        </Tag>
                      ))}
                    </Space>
                  ) : null}
                  {renderCommunityProductCards(post.product_ids, true)}
                  <Space split={<Divider type="vertical" />}>
                    <Text>赞 {post.like_count}</Text>
                    <Text>评 {post.comment_count}</Text>
                    <Text>{new Date(post.created_at).toLocaleDateString()}</Text>
                  </Space>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
        {posts.length === 0 ? <Empty description="暂无社区内容" /> : null}
      </Card>

      <Card title="发布社区内容" className="section-card" style={{ marginTop: 16 }}>
        <Row gutter={[12, 12]}>
          <Col xs={24} md={8}>
            <Input value={postTitle} onChange={(event) => setPostTitle(event.target.value)} placeholder="标题" />
          </Col>
          <Col xs={24} md={8}>
            <Select
              mode="multiple"
              allowClear
              showSearch
              optionFilterProp="label"
              filterOption={false}
              style={{ width: '100%' }}
              value={selectedPostProductIds}
              onChange={setSelectedPostProductIds}
              onSearch={(value) => searchPostProducts(value)}
              onFocus={() => searchPostProducts()}
              options={postProductOptions}
              placeholder="搜索并选择关联商品；种草帖需选择已完成订单商品"
            />
          </Col>
          <Col xs={24} md={8}>
            <Select
              style={{ width: '100%', marginBottom: 8 }}
              value={postSection}
              onChange={setPostSection}
              options={POST_SECTION_OPTIONS}
            />
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
          <Col span={24}>
            <Input
              value={postTopicTags}
              onChange={(event) => setPostTopicTags(event.target.value)}
              placeholder="话题标签，例如：开箱 零食测评；支持中文逗号、英文逗号或空格"
            />
          </Col>
          <Col span={24}>
            <Input.TextArea rows={3} value={postContent} onChange={(event) => setPostContent(event.target.value)} />
          </Col>
          <Col span={24}>
            <Space>
              <Button onClick={() => createPost('normal')}>发布普通帖</Button>
              <Button type="primary" onClick={() => createPost('grass')}>发布种草帖</Button>
              <Button onClick={loadPosts}>刷新帖子</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card title="种草来源下单" className="section-card" style={{ marginTop: 16 }}>
        <Space wrap>
          <Input
            style={{ width: 180 }}
            value={sourcePostId}
            onChange={(event) => setSourcePostId(event.target.value)}
            placeholder="种草帖 ID"
          />
          <Input
            style={{ width: 180 }}
            value={sourceSkuId}
            onChange={(event) => setSourceSkuId(event.target.value)}
            placeholder="SKU ID"
          />
          <Button type="primary" onClick={handleSourceOrder}>加购并来源下单</Button>
        </Space>
        <Paragraph type="secondary" style={{ marginTop: 12 }}>
          下单并完成支付宝沙箱支付后，到订单页同步支付结果并确认收货，种草帖作者会增加基础积分。
        </Paragraph>
        {alipayQrCode ? (
          <div style={{ marginTop: 12 }}>
            <QRCode value={alipayQrCode} size={180} />
            <Paragraph type="secondary" style={{ marginTop: 8 }}>
              请使用支付宝沙箱买家账号扫码付款。二维码内容不是网页支付链接，直接打开不会进入该订单支付。
            </Paragraph>
          </div>
        ) : null}
        {noticeText ? <Paragraph style={{ marginTop: 8 }}>{noticeText}</Paragraph> : null}
      </Card>

      <Drawer
        open={!!selectedPost}
        width={640}
        title={selectedPost?.title}
        onClose={() => setSelectedPost(null)}
      >
        {selectedPost ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Space wrap>
              <Tag color={selectedPost.type === 'grass' ? 'purple' : 'blue'}>{statusText(selectedPost.type)}</Tag>
              <Tag>{statusText(selectedPost.section)}</Tag>
              <Tag color={statusColor(selectedPost.status)}>{statusText(selectedPost.status)}</Tag>
              <Button type="link" onClick={() => openCommunityUser(selectedPost.author.id)}>
                作者：{selectedPost.author?.nickname || '匿名'}
              </Button>
            </Space>
            <Paragraph>{selectedPost.content}</Paragraph>
            {selectedPost.topic_tags.length ? (
              <Space wrap>
                {selectedPost.topic_tags.map((tag) => (
                  <Tag
                    key={tag}
                    className="clickable-tag"
                    color={communityTopic === tag ? 'purple' : 'default'}
                    onClick={() => filterByTopic(tag)}
                  >
                    #{tag}
                  </Tag>
                ))}
              </Space>
            ) : null}
            {selectedPost.image_urls.length ? (
              <Image.PreviewGroup>
                <Space wrap>
                  {selectedPost.image_urls.map((url) => (
                    <Image width={120} key={url} src={absoluteAssetUrl(url)} />
                  ))}
                </Space>
              </Image.PreviewGroup>
            ) : null}
            <Card size="small" title="关联商品">
              {renderCommunityProductCards(selectedPost.product_ids)}
            </Card>
            <Space>
              <Button onClick={() => likePost(selectedPost.id)}>点赞 ({selectedPost.like_count})</Button>
            </Space>
            <Divider />
            <List
              header="评论"
              dataSource={comments}
              locale={{ emptyText: '暂无评论' }}
              renderItem={(comment) => (
                <List.Item>
                  <List.Item.Meta
                    title={comment.author?.nickname || '匿名'}
                    description={comment.content}
                  />
                </List.Item>
              )}
            />
            <Space.Compact style={{ width: '100%' }}>
              <Input
                value={commentContent}
                onChange={(event) => setCommentContent(event.target.value)}
                placeholder="写评论"
              />
              <Button type="primary" onClick={() => commentPost(selectedPost.id)}>发送</Button>
            </Space.Compact>
          </Space>
        ) : null}
      </Drawer>

      <Modal
        open={!!selectedCommunityUser}
        title={selectedCommunityUser ? `${selectedCommunityUser.user.nickname} 的社区主页` : '社区主页'}
        onCancel={() => setSelectedCommunityUser(null)}
        footer={null}
        width={760}
      >
        {selectedCommunityUser ? (
          <Space direction="vertical" size={18} style={{ width: '100%' }}>
            <Card className="community-profile-card">
              <Space align="center" size={16}>
                <Avatar size={72} src={absoluteAssetUrl(selectedCommunityUser.user.avatar_url)}>
                  {selectedCommunityUser.user.nickname?.[0] ?? '用'}
                </Avatar>
                <Space direction="vertical" size={4}>
                  <Title level={4}>{selectedCommunityUser.user.nickname}</Title>
                  <Text type="secondary">社区用户 #{selectedCommunityUser.user.id}</Text>
                </Space>
              </Space>
            </Card>
            <Row gutter={[12, 12]}>
              <Col span={6}><Card><Statistic title="帖子" value={selectedCommunityUser.post_count} /></Card></Col>
              <Col span={6}><Card><Statistic title="种草" value={selectedCommunityUser.grass_post_count} /></Card></Col>
              <Col span={6}><Card><Statistic title="评论" value={selectedCommunityUser.comment_count} /></Card></Col>
              <Col span={6}><Card><Statistic title="获赞" value={selectedCommunityUser.like_received_count} /></Card></Col>
            </Row>
            <Card title="近期帖子">
              <List
                grid={{ gutter: 12, column: 2 }}
                dataSource={selectedCommunityUserPosts}
                locale={{ emptyText: '暂无公开帖子' }}
                renderItem={(post) => (
                  <List.Item>
                    <Card size="small" hoverable onClick={() => openPost(post)}>
                      <Space direction="vertical" size={8} style={{ width: '100%' }}>
                        <Space wrap>
                          <Tag color={post.type === 'grass' ? 'purple' : 'blue'}>{statusText(post.type)}</Tag>
                          <Tag>{statusText(post.section)}</Tag>
                        </Space>
                        <Text strong>{post.title}</Text>
                        <Paragraph ellipsis={{ rows: 2 }}>{post.content}</Paragraph>
                        {post.topic_tags.length ? (
                          <Space wrap size={4}>
                            {post.topic_tags.map((tag) => <Tag key={tag}>#{tag}</Tag>)}
                          </Space>
                        ) : null}
                      </Space>
                    </Card>
                  </List.Item>
                )}
              />
            </Card>
          </Space>
        ) : null}
      </Modal>
    </main>
  )
}
