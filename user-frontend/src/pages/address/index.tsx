import { FormEvent, useEffect, useState } from 'react'

import { addressService, type Address } from '../../services/address'

const initialForm = {
  receiver_name: '',
  receiver_mobile: '',
  province: '',
  city: '',
  district: '',
  detail_address: '',
  is_default: false,
}

export function AddressPage() {
  const [addresses, setAddresses] = useState<Address[]>([])
  const [form, setForm] = useState(initialForm)
  const [message, setMessage] = useState('')

  async function loadAddresses() {
    const response = await addressService.listAddresses()
    setAddresses(response.data)
  }

  useEffect(() => {
    loadAddresses().catch(() => setAddresses([]))
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    try {
      await addressService.createAddress({
        ...form,
        district: form.district || null,
      })
      setForm(initialForm)
      await loadAddresses()
      setMessage('地址已保存')
    } catch {
      setMessage('保存地址失败，请检查登录状态和表单内容')
    }
  }

  async function handleSetDefault(addressId: number) {
    setMessage('')
    try {
      await addressService.updateAddress(addressId, { is_default: true })
      await loadAddresses()
      setMessage('默认地址已更新')
    } catch {
      setMessage('设置默认地址失败')
    }
  }

  async function handleDelete(addressId: number) {
    setMessage('')
    try {
      await addressService.deleteAddress(addressId)
      await loadAddresses()
      setMessage('地址已删除')
    } catch {
      setMessage('删除地址失败')
    }
  }

  return (
    <main>
      <h1>收货地址</h1>
      <form onSubmit={handleSubmit}>
        <label>
          收货人
          <input
            value={form.receiver_name}
            onChange={(event) => setForm({ ...form, receiver_name: event.target.value })}
          />
        </label>
        <label>
          手机号
          <input
            value={form.receiver_mobile}
            onChange={(event) => setForm({ ...form, receiver_mobile: event.target.value })}
          />
        </label>
        <label>
          省
          <input value={form.province} onChange={(event) => setForm({ ...form, province: event.target.value })} />
        </label>
        <label>
          市
          <input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} />
        </label>
        <label>
          区县
          <input value={form.district} onChange={(event) => setForm({ ...form, district: event.target.value })} />
        </label>
        <label>
          详细地址
          <input
            value={form.detail_address}
            onChange={(event) => setForm({ ...form, detail_address: event.target.value })}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={form.is_default}
            onChange={(event) => setForm({ ...form, is_default: event.target.checked })}
          />
          设为默认
        </label>
        <button type="submit">保存地址</button>
      </form>

      <section>
        <h2>地址列表</h2>
        {addresses.length > 0 ? (
          <ul>
            {addresses.map((address) => (
              <li key={address.id}>
                #{address.id} {address.receiver_name} {address.receiver_mobile} - {address.province}
                {address.city}
                {address.district ?? ''}
                {address.detail_address} {address.is_default ? '默认' : ''}
                <button type="button" onClick={() => handleSetDefault(address.id)}>
                  设为默认
                </button>
                <button type="button" onClick={() => handleDelete(address.id)}>
                  删除
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p>暂无地址</p>
        )}
      </section>
      {message && <p>{message}</p>}
    </main>
  )
}
