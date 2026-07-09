import { CustomerServiceWorkspace } from '../customer-service/CustomerServiceWorkspace'

export function MerchantCustomerServicePage() {
  return (
    <CustomerServiceWorkspace
      session="merchant"
      eyebrow="商家运营"
      title="本店客服"
      scopeLabel="本店咨询会话"
      emptyText="暂无本店客服会话"
    />
  )
}
