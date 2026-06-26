import { useEffect, useState } from 'react'

import { productService, type ProductListItem } from '../../services/product'

export function ProductPage() {
  const [products, setProducts] = useState<ProductListItem[]>([])

  useEffect(() => {
    productService.listProducts().then((response) => setProducts(response.data.list)).catch(() => setProducts([]))
  }, [])

  return (
    <main>
      <h1>商品列表</h1>
      {products.length > 0 ? (
        <ul>
          {products.map((product) => (
            <li key={product.id}>
              {product.name} - ¥{(product.price_cent / 100).toFixed(2)}
            </li>
          ))}
        </ul>
      ) : (
        <p>暂无商品</p>
      )}
    </main>
  )
}
