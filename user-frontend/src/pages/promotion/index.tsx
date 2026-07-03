import { useEffect, useMemo, useState } from 'react'

import { promotionService, type CouponTemplate, type UserCoupon } from '../../services/promotion'

function yuan(valueCent: number) {
  return (valueCent / 100).toFixed(2)
}

function statusText(status: string) {
  const map: Record<string, string> = {
    active: '可领取',
    disabled: '已停用',
    unused: '未使用',
    used: '已使用',
    expired: '已过期',
    void: '已作废',
  }
  return map[status] ?? status
}

function isTemplateClaimable(template: CouponTemplate) {
  return template.status === 'active' && (template.total_quantity === 0 || template.claimed_quantity < template.total_quantity)
}

export function PromotionPage() {
  const [templates, setTemplates] = useState<CouponTemplate[]>([])
  const [myCoupons, setMyCoupons] = useState<UserCoupon[]>([])
  const [message, setMessage] = useState('')

  const claimedCountByTemplateId = useMemo(() => {
    const map = new Map<number, number>()
    myCoupons.forEach((coupon) => {
      map.set(coupon.coupon_template_id, (map.get(coupon.coupon_template_id) ?? 0) + 1)
    })
    return map
  }, [myCoupons])

  async function loadTemplates() {
    const response = await promotionService.listCoupons()
    setTemplates(response.data)
  }

  async function loadMyCoupons() {
    const response = await promotionService.listMyCoupons()
    setMyCoupons(response.data)
  }

  useEffect(() => {
    void loadTemplates()
    void loadMyCoupons()
  }, [])

  async function handleClaim(templateId: number) {
    setMessage('')
    try {
      const response = await promotionService.claimCoupon(templateId)
      setMessage(`领取成功，用户券 ID：${response.data.id}`)
      await Promise.all([loadTemplates(), loadMyCoupons()])
    } catch {
      setMessage('领取失败，请确认已登录、库存未领完且未超过每人限领。')
    }
  }

  return (
    <main>
      <h1>优惠券</h1>
      <section>
        <h2>可领取优惠券</h2>
        <button type="button" onClick={() => loadTemplates().catch(() => setMessage('刷新失败'))}>
          刷新可领券
        </button>
        {templates.length > 0 ? (
          <ul>
            {templates.map((template) => {
              const claimedCount = claimedCountByTemplateId.get(template.id) ?? 0
              const reachedUserLimit = claimedCount >= template.per_user_limit
              return (
                <li key={template.id}>
                  #{template.id} {template.name} - {template.scope_type} [{template.scope_ids.join(',') || '全部'}] - 满 ￥
                  {yuan(template.min_amount_cent)} 减 ￥{yuan(template.discount_value)} - 已领 {template.claimed_quantity}/
                  {template.total_quantity || '不限'} - 本账号已领 {claimedCount}/{template.per_user_limit} - {statusText(template.status)}
                  <button
                    type="button"
                    disabled={!isTemplateClaimable(template) || reachedUserLimit}
                    onClick={() => handleClaim(template.id)}
                  >
                    {reachedUserLimit ? '已领取' : '领取'}
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <p>暂无可领取优惠券。</p>
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
                用户券 #{coupon.id} - 模板 #{coupon.coupon_template_id} {coupon.template.name} - {statusText(coupon.status)}
              </li>
            ))}
          </ul>
        ) : (
          <p>暂无用户券。</p>
        )}
      </section>
      {message && <p>{message}</p>}
    </main>
  )
}
