import { Badge, Button, Card, Empty, Input, List, Space, Spin, Tag, Typography, message } from 'antd'
import {
  CustomerServiceOutlined,
  ReloadOutlined,
  SendOutlined,
  ShopOutlined,
  StopOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useEffect, useMemo, useState } from 'react'

import {
  adminCustomerService,
  type CustomerServiceConversation,
  type CustomerServiceMessage,
} from '../../services/customerService'

const { Text, Title } = Typography

type SessionType = 'platform' | 'merchant'

type Props = {
  session: SessionType
  eyebrow: string
  title: string
  scopeLabel: string
  emptyText: string
}

type PageResult<T> = { list: T[]; total?: number }

function pageList<T>(data: unknown) {
  return ((data as PageResult<T> | null)?.list ?? []) as T[]
}

function getApiErrorMessage(error: unknown) {
  const payload = error as { response?: { data?: { message?: string } }; message?: string }
  return payload.response?.data?.message ?? payload.message ?? '请求失败'
}

function conversationStatusText(status: string) {
  if (status === 'open') return '进行中'
  if (status === 'closed') return '已结束'
  return status
}

function conversationStatusColor(status: string) {
  if (status === 'open') return 'green'
  if (status === 'closed') return 'default'
  return 'blue'
}

function senderText(senderType: string) {
  if (senderType === 'user') return '用户'
  if (senderType === 'merchant') return '商家客服'
  if (senderType === 'platform') return '平台客服'
  return senderType
}

function formatTime(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function conversationTitle(conversation: CustomerServiceConversation, session: SessionType) {
  if (session === 'platform') return conversation.user_nickname || `用户 #${conversation.user_id}`
  return conversation.user_nickname || `用户 #${conversation.user_id}`
}

export function CustomerServiceWorkspace({ session, eyebrow, title, scopeLabel, emptyText }: Props) {
  const [conversations, setConversations] = useState<CustomerServiceConversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<CustomerServiceConversation | null>(null)
  const [messages, setMessages] = useState<CustomerServiceMessage[]>([])
  const [messageContent, setMessageContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [messageLoading, setMessageLoading] = useState(false)
  const [sending, setSending] = useState(false)

  const selectedMeta = useMemo(() => {
    if (!selectedConversation) return ''
    return [
      selectedConversation.order_no ? `订单 ${selectedConversation.order_no}` : null,
      selectedConversation.product_name ? `商品 ${selectedConversation.product_name}` : null,
    ]
      .filter(Boolean)
      .join(' · ')
  }, [selectedConversation])

  async function loadConversations(nextSelectedId?: number) {
    setLoading(true)
    try {
      const response = await adminCustomerService.listConversations(session, { page_size: 50 })
      const list = pageList<CustomerServiceConversation>(response.data)
      setConversations(list)
      if (nextSelectedId) {
        const refreshed = list.find((item) => item.id === nextSelectedId)
        if (refreshed) setSelectedConversation(refreshed)
      }
    } catch (error) {
      message.error(`加载客服会话失败：${getApiErrorMessage(error)}`)
    } finally {
      setLoading(false)
    }
  }

  async function openConversation(conversation: CustomerServiceConversation) {
    setSelectedConversation(conversation)
    setMessageLoading(true)
    try {
      const response = await adminCustomerService.listMessages(session, conversation.id, { page_size: 100 })
      setMessages(pageList<CustomerServiceMessage>(response.data))
    } catch (error) {
      message.error(`加载消息失败：${getApiErrorMessage(error)}`)
    } finally {
      setMessageLoading(false)
    }
  }

  async function sendMessage() {
    if (!selectedConversation) return
    const content = messageContent.trim()
    if (!content) return
    setSending(true)
    try {
      const response = await adminCustomerService.sendMessage(session, selectedConversation.id, { content })
      setMessages((items) => [...items, response.data])
      setMessageContent('')
      await loadConversations(selectedConversation.id)
    } catch (error) {
      message.error(`发送回复失败：${getApiErrorMessage(error)}`)
    } finally {
      setSending(false)
    }
  }

  async function closeConversation() {
    if (!selectedConversation) return
    try {
      const response = await adminCustomerService.closeConversation(session, selectedConversation.id)
      setSelectedConversation(response.data)
      message.success('会话已结束')
      await loadConversations(response.data.id)
    } catch (error) {
      message.error(`结束会话失败：${getApiErrorMessage(error)}`)
    }
  }

  useEffect(() => {
    void loadConversations()
  }, [session])

  return (
    <main className="admin-page">
      <section className="admin-hero">
        <div>
          <Text className="eyebrow">{eyebrow}</Text>
          <Title level={1}>{title}</Title>
        </div>
        <Button icon={<ReloadOutlined />} onClick={() => void loadConversations()}>
          刷新
        </Button>
      </section>

      <Card className="admin-cs-card" title={scopeLabel}>
        <div className="admin-cs-layout">
          <aside className="admin-cs-sidebar">
            <Spin spinning={loading}>
              <List
                className="admin-cs-list"
                dataSource={conversations}
                locale={{ emptyText }}
                renderItem={(conversation) => (
                  <List.Item
                    className={`admin-cs-list-item ${
                      selectedConversation?.id === conversation.id ? 'admin-cs-list-item-active' : ''
                    }`}
                    onClick={() => void openConversation(conversation)}
                  >
                    <div className="admin-cs-list-content">
                      <div className="admin-cs-list-top">
                        <Space size={6}>
                          {session === 'platform' ? <CustomerServiceOutlined /> : <ShopOutlined />}
                          <Text strong>{conversationTitle(conversation, session)}</Text>
                        </Space>
                        {conversation.unread_count ? <Badge count={conversation.unread_count} /> : null}
                      </div>
                      <Space size={6} wrap>
                        <Tag color={conversationStatusColor(conversation.status)}>
                          {conversationStatusText(conversation.status)}
                        </Tag>
                        <Tag>{conversation.target_type === 'platform' ? '平台客服' : '商家客服'}</Tag>
                      </Space>
                      {conversation.product_name ? (
                        <Text type="secondary" ellipsis>
                          商品：{conversation.product_name}
                        </Text>
                      ) : null}
                      {conversation.order_no ? (
                        <Text type="secondary" ellipsis>
                          订单：{conversation.order_no}
                        </Text>
                      ) : null}
                      <Text type="secondary" ellipsis>
                        {conversation.last_message || '暂无消息'}
                      </Text>
                      <Text type="secondary" className="admin-cs-time">
                        {formatTime(conversation.last_message_at || conversation.updated_at)}
                      </Text>
                    </div>
                  </List.Item>
                )}
              />
            </Spin>
          </aside>

          <section className="admin-cs-chat">
            {!selectedConversation ? (
              <div className="admin-cs-empty">
                <Empty description="请选择左侧会话" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              </div>
            ) : (
              <>
                <div className="admin-cs-chat-header">
                  <div>
                    <Space wrap>
                      <Text strong>
                        <UserOutlined /> {conversationTitle(selectedConversation, session)}
                      </Text>
                      <Tag color={conversationStatusColor(selectedConversation.status)}>
                        {conversationStatusText(selectedConversation.status)}
                      </Tag>
                    </Space>
                    {selectedMeta ? <div className="admin-cs-chat-subtitle">{selectedMeta}</div> : null}
                  </div>
                  <Button
                    danger
                    icon={<StopOutlined />}
                    disabled={selectedConversation.status === 'closed'}
                    onClick={() => void closeConversation()}
                  >
                    结束
                  </Button>
                </div>

                <Spin spinning={messageLoading}>
                  <div className="admin-cs-messages">
                    {messages.length === 0 ? (
                      <Empty description="暂无消息" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    ) : (
                      messages.map((item) => {
                        const isUser = item.sender_type === 'user'
                        return (
                          <div
                            key={item.id}
                            className={`admin-cs-message ${isUser ? 'admin-cs-message-user' : 'admin-cs-message-self'}`}
                          >
                            <div className="admin-cs-bubble">
                              <div className="admin-cs-sender">
                                {senderText(item.sender_type)}
                                {item.sender_name ? ` · ${item.sender_name}` : ''}
                              </div>
                              <div>{item.content}</div>
                              <time>{formatTime(item.created_at)}</time>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </Spin>

                <div className="admin-cs-input">
                  <Input.TextArea
                    rows={2}
                    value={messageContent}
                    onChange={(event) => setMessageContent(event.target.value)}
                    onPressEnter={(event) => {
                      if (!event.shiftKey) {
                        event.preventDefault()
                        void sendMessage()
                      }
                    }}
                    placeholder="输入回复内容，Enter 发送，Shift + Enter 换行"
                    disabled={selectedConversation.status === 'closed'}
                  />
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    loading={sending}
                    disabled={
                      !messageContent.trim() ||
                      selectedConversation.status === 'closed' ||
                      sending
                    }
                    onClick={() => void sendMessage()}
                  >
                    发送
                  </Button>
                </div>
              </>
            )}
          </section>
        </div>
      </Card>
    </main>
  )
}
