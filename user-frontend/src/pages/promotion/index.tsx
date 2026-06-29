import { useEffect, useState } from 'react'

import { promotionService, type CouponTemplate, type UserCoupon } from '../../services/promotion'

export function PromotionPage() {
  const [templates, setTemplates] = useState<CouponTemplate[]>([])
  const [myCoupons, setMyCoupons] = useState<UserCoupon[]>([])
  const [message, setMessage] = useState('')

  async function loadTemplates() {
    const response = await promotionService.listCoupons()
    setTemplates(response.data)
  }

  async function loadMyCoupons() {
    const response = await promotionService.listMyCoupons()
    setMyCoupons(response.data)
  }

  useEffect(() => {
    loadTemplates().catch(() => setTemplates([]))
    loadMyCoupons().catch(() => setMyCoupons([]))
  }, [])

  async function handleClaim(templateId: number) {
    setMessage('')
    try {
      const response = await promotionService.claimCoupon(templateId)
      setMessage(`领取成功，用户券 ID：${response.data.id}`)
      await loadMyCoupons()
    } catch {
      setMessage('领取失败，请确认已登录、库存未领完且未超过每人限制')
    }
  }

  return (
    <main>
      <h1>优惠券测试</h1>
      <section>
        <h2>可领优惠券</h2>
        <button type="button" onClick={() => loadTemplates().catch(() => setMessage('刷新失败'))}>
          刷新可领券
        </button>
        {templates.length > 0 ? (
          <ul>
            {templates.map((template) => (
              <li key={template.id}>
                #{template.id} {template.name} - {template.scope_type} [{template.scope_ids.join(',') || '全部'}] -{' '}
                {template.discount_type}:{template.discount_value} - 门槛 ¥
                {(template.min_amount_cent / 100).toFixed(2)} - 已领 {template.claimed_quantity}/
                {template.total_quantity || '不限'}
                <button type="button" onClick={() => handleClaim(template.id)}>
                  领取
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p>暂无可领优惠券，可先到管理端促销页创建。</p>
        )}
      </section>
      <section>
        <h2>我的优惠券</h2>
        <button type="button" onClick={() => loadMyCoupons().catch(() => setMessage('刷新失败'))}>
          刷新我的券
        </button>
        {myCoupons.length > 0 ? (
          <ul>
            {myCoupons.map((coupon) => (
              <li key={coupon.id}>
                用户券 #{coupon.id} - 模板 #{coupon.coupon_template_id} {coupon.template.name} - 状态 {coupon.status}
              </li>
            ))}
          </ul>
        ) : (
          <p>暂无用户券</p>
        )}
      </section>
      <p>下单抵扣：复制“用户券 ID”到结算页的优惠券 ID 输入框。</p>
      {message && <p>{message}</p>}
    </main>
  )
}
