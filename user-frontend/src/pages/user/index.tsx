import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Avatar,
  Button,
  Card,
  DatePicker,
  Empty,
  Image,
  Input,
  List,
  Select,
  Spin,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd'
import type { UploadProps } from 'antd'
import {
  CalendarOutlined,
  EditOutlined,
  HeartOutlined,
  ShopOutlined,
  StarOutlined,
  GiftOutlined,
  FireOutlined,
  CrownOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'

import { authService, type MemberLevel, type PointsAccount, type PointsLog, type UserProfile } from '../../services/auth'
import { productService, type MerchantFollowItem, type ProductFavoriteItem } from '../../services/product'
import { uploadService } from '../../services/upload'
import { getApiErrorMessage } from '../../services/http'
import { absoluteAssetUrl, yuan } from '../../utils/format'

const { Text } = Typography

const GENDER_OPTIONS = [
  { value: 'male', label: '男' },
  { value: 'female', label: '女' },
  { value: 'secret', label: '保密' },
]

type SectionTab = 'profile' | 'points' | 'favorites' | 'follows'

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
  const [activeTab, setActiveTab] = useState<SectionTab>('profile')

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
      <div className="uc-page">
        <Empty description="请先登录后查看个人中心" style={{ padding: '120px 0' }} />
      </div>
    )
  }

  const TABS: { key: SectionTab; label: string; icon: React.ReactNode }[] = [
    { key: 'profile', label: '个人资料', icon: <EditOutlined /> },
    { key: 'points', label: '积分与会员', icon: <GiftOutlined /> },
    { key: 'favorites', label: `商品收藏 (${favoriteProducts.length})`, icon: <HeartOutlined /> },
    { key: 'follows', label: `关注店铺 (${followedMerchants.length})`, icon: <ShopOutlined /> },
  ]

  return (
    <div className="uc-page">
      <Spin spinning={loading}>
        {/* ── Profile Hero Banner ── */}
        <div className="uc-hero">
          <div className="uc-hero-bg" />
          <div className="uc-hero-content">
            <Upload {...uploadProps}>
              <div className="uc-avatar-wrap">
                <Avatar
                  size={80}
                  src={absoluteAssetUrl(profileAvatarUrl) || undefined}
                  className="uc-avatar"
                >
                  {profile?.nickname?.slice(0, 1) ?? 'U'}
                </Avatar>
                <div className="uc-avatar-edit"><EditOutlined /></div>
              </div>
            </Upload>
            <div className="uc-hero-info">
              <h1 className="uc-hero-name">{profile?.nickname ?? '用户'}</h1>
              <div className="uc-hero-meta">
                <Tag className="uc-tag-user-id">用户 #{profile?.id ?? '-'}</Tag>
                {memberLevel && (
                  <Tag className="uc-tag-level">
                    <CrownOutlined /> {memberLevel.level_name}
                  </Tag>
                )}
                {profile?.mobile && <Text className="uc-hero-mobile">{profile.mobile}</Text>}
              </div>
            </div>
            <div className="uc-hero-actions">
              {pointsAccount && !pointsAccount.sign_in_today && (
                <Button
                  type="primary"
                  icon={<FireOutlined />}
                  onClick={() => void signIn()}
                  className="btn-uc-signin"
                >
                  每日签到
                </Button>
              )}
              {pointsAccount?.sign_in_today && (
                <Tag className="uc-tag-signed">
                  <FireOutlined /> 今日已签到 · 连续 {pointsAccount.current_streak_days} 天
                </Tag>
              )}
            </div>
          </div>
        </div>

        {/* ── Stats Row ── */}
        <div className="uc-stats">
          <div className="uc-stat-card">
            <div className="uc-stat-icon uc-stat-points"><GiftOutlined /></div>
            <div className="uc-stat-body">
              <span className="uc-stat-value">{pointsAccount?.points ?? profile?.points ?? 0}</span>
              <span className="uc-stat-label">积分余额</span>
            </div>
          </div>
          <div className="uc-stat-card">
            <div className="uc-stat-icon uc-stat-growth"><StarOutlined /></div>
            <div className="uc-stat-body">
              <span className="uc-stat-value">{memberLevel?.growth_value_cent ?? 0}</span>
              <span className="uc-stat-label">成长值</span>
            </div>
          </div>
          <div className="uc-stat-card">
            <div className="uc-stat-icon uc-stat-streak"><FireOutlined /></div>
            <div className="uc-stat-body">
              <span className="uc-stat-value">{pointsAccount?.current_streak_days ?? 0}</span>
              <span className="uc-stat-label">连续签到</span>
            </div>
          </div>
          <div className="uc-stat-card">
            <div className="uc-stat-icon uc-stat-fav"><HeartOutlined /></div>
            <div className="uc-stat-body">
              <span className="uc-stat-value">{favoriteProducts.length}</span>
              <span className="uc-stat-label">商品收藏</span>
            </div>
          </div>
        </div>

        {/* ── Tab Bar ── */}
        <div className="uc-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`uc-tab ${activeTab === tab.key ? 'uc-tab-active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ── Tab Content ── */}
        <div className="uc-tab-content">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <Card className="uc-card" title={<span className="uc-card-title">编辑个人资料</span>}>
              <div className="uc-form">
                <div className="uc-form-row">
                  <div className="uc-form-item">
                    <Text type="secondary" className="uc-form-label">昵称</Text>
                    <Input
                      value={profileNickname}
                      onChange={(e) => setProfileNickname(e.target.value)}
                      placeholder="昵称"
                    />
                  </div>
                  <div className="uc-form-item">
                    <Text type="secondary" className="uc-form-label">性别</Text>
                    <Select
                      style={{ width: '100%' }}
                      value={profileGender || undefined}
                      onChange={(value) => setProfileGender(value ?? '')}
                      options={GENDER_OPTIONS}
                      placeholder="选择性别"
                      allowClear
                    />
                  </div>
                </div>
                <div className="uc-form-row">
                  <div className="uc-form-item">
                    <Text type="secondary" className="uc-form-label">生日</Text>
                    <DatePicker
                      style={{ width: '100%' }}
                      value={profileBirthday ? dayjs(profileBirthday) : undefined}
                      onChange={(value) => setProfileBirthday(value ? value.format('YYYY-MM-DD') : '')}
                      placeholder="选择生日"
                    />
                  </div>
                  <div className="uc-form-item">
                    <Text type="secondary" className="uc-form-label">邮箱</Text>
                    <Input
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      placeholder="邮箱地址"
                    />
                  </div>
                </div>
                <Button type="primary" onClick={() => void updateProfile()} className="btn-uc-primary">
                  保存资料
                </Button>
              </div>
            </Card>
          )}

          {/* Points & Member Tab */}
          {activeTab === 'points' && (
            <>
              {/* Points Account */}
              <Card className="uc-card" title={<span className="uc-card-title">积分账户</span>}>
                {pointsAccount ? (
                  <div className="uc-points-grid">
                    <div className="uc-points-item">
                      <span className="uc-points-value">{pointsAccount.points}</span>
                      <span className="uc-points-label">积分余额</span>
                    </div>
                    <div className="uc-points-item">
                      <span className="uc-points-value">{pointsAccount.current_streak_days} 天</span>
                      <span className="uc-points-label">连续签到</span>
                    </div>
                    <div className="uc-points-item">
                      <span className="uc-points-value">{pointsAccount.today_reward_points}</span>
                      <span className="uc-points-label">今日签到奖励</span>
                    </div>
                    <div className="uc-points-item uc-points-action">
                      <Button
                        type="primary"
                        disabled={pointsAccount.sign_in_today}
                        onClick={() => void signIn()}
                        className="btn-uc-primary"
                      >
                        {pointsAccount.sign_in_today ? '今日已签到' : '立即签到'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Empty description="暂无积分账户信息" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
              </Card>

              {/* Member Level */}
              <Card className="uc-card" title={<span className="uc-card-title"><CrownOutlined /> 会员等级</span>}>
                {memberLevel ? (
                  <div className="uc-member">
                    <div className="uc-member-top">
                      <div className="uc-member-level-badge">
                        <CrownOutlined />
                        <span>{memberLevel.level_name}</span>
                      </div>
                      <Tag className="uc-tag-level-code">{memberLevel.level}</Tag>
                    </div>
                    <div className="uc-member-stats">
                      <div className="uc-member-stat">
                        <span className="uc-member-stat-label">成长值</span>
                        <span className="uc-member-stat-value">{memberLevel.growth_value_cent}</span>
                      </div>
                      <div className="uc-member-stat">
                        <span className="uc-member-stat-label">下一级</span>
                        <span className="uc-member-stat-value">
                          {memberLevel.next_level_name ?? '已满级'}
                        </span>
                      </div>
                      {memberLevel.next_level_need_cent != null && memberLevel.next_level_need_cent > 0 && (
                        <div className="uc-member-stat">
                          <span className="uc-member-stat-label">还需成长值</span>
                          <span className="uc-member-stat-value">{memberLevel.next_level_need_cent}</span>
                        </div>
                      )}
                    </div>
                    <div className="uc-member-benefits">
                      <Text type="secondary" className="uc-form-label">会员权益</Text>
                      <div className="uc-benefit-tags">
                        {memberLevel.benefits.length > 0 ? (
                          memberLevel.benefits.map((benefit) => (
                            <Tag className="uc-tag-benefit" key={benefit}>{benefit}</Tag>
                          ))
                        ) : (
                          <Text type="secondary">暂无权益</Text>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <Empty description="暂无会员等级信息" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
              </Card>

              {/* Points Logs */}
              <Card className="uc-card" title={<span className="uc-card-title">积分流水</span>}>
                <List
                  dataSource={pointsLogs}
                  locale={{ emptyText: '暂无积分流水' }}
                  renderItem={(log) => (
                    <List.Item className="uc-log-item">
                      <div className="uc-log-left">
                        <Text className="uc-log-desc">{log.description}</Text>
                        <div className="uc-log-meta">
                          <Tag className="uc-tag-source">{log.source_type}</Tag>
                          <Text type="secondary" className="uc-log-date">{log.created_at}</Text>
                        </div>
                      </div>
                      <div className="uc-log-right">
                        <Text className={`uc-log-change ${log.change_points >= 0 ? 'uc-log-positive' : 'uc-log-negative'}`}>
                          {log.change_points >= 0 ? '+' : ''}{log.change_points}
                        </Text>
                        <Text type="secondary" className="uc-log-balance">余额 {log.balance_points}</Text>
                      </div>
                    </List.Item>
                  )}
                />
              </Card>
            </>
          )}

          {/* Favorites Tab */}
          {activeTab === 'favorites' && (
            <Card className="uc-card" title={<span className="uc-card-title">商品收藏</span>}>
              {favoriteProducts.length === 0 ? (
                <Empty description="暂无收藏商品" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: '40px 0' }} />
              ) : (
                <div className="uc-fav-grid">
                  {favoriteProducts.map((item) => (
                    <div key={item.product.id} className="uc-fav-card">
                      <Link to={`/products/${item.product.id}`}>
                        {item.product.cover_url ? (
                          <Image
                            src={absoluteAssetUrl(item.product.cover_url)}
                            preview={false}
                            className="uc-fav-img"
                          />
                        ) : (
                          <div className="uc-fav-noimg">暂无图片</div>
                        )}
                      </Link>
                      <div className="uc-fav-body">
                        <Link to={`/products/${item.product.id}`}>
                          <Text className="uc-fav-name" ellipsis>{item.product.name}</Text>
                        </Link>
                        <Text type="secondary" className="uc-fav-merchant">{item.product.merchant_name}</Text>
                        <div className="uc-fav-bottom">
                          <span className="uc-fav-price">¥{yuan(item.product.price_cent)}</span>
                          <Button
                            size="small"
                            danger
                            type="link"
                            onClick={() => void removeFavoriteProduct(item.product.id)}
                          >
                            取消收藏
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Follows Tab */}
          {activeTab === 'follows' && (
            <Card className="uc-card" title={<span className="uc-card-title">关注的店铺</span>}>
              {followedMerchants.length === 0 ? (
                <Empty description="暂无关注的店铺" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: '40px 0' }} />
              ) : (
                <div className="uc-follow-grid">
                  {followedMerchants.map((item) => (
                    <Link to={`/merchants/${item.merchant.id}`} key={item.merchant.id} className="uc-follow-card">
                      <div className="uc-follow-left">
                        {item.merchant.logo_url ? (
                          <Avatar size={48} src={absoluteAssetUrl(item.merchant.logo_url)} />
                        ) : (
                          <Avatar size={48} className="uc-follow-avatar">
                            {item.merchant.name?.slice(0, 1) ?? '店'}
                          </Avatar>
                        )}
                      </div>
                      <div className="uc-follow-body">
                        <Text strong className="uc-follow-name">{item.merchant.name}</Text>
                        <div className="uc-follow-meta">
                          <span><ShopOutlined /> {item.follower_count} 人关注</span>
                          <span><CalendarOutlined /> {item.followed_at?.slice(0, 10) ?? '-'}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      </Spin>
    </div>
  )
}
