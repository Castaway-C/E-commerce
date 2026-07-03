import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Checkbox, Divider, Empty, InputNumber, List, Space, Spin, Tag, Typography, message } from 'antd'

import { authService } from '../../services/auth'
import { orderService, type CartItem } from '../../services/order'
import { pickErrorMessage, yuan } from '../../utils/format'

const { Text, Title, Paragraph } = Typography

export function CartPage() {
  const navigate = useNavigate()
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(false)

  async function loadCart() {
    if (!authService.hasToken()) return
    setLoading(true)
    try {
      const response = await orderService.listCart()
      setCart(response.data ?? [])
    } catch (error) {
      message.error(`加载购物车失败：${pickErrorMessage(error) ?? '请求失败'}`)
      setCart([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadCart()
  }, [])

  async function changeCartQuantity(item: CartItem, nextQuantity: number) {
    const safeQuantity = Math.max(1, Number(nextQuantity) || 1)
    setLoading(true)
    try {
      const response = await orderService.updateCartItem(item.sku_id, {
        quantity: safeQuantity,
        checked: item.checked,
      })
      setCart(response.data ?? [])
    } catch (error) {
      message.error(`修改数量失败：${pickErrorMessage(error) ?? '请求失败'}`)
    } finally {
      setLoading(false)
    }
  }

  async function toggleCartChecked(item: CartItem, checked: boolean) {
    setLoading(true)
    try {
      const response = await orderService.updateCartItem(item.sku_id, {
        quantity: item.quantity,
        checked,
      })
      setCart(response.data ?? [])
    } catch (error) {
      message.error(`勾选失败：${pickErrorMessage(error) ?? '请求失败'}`)
    } finally {
      setLoading(false)
    }
  }

  async function removeCartItem(item: CartItem) {
    setLoading(true)
    try {
      const response = await orderService.deleteCartItem(item.sku_id)
      setCart(response.data ?? [])
      message.success('已移除商品')
    } catch (error) {
      message.error(`移除失败：${pickErrorMessage(error) ?? '请求失败'}`)
    } finally {
      setLoading(false)
    }
  }

  async function batchSetCartChecked(checked: boolean) {
    const skuIds = cart.filter((item) => !item.invalid_reason).map((item) => item.sku_id)
    if (skuIds.length === 0) {
      message.info('没有可勾选的有效商品')
      return
    }
    setLoading(true)
    try {
      const response = await orderService.batchUpdateCartItems({ sku_ids: skuIds, checked })
      setCart(response.data ?? [])
    } catch (error) {
      message.error(`批量勾选失败：${pickErrorMessage(error) ?? '请求失败'}`)
    } finally {
      setLoading(false)
    }
  }

  const validCheckedItems = useMemo(
    () => cart.filter((item) => item.checked && !item.invalid_reason),
    [cart],
  )
  const totalCent = validCheckedItems.reduce((sum, item) => sum + item.price_cent * item.quantity, 0)
  const allChecked =
    cart.length > 0 && cart.every((item) => Boolean(item.invalid_reason) || item.checked)

  return (
    <main className="page-shell">
      <Space direction="vertical" size={24} style={{ width: '100%' }}>
        <Card>
          <Title level={3}>购物车</Title>
          <Paragraph type="secondary">
            勾选要结算的商品并调整数量，失效商品不会参与结算。点击“去结算”进入结算页提交订单并使用支付宝沙箱支付。
          </Paragraph>
        </Card>

        <Card
          title={`购物车商品（${cart.length}）`}
          extra={
            <Space wrap>
              <Button size="small" onClick={() => batchSetCartChecked(true)} disabled={cart.length === 0}>
                全选有效商品
              </Button>
              <Button size="small" onClick={() => batchSetCartChecked(false)} disabled={cart.length === 0}>
                取消全选
              </Button>
              <Button size="small" onClick={() => void loadCart()} loading={loading}>
                刷新
              </Button>
            </Space>
          }
        >
          <Spin spinning={loading}>
            <List
              dataSource={cart}
              locale={{ emptyText: <Empty description="购物车为空" /> }}
              renderItem={(item) => (
                <List.Item
                  className={item.invalid_reason ? 'cart-item-invalid' : undefined}
                  actions={[
                    <InputNumber
                      key="quantity"
                      min={1}
                      value={item.quantity}
                      disabled={Boolean(item.invalid_reason) || loading}
                      onChange={(value) => void changeCartQuantity(item, Number(value) || 1)}
                    />,
                    <Button
                      key="remove"
                      danger
                      type="link"
                      disabled={loading}
                      onClick={() => void removeCartItem(item)}
                    >
                      删除
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <Checkbox
                        checked={item.checked}
                        disabled={Boolean(item.invalid_reason)}
                        onChange={(event) => void toggleCartChecked(item, event.target.checked)}
                      />
                    }
                    title={<Text strong>{item.product_name}</Text>}
                    description={
                      <Space direction="vertical" size={2}>
                        <Space wrap size={4}>
                          <Text type="secondary">{item.sku_name}</Text>
                          <Tag>SKU #{item.sku_id}</Tag>
                        </Space>
                        {item.source_label || item.source_post_id ? (
                          <Space wrap size={4}>
                            {item.source_label ? <Tag color="purple">{item.source_label}</Tag> : null}
                            {item.source_post_id ? (
                              <Tag color="purple">种草来源 #{item.source_post_id}</Tag>
                            ) : null}
                          </Space>
                        ) : null}
                        {item.invalid_reason ? (
                          <Tag color="red">失效：{item.invalid_reason}</Tag>
                        ) : null}
                      </Space>
                    }
                  />
                  <Space direction="vertical" align="end" size={2}>
                    <Text type="secondary">单价 ￥{yuan(item.price_cent)}</Text>
                    <Text className="price">￥{yuan(item.price_cent * item.quantity)}</Text>
                  </Space>
                </List.Item>
              )}
            />
          </Spin>

          <Divider />

          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Space wrap align="center">
              <Checkbox
                checked={allChecked}
                onChange={(event) => void batchSetCartChecked(event.target.checked)}
                disabled={cart.length === 0}
              >
                全选
              </Checkbox>
              <Text type="secondary">已选有效商品 {validCheckedItems.length} 件</Text>
            </Space>
            {cart.some((item) => item.invalid_reason) ? (
              <Text type="secondary">失效商品不会参与结算，可调整商品后刷新购物车或直接删除。</Text>
            ) : null}
            <Space wrap align="center">
              <Text strong>合计：</Text>
              <Text className="price">￥{yuan(totalCent)}</Text>
              <Button
                type="primary"
                size="large"
                disabled={validCheckedItems.length === 0}
                onClick={() => navigate('/checkout')}
              >
                去结算
              </Button>
            </Space>
          </Space>
        </Card>
      </Space>
    </main>
  )
}
