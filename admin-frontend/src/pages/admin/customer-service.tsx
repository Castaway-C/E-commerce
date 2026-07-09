import { CustomerServiceWorkspace } from '../customer-service/CustomerServiceWorkspace'

export function AdminCustomerServicePage() {
  return (
    <CustomerServiceWorkspace
      session="platform"
      eyebrow="平台管理"
      title="平台客服"
      scopeLabel="平台咨询会话"
      emptyText="暂无平台客服会话"
    />
  )
}
