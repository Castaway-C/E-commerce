import { http } from './http'

export type MerchantCreatePayload = {
  name: string
  logo_url?: string
  announcement?: string
}

export type ProductCreatePayload = {
  merchant_id: number
  category_id?: number | null
  name: string
  description: string
  image_urls: string[]
  skus: Array<{
    name: string
    price_cent: number
    market_price_cent?: number | null
    stock: number
    spec_values?: Record<string, string>
  }>
}

export type Merchant = {
  id: number
  name: string
}

export type ProductDetail = {
  id: number
  name: string
  status: string
  merchant: Merchant
  skus: Array<{ id: number; name: string; price_cent: number; stock: number }>
}

export const adminProductService = {
  createMerchant(payload: MerchantCreatePayload) {
    return http.post<unknown, { data: Merchant }>('/admin/merchants', payload)
  },

  createProduct(payload: ProductCreatePayload) {
    return http.post<unknown, { data: ProductDetail }>('/admin/products', payload)
  },

  publishProduct(productId: number) {
    return http.post<unknown, { data: ProductDetail }>(`/admin/products/${productId}/publish`)
  },
}
