import { useEffect, useState } from 'react'

import { communityService, type CommunityPost } from '../../services/community'
import { orderService } from '../../services/order'

export function CommunityPage() {
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [postType, setPostType] = useState('normal')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [productIds, setProductIds] = useState('')
  const [topicTags, setTopicTags] = useState('测试')
  const [commentPostId, setCommentPostId] = useState('')
  const [commentContent, setCommentContent] = useState('')
  const [sourcePostId, setSourcePostId] = useState('')
  const [sourceSkuId, setSourceSkuId] = useState('')
  const [message, setMessage] = useState('')

  async function loadPosts() {
    const response = await communityService.listPosts()
    setPosts(response.data.list)
  }

  useEffect(() => {
    loadPosts().catch(() => setPosts([]))
  }, [])

  function parseNumbers(value: string) {
    return value
      .split(',')
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isFinite(item) && item > 0)
  }

  async function handleCreatePost() {
    setMessage('')
    try {
      const response = await communityService.createPost({
        type: postType,
        title,
        content,
        product_ids: parseNumbers(productIds),
        topic_tags: topicTags
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      })
      setMessage(`帖子已提交审核，ID：${response.data.id}，状态：${response.data.status}`)
    } catch {
      setMessage('发帖失败。种草帖必须关联已完成订单购买过的商品。')
    }
  }

  async function handleLike(postId: number) {
    setMessage('')
    try {
      const response = await communityService.likePost(postId)
      await loadPosts()
      setMessage(`点赞状态：${response.data.liked ? '已点赞' : '已取消'}，点赞数：${response.data.like_count}`)
    } catch {
      setMessage('点赞失败')
    }
  }

  async function handleCreateComment() {
    setMessage('')
    try {
      const response = await communityService.createComment(Number(commentPostId), commentContent)
      setMessage(`评论已提交审核，ID：${response.data.id}`)
    } catch {
      setMessage('评论失败，请确认帖子已发布')
    }
  }

  async function handleSourceOrder() {
    setMessage('')
    try {
      await orderService.addCartItem({ sku_id: Number(sourceSkuId), quantity: 1 })
      const response = await orderService.createOrder({
        client_order_token: crypto.randomUUID(),
        source_post_id: Number(sourcePostId),
      })
      await orderService.pay(response.data.payment_id)
      setMessage(`来源订单已创建并模拟支付。支付单ID：${response.data.payment_id}，订单ID：${response.data.order_ids.join(',')}`)
    } catch {
      setMessage('来源下单失败，请确认帖子为已发布种草帖且关联该 SKU 的商品')
    }
  }

  return (
    <main>
      <h1>社区测试</h1>
      <section>
        <h2>发帖</h2>
        <label>
          类型
          <select value={postType} onChange={(event) => setPostType(event.target.value)}>
            <option value="normal">普通帖</option>
            <option value="grass">种草帖</option>
            <option value="merchant_ad">商家广告帖</option>
          </select>
        </label>
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="标题" />
        <input value={content} onChange={(event) => setContent(event.target.value)} placeholder="内容" />
        <input value={productIds} onChange={(event) => setProductIds(event.target.value)} placeholder="关联商品ID，逗号分隔" />
        <input value={topicTags} onChange={(event) => setTopicTags(event.target.value)} placeholder="标签，逗号分隔" />
        <button type="button" onClick={handleCreatePost}>
          提交帖子
        </button>
      </section>
      <section>
        <h2>公开帖子</h2>
        <button type="button" onClick={() => loadPosts().catch(() => setMessage('刷新失败'))}>
          刷新公开帖
        </button>
        {posts.length > 0 ? (
          <ul>
            {posts.map((post) => (
              <li key={post.id}>
                #{post.id} [{post.type}] {post.title} - 作者 {post.author.nickname} - 商品{' '}
                {post.product_ids.join(',') || '无'} - 点赞 {post.like_count} - 评论 {post.comment_count}
                <button type="button" onClick={() => handleLike(post.id)}>
                  点赞/取消
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p>暂无公开帖</p>
        )}
      </section>
      <section>
        <h2>评论</h2>
        <input value={commentPostId} onChange={(event) => setCommentPostId(event.target.value)} placeholder="帖子ID" />
        <input value={commentContent} onChange={(event) => setCommentContent(event.target.value)} placeholder="评论内容" />
        <button type="button" onClick={handleCreateComment}>
          提交评论
        </button>
      </section>
      <section>
        <h2>种草来源下单</h2>
        <input value={sourcePostId} onChange={(event) => setSourcePostId(event.target.value)} placeholder="种草帖ID" />
        <input value={sourceSkuId} onChange={(event) => setSourceSkuId(event.target.value)} placeholder="SKU ID" />
        <button type="button" onClick={handleSourceOrder}>
          加购并来源下单
        </button>
        <p>下单并模拟支付后，到订单页确认收货，种草帖作者会增加基础积分。</p>
      </section>
      {message && <p>{message}</p>}
    </main>
  )
}
