import { Alert, Button, Card, Col, Progress, Row, Space, Statistic, Tag, Typography } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

export default function HomePage() {
  const health = useQuery({ queryKey: ['health'], queryFn: api.health });
  const books = useQuery({ queryKey: ['wordbooks'], queryFn: api.wordbooks });
  const study = useQuery({
    queryKey : ['study'],
    queryFn: api.study,
    staleTime: 0,
  });
  const state = study.data;
  return (
    <Space orientation="vertical" size={24} className="full-width">
      <section className="hero">
        <Tag color="green">让学习，成为每天的小习惯</Tag>
        <Typography.Title>从今天的第一个单词开始。</Typography.Title>
        <Typography.Paragraph>
          选一本词库，试试选择题或拼写。每一次认真作答，都是一点进步。
        </Typography.Paragraph>
        <Space wrap>
          <Link to="/study">
            <Button type="primary" size="large" icon={<ArrowRightOutlined />}>
              {state && !state.finished ? '继续背诵' : '开始一轮背诵'}
            </Button>
          </Link>
          <Link to="/wordbooks">
            <Button size="large">浏览示例词库</Button>
          </Link>
        </Space>
      </section>
      {(health.isError || books.isError) && (
        <Alert
          type="error"
          showIcon
          title="后端连接失败"
          description="请启动 C++ 服务，确认 8080 端口可用，再刷新页面。"
          action={
          <Button
          loading={health.isFetching || books.isFetching}
          onClick={()=> {
            void health.refetch();
            void books.refetch();
          }}>
        重新加载
        </Button>
        }
        />
      )}
      {state && !state.finished && (
        <Card title="正在进行的学习">
          <Typography.Paragraph>
            当前第{state.currentIndex + 1} /{state.totalCount} 题
          </Typography.Paragraph>

          <Space size="large">
            <Statistic title="本轮得分" value={state.score} />
            <Statistic title="本轮错词" value={state.wrongCount}/>
          </Space>

          <Progress percent={Math.round((state.currentIndex/state.totalCount) * 100 )} />
          <Link to="/study">
          <Button type='primary'>继续背诵</Button>
          </Link>
        </Card>
      )}
      <Row gutter={[20, 20]}>
        <Col xs={24} md={8}>
          <Card loading={books.isPending}>
            <Statistic title="可用示例词库" value={books.data?.items.length ?? 0} suffix="本" />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card loading={books.isPending}>
            <Statistic
              title="示例词汇"
              value={books.data?.items.reduce((sum, book) => sum + book.wordCount, 0) ?? 0}
              suffix="词"
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="背诵方式" value={2} suffix="种" />
            <Typography.Text type="secondary">选择题 / 英文拼写</Typography.Text>
          </Card>
        </Col>
      </Row>
      <Card title="本次可以体验">
        <Row gutter={[24, 20]}>
          <Col xs={24} md={8}>
            <Typography.Title level={4}>01 · 预览词库</Typography.Title>
            <p>查看英文、词性与多条中文释义。</p>
          </Col>
          <Col xs={24} md={8}>
            <Typography.Title level={4}>02 · 即时反馈</Typography.Title>
            <p>首次答对加 10 分，答错扣 10 分，重试不重复计分。</p>
          </Col>
          <Col xs={24} md={8}>
            <Typography.Title level={4}>03 · 错题重背</Typography.Title>
            <p>完成一轮后，单独练习本轮答错的单词。</p>
          </Col>
        </Row>
      </Card>
      <Alert
        type="info"
        showIcon
        title="当前为开发骨架"
        description="示例词库保存在 SQLite；本轮学习通过浏览器会话暂存。注册登录、私人词库编辑、历史成绩和打卡尚待实现。"
        />
    </Space>
  );
}
