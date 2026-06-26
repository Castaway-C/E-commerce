import { http } from './http'

export type ProductListItem = {
  id: number
  name: string
  cover_url?: string | null
  price_cent: number
  market_price_cent?: number | null
  merchant_id: number
  merchant_name: string
  sales_count: number
  tags: string[]
}

export type PageResult<T> = {
  list: T[]
  page: number
  page_size: number
  total: number
}

export const productService = {
  listProducts() {
    return http.get<unknown, { data: PageResult<ProductListItem> }>('/products')
  },
}
