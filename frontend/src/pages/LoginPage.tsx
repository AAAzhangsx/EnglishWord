import { useState } from 'react';
import {
  App as AntApp,
  Alert,
  Button,
  Card,
  Form,
  Input,
  Result,
  Segmented,
  Space,
  Typography,
} from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useCurrentUser } from '../lib/queries';
import { ErrorState } from '../components/PageStates';

type Mode = 'login' | 'register';

interface FormValues {
  username: string;
  password: string;
}

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login');
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: unknown } | null)?.from;
  const destination =
    typeof from === 'string' &&
    from.startsWith('/') &&
    !from.startsWith('//') &&
    !from.startsWith('/login')
      ? from
      : '/';
  const queryClient = useQueryClient();
  const { message } = AntApp.useApp();
  const auth = useCurrentUser();
  const { data: user, isPending } = auth;

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (mode === 'register') await api.register(values.username, values.password);
      // 注册成功后直接登录，少一步操作。
      return api.login(values.username, values.password);
    },
    onSuccess: async (data) => {
      // 登录会切换数据归属，取消旧请求并清除访客及上一个账号的缓存。
      await queryClient.cancelQueries();
      queryClient.clear();
      queryClient.setQueryData(['me'], data.user);
      message.success(`欢迎，${data.user.username}`);
      navigate(destination, { replace: true });
    },
  });

  if (isPending) {
    return (
      <div className="auth-wrap">
        <Card className="auth-card" loading />
      </div>
    );
  }

  if (user) {
    return (
      <div className="auth-wrap">
        <Card className="auth-card auth-card--result">
          <Result
            status="success"
            title={`你已登录：${user.username}`}
            subTitle="可以直接开始背诵，成绩、错题与打卡都会保存到这个账号。"
            extra={
              <Space wrap>
                <Button type="primary" onClick={() => navigate('/study')}>
                  开始背诵
                </Button>
                <Button onClick={() => navigate('/account')}>账号与打卡</Button>
              </Space>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="auth-wrap">
      <Card className="auth-card">
        <div className="auth-brand">
          <span className="brand-mark auth-brand-mark" aria-hidden="true">
            E
          </span>
          <Typography.Title level={2}>
            {mode === 'login' ? '欢迎回来' : '创建账号'}
          </Typography.Title>
          <Typography.Text type="secondary">
            {mode === 'login'
              ? '登录后可以保存成绩、错题和打卡记录。'
              : '注册一个账号，从今天开始积累。'}
          </Typography.Text>
        </div>

        <Segmented
          block
          value={mode}
          disabled={mutation.isPending}
          onChange={(value) => {
            setMode(value as Mode);
            mutation.reset();
          }}
          options={[
            { label: '登录', value: 'login' },
            { label: '注册', value: 'register' },
          ]}
        />

        {auth.isError ? (
          <div className="auth-error">
            <ErrorState
              title="账号状态加载失败"
              error={auth.error}
              onRetry={() => void auth.refetch()}
              retrying={auth.isFetching}
            />
          </div>
        ) : null}
        {mutation.isError ? (
          <Alert
            className="auth-error"
            type="error"
            showIcon
            title={mode === 'login' ? '登录未成功' : '注册或登录未成功'}
            description={mutation.error.message}
          />
        ) : null}

        <Form<FormValues>
          layout="vertical"
          className="auth-form"
          onFinish={(values) => mutation.mutate(values)}
          requiredMark={false}
          disabled={mutation.isPending}
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[
              { required: true, message: '请输入用户名' },
              {
                pattern: /^[A-Za-z0-9_]{3,32}$/,
                message: '3-32 位字母、数字或下划线',
              },
            ]}
          >
            <Input
              size="large"
              autoComplete="username"
              prefix={<UserOutlined className="auth-input-icon" />}
              placeholder="3-32 位字母、数字或下划线"
            />
          </Form.Item>
          <Form.Item
            name="password"
            label="密码"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 8, message: '密码至少 8 位' },
            ]}
          >
            <Input.Password
              size="large"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              prefix={<LockOutlined className="auth-input-icon" />}
              placeholder="至少 8 位"
            />
          </Form.Item>
          <Button type="primary" size="large" htmlType="submit" loading={mutation.isPending} block>
            {mode === 'login' ? '登录' : '注册并登录'}
          </Button>
        </Form>

        <div className="auth-foot">
          <Button type="link" onClick={() => navigate('/study')}>
            先以访客身份体验
          </Button>
        </div>

        <Typography.Paragraph type="secondary" className="auth-note-text">
          访客作答只保留一小时且不写入账号；登录后成绩、错题与打卡会长期保存。
        </Typography.Paragraph>
      </Card>
    </div>
  );
}
