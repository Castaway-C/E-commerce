import { FormEvent, useState } from 'react'

import { adminProductService } from '../../services/product'

export function ProductAdminPage() {
  const [merchantName, setMerchantName] = useState('')
  const [productName, setProductName] = useState('')
  const [price, setPrice] = useState('99')
  const [message, setMessage] = useState('')
  const [createdInfo, setCreatedInfo] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setCreatedInfo('')
    try {
      const merchantResponse = await adminProductService.createMerchant({ name: merchantName })
      const merchantId = merchantResponse.data.id
      const productResponse = await adminProductService.createProduct({
        merchant_id: merchantId,
        name: productName,
        description: '管理端快速创建的测试商品',
        image_urls: [],
        skus: [{ name: '默认规格', price_cent: Number(price) * 100, stock: 10 }],
      })
      const publishResponse = await adminProductService.publishProduct(productResponse.data.id)
      const firstSku = publishResponse.data.skus[0]
      setMessage('商品已创建并上架')
      setCreatedInfo(
        `店铺ID：${merchantId}；商品ID：${publishResponse.data.id}；SKU ID：${firstSku?.id ?? '无'}`,
      )
    } catch {
      setMessage('创建失败，请检查管理员登录状态和表单内容')
    }
  }

  return (
    <main>
      <h1>商品管理</h1>
      <form onSubmit={handleSubmit}>
        <label>
          店铺名称
          <input value={merchantName} onChange={(event) => setMerchantName(event.target.value)} />
        </label>
        <label>
          商品名称
          <input value={productName} onChange={(event) => setProductName(event.target.value)} />
        </label>
        <label>
          价格
          <input value={price} onChange={(event) => setPrice(event.target.value)} />
        </label>
        <button type="submit">创建并上架</button>
      </form>
      {message && <p>{message}</p>}
      {createdInfo && <p>{createdInfo}</p>}
      <p>提示：创建成功后，用户端商品列表会显示该商品，可直接加入购物车测试。</p>
    </main>
  )
}
