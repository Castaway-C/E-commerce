import { http } from './http'

export type HomeBanner = {
  id: number
  title: string
  subtitle?: string | null
  image_url: string
  target_type: 'none' | 'product' | 'url'
  target_id?: number | null
  target_url?: string | null
  sort_order: number
  is_active: boolean
}

export type HomeBannerPayload = {
  title: string
  subtitle?: string | null
  image_url: string
  target_type: 'none' | 'product' | 'url'
  target_id?: number | null
  target_url?: string | null
  sort_order?: number
  is_active?: boolean
}

export const adminHomeService = {
  listBanners() {
    return http.get<unknown, { data: HomeBanner[] }>('/admin/home-banners', {
      headers: { 'X-Admin-Session': 'platform' },
    })
  },

  createBanner(payload: HomeBannerPayload) {
    return http.post<unknown, { data: HomeBanner }>('/admin/home-banners', payload, {
      headers: { 'X-Admin-Session': 'platform' },
    })
  },

  updateBanner(bannerId: number, payload: Partial<HomeBannerPayload>) {
    return http.put<unknown, { data: HomeBanner }>(`/admin/home-banners/${bannerId}`, payload, {
      headers: { 'X-Admin-Session': 'platform' },
    })
  },

  deleteBanner(bannerId: number) {
    return http.delete<unknown, { data: HomeBanner }>(`/admin/home-banners/${bannerId}`, {
      headers: { 'X-Admin-Session': 'platform' },
    })
  },
}
