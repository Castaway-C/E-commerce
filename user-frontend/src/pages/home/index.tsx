import { Link } from 'react-router-dom'

export function HomePage() {
  return (
    <main>
      <h1>一次买够用户端测试入口</h1>
      <p>
        当前可测试：注册登录、地址管理、商品浏览、加购、优惠券、结算、模拟支付、确认收货、评价、售后申请、社区发帖和种草来源下单。
      </p>
      <ol>
        <li>
          先进入 <Link to="/register">注册</Link> 或 <Link to="/login">登录</Link>。
        </li>
        <li>
          到 <Link to="/addresses">地址页</Link> 新增收货地址。
        </li>
        <li>
          到 <Link to="/products">商品列表</Link>，选择管理端已上架商品并加入购物车。
        </li>
        <li>
          到 <Link to="/cart">购物车</Link> 查看商品，再进入结算。
        </li>
        <li>
          可到 <Link to="/promotions">优惠券页</Link> 领取优惠券，并在结算页填写用户券 ID。
        </li>
        <li>
          在 <Link to="/checkout">结算页</Link> 提交订单并模拟支付。
        </li>
        <li>
          到 <Link to="/community">社区页</Link> 测试发帖、点赞、评论和种草来源下单。
        </li>
        <li>
          到 <Link to="/orders">订单列表</Link> 测试确认收货、评价和售后申请。
        </li>
      </ol>
      <p>占位：真实支付、积分、更多促销规则后续阶段补充；本项目不实现物流轨迹查询。</p>
    </main>
  )
}
