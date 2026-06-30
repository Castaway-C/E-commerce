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

export type ProductDetail = {
  id: number
  name: string
  description: string
  cover_url?: string | null
  category_id?: number | null
  status: string
  images: string[]
  merchant: { id: number; name: string }
  skus: Array<{ id: number; name: string; price_cent: number; market_price_cent?: number | null; stock: number }>
}

export type Category = {
  id: number
  name: string
  parent_id?: number | null
  sort_order: number
}

export type PageResult<T> = {
  list: T[]
  page: number
  page_size: number
  total: number
}

export const productService = {
  listProducts(params?: { keyword?: string; category_id?: number }) {
    return http.get<unknown, { data: PageResult<ProductListItem> }>('/products', { params })
  },

  getProduct(productId: number) {
    return http.get<unknown, { data: ProductDetail }>(`/products/${productId}`)
  },

  listCategories() {
    return http.get<unknown, { data: Category[] }>('/categories')
  },
}
