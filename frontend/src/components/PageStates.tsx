import { Alert, Button, Card, Skeleton, Space, Typography } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

/** 路由懒加载与首次请求时的占位骨架，避免出现整块空白。 */
export function PageSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="page-skeleton" aria-busy="true" aria-live="polite">
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
  return (
    <Alert
      type="error"
      showIcon
      title={title}
      description={error?.message ?? '请稍后重试，或确认后端服务是否已启动。'}
      action={
        onRetry ? (
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
  return (
    <Card className="state-card">
      <div className="gate">
        <span className="gate-icon" aria-hidden="true">
          <LockOutlined />
        </span>
        <Typography.Title level={4}>{title}</Typography.Title>
        <Typography.Paragraph type="secondary">{description}</Typography.Paragraph>
        <Space wrap>
          <Button type="primary" onClick={() => navigate('/login')}>
            登录 / 注册
          </Button>
          <Button onClick={() => navigate('/study')}>先去练习</Button>
        </Space>
      </div>
    </Card>
  );
}
