import { http } from './http'

export type CouponTemplate = {
  id: number
  name: string
  scope_type: string
  scope_ids: number[]
  discount_type: string
  discount_value: number
  min_amount_cent: number
  total_quantity: number
  claimed_quantity: number
  per_user_limit: number
  status: string
  valid_from?: string | null
  valid_to?: string | null
}

export type CouponPayload = {
  name: string
  scope_type: string
  scope_ids: number[]
  discount_type: string
  discount_value: number
  min_amount_cent: number
  total_quantity: number
  per_user_limit: number
}

export const adminPromotionService = {
  listCoupons() {
    return http.get<unknown, { data: CouponTemplate[] }>('/admin/promotions/coupons')
  },

  createCoupon(payload: CouponPayload) {
    return http.post<unknown, { data: CouponTemplate }>('/admin/promotions/coupons', payload)
  },

  updateCoupon(couponTemplateId: number, payload: Partial<CouponPayload>) {
    return http.put<unknown, { data: CouponTemplate }>(`/admin/promotions/coupons/${couponTemplateId}`, payload)
  },

  disableCoupon(couponTemplateId: number) {
    return http.post<unknown, { data: CouponTemplate }>(`/admin/promotions/coupons/${couponTemplateId}/disable`)
  },

  expireUserCoupons() {
    return http.post<unknown, { data: { expired_count: number } }>('/admin/promotions/coupons/expire')
  },

  batchGrant(couponTemplateId: number, userIds: number[]) {
    return http.post<unknown, { data: { granted_count: number; skipped_user_ids: number[] } }>(
      `/admin/promotions/coupons/${couponTemplateId}/batch-grant`,
      { user_ids: userIds },
    )
  },
}
