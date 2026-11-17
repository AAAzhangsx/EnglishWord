import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Row,
  Skeleton,
  Space,
  Statistic,
  Tag,
  Typography,
} from 'antd';
import { CalendarOutlined, CheckCircleFilled, LogoutOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { isUnauthorized, useCurrentUser } from '../lib/queries';
import { formatDateTime, shortDate, todayInShanghai } from '../lib/study';
import PageHeader from '../components/PageHeader';
import { AuthGate, ErrorState } from '../components/PageStates';
import { App as AntApp } from 'antd';

export default function AccountPage() {
  const navigate = useNavigate();
  const { message } = AntApp.useApp();
  const queryClient = useQueryClient();
  const auth = useCurrentUser();
  const { data: user, isPending: userPending } = auth;

  const checkins = useQuery({
    queryKey: ['checkins'],
    queryFn: api.checkins,
    enabled: Boolean(user),
  });

  const checkin = useMutation({
    mutationFn: api.checkIn,
    onSuccess: (result) => {
      message.success(
        result.alreadyCheckedIn ? '今天已经打过卡了' : `打卡成功，累计 ${result.totalDays} 天`,
      );
      void queryClient.invalidateQueries({ queryKey: ['checkins'] });
    },
    onError: (error: Error) => message.error(error.message),
  });

  const logout = useMutation({
    mutationFn: (withCheckin: boolean) => api.logout(withCheckin),
    onSuccess: (result, withCheckin) => {
      queryClient.clear();
      message.success(
        withCheckin ? `已打卡并退出，累计 ${result.checkin?.totalDays ?? 0} 天` : '已退出登录',
      );
      navigate('/');
    },
    onError: (error: Error) => message.error(error.message),
  });

  const today = todayInShanghai();
  const dates = checkins.data?.dates ?? [];
  const checkedInToday = dates.includes(today);
  const monthCount = dates.filter((date) => date.startsWith(today.slice(0, 7))).length;

  return (
    <div className="page-stack">
      <PageHeader
        title="账号与打卡"
        description="查看账号信息与打卡记录。每天一次打卡，记录你坚持学习的天数。"
        extra={
          user ? (
            <Button
              icon={<LogoutOutlined />}
              loading={logout.isPending}
              onClick={() => logout.mutate(false)}
            >
              退出登录
            </Button>
          ) : null
        }
      />

      {userPending ? (
        <Card>
          <Skeleton active avatar paragraph={{ rows: 3 }} />
        </Card>
      ) : auth.isError ? (
        <ErrorState
          title="账号状态加载失败"
          error={auth.error}
          onRetry={() => void auth.refetch()}
          retrying={auth.isFetching}
        />
      ) : !user ? (
        <AuthGate
          title="登录后使用账号与打卡"
          description="访客可以正常练习，但成绩、错题与打卡需要登录后才会保存到账号。"
        />
      ) : (
        <>
          <Row gutter={[20, 20]}>
            <Col xs={24} lg={13}>
              <Card className="surface-card account-card" title="账号信息">
                <div className="account-head">
                  <Avatar size={56} className="account-avatar">
                    {user.username.slice(0, 1).toUpperCase()}
                  </Avatar>
                  <div>
                    <Typography.Title level={4}>{user.username}</Typography.Title>
                    <Typography.Text type="secondary">
                      注册于 {formatDateTime(user.createdAt)}
                    </Typography.Text>
                  </div>
                </div>
                <Descriptions
                  column={1}
                  size="small"
                  items={[
                    { key: 'id', label: '用户编号', children: `#${user.id}` },
                    { key: 'name', label: '用户名', children: user.username },
                  ]}
                />
              </Card>
            </Col>
            <Col xs={24} lg={11}>
              <Card
                className="surface-card checkin-card"
                title={
                  <Space size={8}>
                    <CalendarOutlined />
                    每日打卡
                  </Space>
                }
                extra={
                  checkins.isPending || checkins.isError ? (
                    <Tag bordered={false}>状态待确认</Tag>
                  ) : checkedInToday ? (
                    <Tag bordered={false} color="green" icon={<CheckCircleFilled />}>
                      今日已打卡
                    </Tag>
                  ) : (
                    <Tag bordered={false} color="gold">
                      今日未打卡
                    </Tag>
                  )
                }
              >
                {checkins.isError ? (
                  isUnauthorized(checkins.error) ? (
                    <Alert
                      type="warning"
                      showIcon
                      title="登录状态已失效"
                      description="请重新登录后查看打卡记录。"
                      action={
                        <Button size="small" type="primary" onClick={() => navigate('/login')}>
                          重新登录
                        </Button>
                      }
                    />
                  ) : (
                    <ErrorState
                      title="打卡记录加载失败"
                      error={checkins.error}
                      onRetry={() => void checkins.refetch()}
                      retrying={checkins.isFetching}
                    />
                  )
                ) : checkins.isPending ? (
                  <Skeleton active paragraph={{ rows: 2 }} />
                ) : (
                  <>
                    <div className="metric-row metric-row--tight">
                      <Statistic
                        title="累计打卡"
                        value={checkins.data?.totalDays ?? 0}
                        suffix="天"
                        loading={checkins.isPending}
                      />
                      <Statistic title="本月打卡" value={monthCount} suffix="天" />
                    </div>
                    <div className="checkin-actions">
                      <Button
                        type="primary"
                        size="large"
                        loading={checkin.isPending}
                        disabled={checkedInToday || checkins.isPending}
                        onClick={() => checkin.mutate()}
                      >
                        {checkedInToday ? '今天已打卡' : '今日打卡'}
                      </Button>
                      <Typography.Text type="secondary">
                        打卡按上海日期计算，同一天多次只记一次。
                      </Typography.Text>
                    </div>
                  </>
                )}
              </Card>
            </Col>
          </Row>

          <Card className="surface-card" title="最近打卡">
            {checkins.isPending ? (
              <Skeleton active paragraph={{ rows: 2 }} />
            ) : checkins.isError ? (
              <Typography.Text type="secondary">
                记录暂时不可用，请在每日打卡卡片中重新加载。
              </Typography.Text>
            ) : dates.length === 0 ? (
              <Empty description="还没有打卡记录，今天就开始吧" />
            ) : (
              <div className="checkin-dates">
                {dates.slice(0, 21).map((date) => (
                  <Tag
                    key={date}
                    bordered={false}
                    color={date === today ? 'green' : 'default'}
                    className="checkin-date"
                  >
                    {shortDate(date)}
                  </Tag>
                ))}
                {dates.length > 21 ? (
                  <Typography.Text type="secondary">等共 {dates.length} 天</Typography.Text>
                ) : null}
              </div>
            )}
          </Card>

          <Card className="surface-card" title="登录状态">
            <Typography.Paragraph type="secondary">
              退出登录不会清除已保存的成绩、错题与打卡记录；选择「退出并打卡」会先记录今天的打卡再退出。
            </Typography.Paragraph>
            <Space wrap>
              <Button onClick={() => logout.mutate(false)} loading={logout.isPending}>
                退出登录
              </Button>
              <Button danger loading={logout.isPending} onClick={() => logout.mutate(true)}>
                退出并打卡
              </Button>
            </Space>
          </Card>
        </>
      )}
    </div>
  );
}
