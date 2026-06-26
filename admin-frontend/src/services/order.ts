import { http } from './http'

export type AdminOrder = {
  id: number
  order_no: string
  status: string
  pay_amount_cent: number
}

export type Review = {
  id: number
  order_id: number
  product_id: number
  score: number
  content: string
  status: string
}

export type Refund = {
  id: number
  order_id: number
  user_id: number
  reason: string
  status: string
  origin_order_status: string
}

export const adminOrderService = {
  shipOrder(orderId: number) {
    return http.post(`/admin/orders/${orderId}/ship`)
  },

  auditReview(reviewId: number, approved: boolean) {
    return http.post<unknown, { data: Review }>(`/admin/reviews/${reviewId}/audit`, { approved })
  },

  listRefunds() {
    return http.get<unknown, { data: { list: Refund[]; total: number } }>('/admin/refunds')
  },

  approveRefund(refundId: number) {
    return http.post(`/admin/refunds/${refundId}/approve`)
  },

  rejectRefund(refundId: number) {
    return http.post(`/admin/refunds/${refundId}/reject`)
  },

  receiveRefund(refundId: number) {
    return http.post(`/admin/refunds/${refundId}/receive`)
  },

  finishRefund(refundId: number) {
    return http.post(`/admin/refunds/${refundId}/refund`)
  },
}
