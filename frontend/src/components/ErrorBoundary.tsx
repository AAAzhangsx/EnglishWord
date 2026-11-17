import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button, Result, Typography } from 'antd';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * 页面级错误边界：某个页面渲染异常时只替换内容区，
 * 导航和页头仍然可用，用户不会看到整页白屏。
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('页面渲染出错：', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <Result
        status="error"
        title="这个页面出了点问题"
        subTitle="可以刷新重试；如果反复出现，请把下面的信息反馈给开发者。"
        extra={
          <Button type="primary" onClick={() => window.location.reload()}>
            刷新页面
          </Button>
        }
      >
        <Typography.Paragraph type="secondary" className="error-detail">
          {error.message}
        </Typography.Paragraph>
      </Result>
    );
  }
}
