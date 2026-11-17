import { Alert, Button, Card, Skeleton, Space, Typography } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../lib/api';

/** 路由懒加载与首次请求时的占位骨架，避免出现整块空白。 */
export function PageSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="page-skeleton" aria-busy="true" aria-live="polite">
      <span className="sr-only">正在加载页面，请稍候</span>
      <Skeleton active title={{ width: 220 }} paragraph={{ rows }} />
    </div>
  );
}

/** 统一的错误提示 + 重试入口。 */
export function ErrorState({
  title = '加载失败',
  error,
  onRetry,
  retrying = false,
}: {
  title?: string;
  error?: Error | null;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const expired = error instanceof ApiError && error.status === 401;
  return (
    <Alert
      className="error-state"
      type="error"
      showIcon
      title={expired ? '登录状态已失效' : title}
      description={
        expired
          ? '请重新登录，继续查看你的学习记录。'
          : (error?.message ?? '暂时无法连接服务，请稍后重试。')
      }
      action={
        expired ? (
          <Button
            size="small"
            type="primary"
            onClick={() =>
              navigate('/login', { state: { from: location.pathname + location.search } })
            }
          >
            重新登录
          </Button>
        ) : onRetry ? (
          <Button size="small" loading={retrying} onClick={onRetry}>
            重新加载
          </Button>
        ) : undefined
      }
    />
  );
}

/** 需要登录才能查看的内容：给出明确原因，并保留访客继续练习的出口。 */
export function AuthGate({
  title = '登录后查看',
  description = '访客可以自由练习，但成绩、错题与打卡需要登录后才会保存到账号。',
}: {
  title?: string;
  description?: string;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <Card className="state-card">
      <div className="gate">
        <span className="gate-icon" aria-hidden="true">
          <LockOutlined />
        </span>
        <Typography.Title level={4}>{title}</Typography.Title>
        <Typography.Paragraph type="secondary">{description}</Typography.Paragraph>
        <Space wrap>
          <Button
            type="primary"
            onClick={() =>
              navigate('/login', { state: { from: location.pathname + location.search } })
            }
          >
            登录 / 注册
          </Button>
          <Button onClick={() => navigate('/study')}>先去练习</Button>
        </Space>
      </div>
    </Card>
  );
}
