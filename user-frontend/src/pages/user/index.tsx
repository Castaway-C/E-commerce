import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Avatar,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Empty,
  Image,
  Input,
  List,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd'
import type { UploadProps } from 'antd'
import dayjs from 'dayjs'

import { authService, type MemberLevel, type PointsAccount, type PointsLog, type UserProfile } from '../../services/auth'
import { productService, type MerchantFollowItem, type ProductFavoriteItem } from '../../services/product'
import { uploadService } from '../../services/upload'
import { getApiErrorMessage } from '../../services/http'
import { absoluteAssetUrl, yuan } from '../../utils/format'

const { Title, Text, Paragraph } = Typography

const GENDER_OPTIONS = [
  { value: 'male', label: '男' },
  { value: 'female', label: '女' },
  { value: 'secret', label: '保密' },
]

export function UserCenterPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileNickname, setProfileNickname] = useState('')
  const [profileGender, setProfileGender] = useState<string>('')
  const [profileBirthday, setProfileBirthday] = useState('')
  const [profileEmail, setProfileEmail] = useState('')
  const [profileAvatarUrl, setProfileAvatarUrl] = useState('')
  const [pointsAccount, setPointsAccount] = useState<PointsAccount | null>(null)
  const [memberLevel, setMemberLevel] = useState<MemberLevel | null>(null)
  const [pointsLogs, setPointsLogs] = useState<PointsLog[]>([])
  const [followedMerchants, setFollowedMerchants] = useState<MerchantFollowItem[]>([])
  const [favoriteProducts, setFavoriteProducts] = useState<ProductFavoriteItem[]>([])
  const [loading, setLoading] = useState(false)

  async function loadProfile() {
    const response = await authService.profile()
    const data = response.data
    setProfile(data)
    setProfileNickname(data.nickname)
    setProfileGender(data.gender ?? '')
    setProfileBirthday(data.birthday ?? '')
    setProfileEmail(data.email ?? '')
    setProfileAvatarUrl(data.avatar_url ?? '')
  }

  async function loadMemberAndPoints() {
    const [pointsRes, levelRes, logsRes] = await Promise.all([
      authService.pointsAccount(),
      authService.memberLevel(),
      authService.pointsLogs(),
    ])
    setPointsAccount(pointsRes.data)
    setMemberLevel(levelRes.data)
    setPointsLogs(logsRes.data?.list ?? [])
  }

  async function loadFollowedMerchants() {
    const response = await productService.listFollowedMerchants({ page_size: 20 })
    setFollowedMerchants(response.data?.list ?? [])
  }

  async function loadFavoriteProducts() {
    const response = await productService.listFavoriteProducts({ page_size: 20 })
    setFavoriteProducts(response.data?.list ?? [])
  }

  async function loadAll() {
    if (!authService.hasToken()) return
    setLoading(true)
    try {
      await Promise.all([loadProfile(), loadMemberAndPoints(), loadFollowedMerchants(), loadFavoriteProducts()])
    } catch (error) {
      message.error(`加载个人中心失败：${getApiErrorMessage(error)}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authService.hasToken()) {
      message.warning('请先登录后查看个人中心')
      return
    }
    void loadAll()
  }, [])

  async function updateProfile() {
    try {
      const response = await authService.updateProfile({
        nickname: profileNickname,
        gender: profileGender || null,
        birthday: profileBirthday || null,
        email: profileEmail || null,
        avatar_url: profileAvatarUrl || null,
      })
      setProfile(response.data)
      message.success('用户资料已更新')
    } catch (error) {
      message.error(`更新资料失败：${getApiErrorMessage(error)}`)
    }
  }

  async function signIn() {
    try {
      await authService.signIn()
      message.success('签到完成')
      await loadProfile()
      await loadMemberAndPoints()
    } catch (error) {
      message.error(`签到失败：${getApiErrorMessage(error)}`)
    }
  }

  async function uploadAvatar(file: File) {
    try {
      const response = await uploadService.uploadImage(file)
      setProfileAvatarUrl(response.data.url)
      message.success('头像已上传，请保存个人资料')
    } catch (error) {
      message.error(`上传头像失败：${getApiErrorMessage(error)}`)
    }
  }

  const uploadProps: UploadProps = {
    showUploadList: false,
    accept: 'image/*',
    beforeUpload: (file) => {
      void uploadAvatar(file)
      return false
    },
  }

  async function removeFavoriteProduct(productId: number) {
    try {
      await productService.unfavoriteProduct(productId)
      message.success('已取消收藏')
      await loadFavoriteProducts()
    } catch (error) {
      message.error(`取消收藏失败：${getApiErrorMessage(error)}`)
    }
  }

  if (!authService.hasToken()) {
    return (
      <main className="page-shell">
        <Title level={2}>个人中心</Title>
        <Empty description="请先登录后查看个人中心" />
      </main>
    )
  }

  return (
    <main className="page-shell">
      <Title level={2}>个人中心</Title>

      <Spin spinning={loading}>
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card title="个人资料" className="account-card">
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Space align="center">
                  <Upload {...uploadProps}>
                    <Avatar
                      size={96}
                      src={absoluteAssetUrl(profileAvatarUrl) || undefined}
                      style={{ backgroundColor: '#6366f1', cursor: 'pointer' }}
                    >
                      {profile?.nickname?.slice(0, 1) ?? 'U'}
                    </Avatar>
                  </Upload>
                  <div>
                    <Text strong>用户 ID：#{profile?.id ?? '-'}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      点击头像上传新图片
                    </Text>
                  </div>
                </Space>
                <Row gutter={12}>
                  <Col xs={24} sm={12}>
                    <div style={{ marginBottom: 4 }}>
                      <Text type="secondary">昵称</Text>
                    </div>
                    <Input value={profileNickname} onChange={(e) => setProfileNickname(e.target.value)} placeholder="昵称" />
                  </Col>
                  <Col xs={24} sm={12}>
                    <div style={{ marginBottom: 4 }}>
                      <Text type="secondary">性别</Text>
                    </div>
                    <Select
                      style={{ width: '100%' }}
                      value={profileGender || undefined}
                      onChange={(value) => setProfileGender(value ?? '')}
                      options={GENDER_OPTIONS}
                      placeholder="选择性别"
                      allowClear
                    />
                  </Col>
                </Row>
                <Row gutter={12}>
                  <Col xs={24} sm={12}>
                    <div style={{ marginBottom: 4 }}>
                      <Text type="secondary">生日</Text>
                    </div>
                    <DatePicker
                      style={{ width: '100%' }}
                      value={profileBirthday ? dayjs(profileBirthday) : undefined}
                      onChange={(value) => setProfileBirthday(value ? value.format('YYYY-MM-DD') : '')}
                      placeholder="选择生日"
                    />
                  </Col>
                  <Col xs={24} sm={12}>
                    <div style={{ marginBottom: 4 }}>
                      <Text type="secondary">邮箱</Text>
                    </div>
                    <Input
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      placeholder="邮箱地址"
                    />
                  </Col>
                </Row>
                <Button type="primary" onClick={updateProfile}>
                  保存资料
                </Button>
              </Space>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="积分账户" className="account-card">
              {pointsAccount ? (
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <Row gutter={16}>
                    <Col span={10}>
                      <Statistic title="积分余额" value={pointsAccount.points} valueStyle={{ color: '#dc2626' }} />
                    </Col>
                    <Col span={7}>
                      <Statistic
                        title="今日签到"
                        value={pointsAccount.sign_in_today ? '已签到' : '未签到'}
                      />
                    </Col>
                    <Col span={7}>
                      <Statistic title="连续签到" value={pointsAccount.current_streak_days} suffix="天" />
                    </Col>
                  </Row>
                  {pointsAccount.today_reward_points > 0 && (
                    <Text type="secondary">今日签到可获 {pointsAccount.today_reward_points} 积分</Text>
                  )}
                  <Button type="primary" disabled={pointsAccount.sign_in_today} onClick={signIn}>
                    {pointsAccount.sign_in_today ? '今日已签到' : '每日签到'}
                  </Button>
                </Space>
              ) : (
                <Empty description="暂无积分账户信息" />
              )}
            </Card>
          </Col>

          <Col xs={24}>
            <Card title="会员等级" className="account-card">
              {memberLevel ? (
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <Descriptions column={{ xs: 1, sm: 2 }} size="small" bordered>
                    <Descriptions.Item label="当前等级">
                      <Tag color="purple">{memberLevel.level_name}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="等级标识">{memberLevel.level}</Descriptions.Item>
                    <Descriptions.Item label="成长值">{memberLevel.growth_value_cent}</Descriptions.Item>
                    <Descriptions.Item label="下一级">
                      {memberLevel.next_level_name ? (
                        <span>
                          {memberLevel.next_level_name}
                          {memberLevel.next_level_need_cent != null
                            ? `（还需 ${memberLevel.next_level_need_cent}）`
                            : ''}
                        </span>
                      ) : (
                        '已满级'
                      )}
                    </Descriptions.Item>
                  </Descriptions>
                  <div>
                    <Text type="secondary" style={{ marginRight: 8 }}>
                      会员权益：
                    </Text>
                    {memberLevel.benefits.length > 0 ? (
                      memberLevel.benefits.map((benefit) => (
                        <Tag color="geekblue" key={benefit}>
                          {benefit}
                        </Tag>
                      ))
                    ) : (
                      <Text type="secondary">暂无权益</Text>
                    )}
                  </div>
                </Space>
              ) : (
                <Empty description="暂无会员等级信息" />
              )}
            </Card>
          </Col>

          <Col xs={24}>
            <Card title="积分流水" className="account-card">
              <List
                dataSource={pointsLogs}
                locale={{ emptyText: '暂无积分流水' }}
                renderItem={(log) => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <Space>
                          <Text>{log.description}</Text>
                          <Tag>{log.source_type}</Tag>
                        </Space>
                      }
                      description={<Text type="secondary" style={{ fontSize: 12 }}>{log.created_at}</Text>}
                    />
                    <Space direction="vertical" align="end" size={0}>
                      <Text type={log.change_points >= 0 ? 'success' : 'danger'} strong>
                        {log.change_points >= 0 ? '+' : ''}
                        {log.change_points}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        余额 {log.balance_points}
                      </Text>
                    </Space>
                  </List.Item>
                )}
              />
            </Card>
          </Col>

          <Col xs={24}>
            <Card title="商品收藏" className="account-card">
              {favoriteProducts.length === 0 ? (
                <Empty description="暂无收藏商品" />
              ) : (
                <Row gutter={[16, 16]}>
                  {favoriteProducts.map((item) => (
                    <Col xs={12} sm={8} md={6} key={item.product.id}>
                      <Card
                        hoverable
                        size="small"
                        cover={
                          item.product.cover_url ? (
                            <Image
                              src={absoluteAssetUrl(item.product.cover_url)}
                              preview={false}
                              style={{ height: 160, width: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <div
                              style={{
                                height: 160,
                                display: 'grid',
                                placeItems: 'center',
                                background: 'linear-gradient(135deg, #e0e7ff, #f5f3ff)',
                                color: '#64748b',
                                fontWeight: 800,
                              }}
                            >
                              暂无图片
                            </div>
                          )
                        }
                        actions={[
                          <Button
                            key="unfavorite"
                            type="link"
                            size="small"
                            danger
                            onClick={() => removeFavoriteProduct(item.product.id)}
                          >
                            取消收藏
                          </Button>,
                        ]}
                      >
                        <Card.Meta
                          title={
                            <Paragraph ellipsis={{ rows: 2 }} style={{ marginBottom: 0 }}>
                              {item.product.name}
                            </Paragraph>
                          }
                          description={
                            <div>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {item.product.merchant_name}
                              </Text>
                              <div className="price">¥{yuan(item.product.price_cent)}</div>
                            </div>
                          }
                        />
                      </Card>
                    </Col>
                  ))}
                </Row>
              )}
            </Card>
          </Col>

          <Col xs={24}>
            <Card title="关注的店铺" className="account-card">
              {followedMerchants.length === 0 ? (
                <Empty description="暂无关注的店铺" />
              ) : (
                <Row gutter={[16, 16]}>
                  {followedMerchants.map((item) => (
                    <Col xs={12} sm={8} md={6} key={item.merchant.id}>
                      <Card size="small">
                        <Card.Meta
                          avatar={
                            item.merchant.logo_url ? (
                              <Avatar src={absoluteAssetUrl(item.merchant.logo_url)} />
                            ) : (
                              <Avatar style={{ backgroundColor: '#6366f1' }}>
                                {item.merchant.name?.slice(0, 1) ?? '店'}
                              </Avatar>
                            )
                          }
                          title={
                            <Link to={`/merchants/${item.merchant.id}`}>{item.merchant.name}</Link>
                          }
                          description={
                            <Space direction="vertical" size={0} style={{ width: '100%' }}>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                关注于 {item.followed_at?.slice(0, 10) ?? '-'}
                              </Text>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {item.follower_count} 人关注
                              </Text>
                            </Space>
                          }
                        />
                      </Card>
                    </Col>
                  ))}
                </Row>
              )}
            </Card>
          </Col>
        </Row>
      </Spin>
    </main>
  )
}
