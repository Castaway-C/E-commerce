import { ArrowRightOutlined, AuditOutlined, ShopOutlined, TeamOutlined } from '@ant-design/icons'
import { Button, Card, Typography } from 'antd'
import { Link, useNavigate } from 'react-router-dom'
import mygoIcon from '../../styles/MyGO_icon.svg'

const { Paragraph } = Typography

export function PortalPage() {
  const navigate = useNavigate()

  return (
    <div className="portal-page">
      <header className="top-header">
        <div className="brand">
          <div className="logo"><img src={mygoIcon} alt="MyGO" /></div>
          <div className="brand-text">
            <h1>一次买够</h1>
            <span>运营后台</span>
          </div>
        </div>
        <nav className="top-nav">
          <Link to="/" className="active">管理首页</Link>
          <Link to="/admin/dashboard">平台管理</Link>
          <Link to="/merchant/dashboard">商家管理</Link>
          <Link to="/onboarding">商家入驻</Link>
        </nav>
      </header>

      <main className="portal-main">
        <section className="hero-banner">
          <div className="hero-label">一次买够运营端</div>
          <h1 className="hero-title">平台端与商家端</h1>
        </section>

        <section className="portal-cards">
          <Card className="portal-card">
            <div className="portal-card-icon portal-card-icon-platform"><TeamOutlined /></div>
            <h3>平台运营</h3>
            <Paragraph>商家入驻审核、分类配置、商品监管、全平台订单、促销、社区内容管理。</Paragraph>
            <div className="card-actions">
              <Button type="primary" icon={<ArrowRightOutlined />} onClick={() => navigate('/admin/dashboard')}>
                进入平台页
              </Button>
            </div>
          </Card>
          <Card className="portal-card">
            <div className="portal-card-icon portal-card-icon-merchant"><ShopOutlined /></div>
            <h3>商家运营</h3>
            <Paragraph>商品上传、图片维护、SKU 价格库存、订单发货、本店优惠券。</Paragraph>
            <div className="card-actions">
              <Button type="primary" icon={<ArrowRightOutlined />} onClick={() => navigate('/merchant/dashboard')}>
                进入商家页
              </Button>
            </div>
          </Card>
          <Card className="portal-card">
            <div className="portal-card-icon portal-card-icon-onboarding"><AuditOutlined /></div>
            <h3>商家入驻</h3>
            <Paragraph>商家自助注册、待审核状态查看、被拒后重新提交资料。</Paragraph>
            <div className="card-actions">
              <Button type="primary" icon={<ArrowRightOutlined />} onClick={() => navigate('/onboarding')}>
                进入入驻页
              </Button>
            </div>
          </Card>
        </section>
      </main>
    </div>
  )
}
