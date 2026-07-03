import { useEffect, useState } from 'react'
import { Alert, Button, Card, Col, Empty, Form, Input, Popconfirm, Row, Space, Switch, Tag, Typography } from 'antd'

import { addressService, type Address, type AddressPayload } from '../../services/address'
import { authService } from '../../services/auth'
import { pickErrorMessage } from '../../utils/format'

const { Title, Text, Paragraph } = Typography

type AddressFormValues = {
  receiver_name: string
  receiver_mobile: string
  province: string
  city: string
  district?: string
  street?: string
  detail_address: string
  postal_code?: string
  address_tag?: string
  is_default?: boolean
}

function buildAddressText(address: Address) {
  return [address.province, address.city, address.district ?? '', address.street ?? '', address.detail_address]
    .filter(Boolean)
    .join(' ')
}

export function AddressPage() {
  const [addresses, setAddresses] = useState<Address[]>([])
  const [form] = Form.useForm<AddressFormValues>()
  const [editingAddressId, setEditingAddressId] = useState<number | undefined>()
  const [message, setMessage] = useState('')

  async function loadAddresses() {
    if (!authService.hasToken()) {
      setAddresses([])
      return
    }
    try {
      const response = await addressService.listAddresses()
      setAddresses(response.data ?? [])
    } catch (error) {
      setMessage(`加载地址失败：${pickErrorMessage(error) ?? '请求失败'}`)
      setAddresses([])
    }
  }

  useEffect(() => {
    void loadAddresses()
  }, [])

  function resetForm() {
    setEditingAddressId(undefined)
    form.resetFields()
  }

  async function handleSubmit() {
    let values: AddressFormValues
    try {
      values = await form.validateFields()
    } catch {
      return
    }
    setMessage('')
    const payload: AddressPayload = {
      receiver_name: values.receiver_name,
      receiver_mobile: values.receiver_mobile,
      province: values.province,
      city: values.city,
      district: values.district || null,
      street: values.street || null,
      detail_address: values.detail_address,
      postal_code: values.postal_code || null,
      address_tag: values.address_tag || null,
      is_default: values.is_default ?? (addresses.length === 0),
    }
    try {
      if (editingAddressId) {
        await addressService.updateAddress(editingAddressId, payload)
        setMessage('地址已修改')
      } else {
        await addressService.createAddress(payload)
        setMessage('地址已保存')
      }
      resetForm()
      await loadAddresses()
    } catch (error) {
      setMessage(`保存地址失败：${pickErrorMessage(error) ?? '请求失败'}`)
    }
  }

  function handleEdit(address: Address) {
    setEditingAddressId(address.id)
    form.setFieldsValue({
      receiver_name: address.receiver_name,
      receiver_mobile: address.receiver_mobile,
      province: address.province,
      city: address.city,
      district: address.district ?? '',
      street: address.street ?? '',
      detail_address: address.detail_address,
      postal_code: address.postal_code ?? '',
      address_tag: address.address_tag ?? '',
      is_default: address.is_default,
    })
  }

  async function handleSetDefault(addressId: number) {
    setMessage('')
    try {
      await addressService.updateAddress(addressId, { is_default: true })
      setMessage('默认地址已更新')
      await loadAddresses()
    } catch (error) {
      setMessage(`设置默认地址失败：${pickErrorMessage(error) ?? '请求失败'}`)
    }
  }

  async function handleDelete(addressId: number) {
    setMessage('')
    try {
      await addressService.deleteAddress(addressId)
      setMessage('地址已删除')
      if (editingAddressId === addressId) {
        resetForm()
      }
      await loadAddresses()
    } catch (error) {
      setMessage(`删除地址失败：${pickErrorMessage(error) ?? '请求失败'}`)
    }
  }

  return (
    <main className="page-shell">
      <Title level={2}>收货地址</Title>

      {message && (
        <Alert
          style={{ maxWidth: 960, marginBottom: 16 }}
          showIcon
          type="info"
          message={message}
          onClose={() => setMessage('')}
          closable
        />
      )}

      <Card
        title={editingAddressId ? `编辑地址 #${editingAddressId}` : '新增地址'}
        style={{ maxWidth: 960, marginBottom: 24 }}
        extra={editingAddressId ? <Button onClick={resetForm}>取消编辑</Button> : undefined}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="receiver_name" label="收货人" rules={[{ required: true, message: '请输入收货人姓名' }]}>
                <Input placeholder="收货人姓名" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="receiver_mobile" label="手机号" rules={[{ required: true, message: '请输入收货人手机号' }]}>
                <Input placeholder="收货人手机号" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item name="province" label="省" rules={[{ required: true, message: '请输入省' }]}>
                <Input placeholder="例如：广东省" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="city" label="市" rules={[{ required: true, message: '请输入市' }]}>
                <Input placeholder="例如：广州市" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="district" label="区县">
                <Input placeholder="例如：天河区" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="street" label="街道">
                <Input placeholder="街道/乡镇" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item name="postal_code" label="邮政编码">
                <Input placeholder="邮政编码" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item name="address_tag" label="地址标签">
                <Input placeholder="例如：家、公司" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="detail_address" label="详细地址" rules={[{ required: true, message: '请输入详细地址' }]}>
            <Input.TextArea placeholder="楼栋、门牌等详细地址" autoSize={{ minRows: 2, maxRows: 4 }} />
          </Form.Item>
          <Form.Item name="is_default" valuePropName="checked">
            <Switch checkedChildren="默认地址" unCheckedChildren="非默认" />
          </Form.Item>
          <Space>
            <Button type="primary" onClick={handleSubmit}>
              {editingAddressId ? '保存修改' : '保存地址'}
            </Button>
            <Button onClick={resetForm}>重置</Button>
          </Space>
        </Form>
      </Card>

      <Card title="地址列表" style={{ maxWidth: 960 }}>
        {addresses.length === 0 ? (
          <Empty description="暂无收货地址" />
        ) : (
          <Row gutter={[16, 16]}>
            {addresses.map((address) => (
              <Col xs={24} md={12} key={address.id}>
                <Card
                  size="small"
                  title={
                    <Space>
                      <Text strong>#{address.id}</Text>
                      <Text strong>{address.receiver_name}</Text>
                      <Text type="secondary">{address.receiver_mobile}</Text>
                      {address.is_default && <Tag color="green">默认</Tag>}
                      {address.address_tag && <Tag color="blue">{address.address_tag}</Tag>}
                    </Space>
                  }
                  actions={[
                    <Button
                      key="default"
                      type="link"
                      size="small"
                      disabled={address.is_default}
                      onClick={() => handleSetDefault(address.id)}
                    >
                      设为默认
                    </Button>,
                    <Button key="edit" type="link" size="small" onClick={() => handleEdit(address)}>
                      编辑
                    </Button>,
                    <Popconfirm
                      key="delete"
                      title="确认删除该地址？"
                      onConfirm={() => handleDelete(address.id)}
                      okText="删除"
                      cancelText="取消"
                    >
                      <Button type="link" size="small" danger>
                        删除
                      </Button>
                    </Popconfirm>,
                  ]}
                >
                  <Paragraph style={{ marginBottom: 4 }}>{buildAddressText(address)}</Paragraph>
                  {address.postal_code && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      邮编：{address.postal_code}
                    </Text>
                  )}
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Card>
    </main>
  )
}
