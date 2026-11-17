import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <Result
      status="404"
      title="页面不存在"
      subTitle="链接可能已经失效，或者地址输入有误。"
      extra={
        <Button type="primary" onClick={() => navigate('/')}>
          返回学习概览
        </Button>
      }
    />
  );
}
