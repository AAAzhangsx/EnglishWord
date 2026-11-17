import {
  Alert,
  Button,
  Card,
  Col,
  Progress,
  Row,
  Skeleton,
  Space,
  Statistic,
  Tag,
  Typography,
} from 'antd';
import {
  ArrowRightOutlined,
  BookOutlined,
  FontSizeOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useCurrentUser, useStudyState } from '../lib/queries';
import { modeLabels, studyProgress } from '../lib/study';

const STEPS = [
  {
    index: '01',
    title: '预览词库',
    description: '查看英文、词性与多条中文释义，也能自己维护词库。',
    to: '/wordbooks',
    action: '浏览词库',
  },
  {
    index: '02',
    title: '即时反馈',
    description: '首次答对加 10 分，答错扣 10 分；当场重试不重复计分。',
    to: '/study',
    action: '开始背诵',
  },
  {
    index: '03',
    title: '错题重背',
    description: '完成一轮后，把本轮答错的单词单独再练一遍。',
    to: '/review',
    action: '查看错题',
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const health = useQuery({ queryKey: ['health'], queryFn: api.health });
  const books = useQuery({ queryKey: ['wordbooks'], queryFn: api.wordbooks });
  const { state, isPending: studyPending } = useStudyState();

  const bookCount = books.data?.items.length ?? 0;
  const wordCount = books.data?.items.reduce((sum, book) => sum + book.wordCount, 0) ?? 0;
  const running = Boolean(state && !state.finished);
  const connectionError = health.isError || books.isError;

  return (
    <div className="page-stack">
      <section className="hero">
        <span className="hero-watermark" aria-hidden="true">
          Aa
        </span>
        <div className="hero-content">
          <Tag bordered={false} color="green" className="hero-tag">
            {user ? `欢迎回来，${user.username}` : '让学习，成为每天的小习惯'}
          </Tag>
          <Typography.Title level={1}>从今天的第一个单词开始。</Typography.Title>
          <Typography.Paragraph className="hero-lead">
            选一本词库，试试选择题或拼写。每一次认真作答，都是一点进步。
          </Typography.Paragraph>
          <Space wrap size={12} className="hero-actions">
            <Button
              type="primary"
              size="large"
              icon={<ArrowRightOutlined />}
              iconPosition="end"
              onClick={() => navigate('/study')}
            >
              {running ? '继续本轮背诵' : '开始一轮背诵'}
            </Button>
            <Button size="large" icon={<BookOutlined />} onClick={() => navigate('/wordbooks')}>
              浏览词库
            </Button>
          </Space>
          <Typography.Text className="hero-note">
            {user
              ? '成绩、错题与打卡会保存在你的账号中。'
              : '访客模式下的本轮进度只保留一小时，登录后可长期保存。'}
          </Typography.Text>
        </div>
      </section>

      {connectionError ? (
        <Alert
          type="error"
          showIcon
          title="后端服务暂时连不上"
          description="请确认 C++ 服务已启动、8080 端口可用，然后重新加载。"
          action={
            <Button
              size="small"
              loading={health.isFetching || books.isFetching}
              onClick={() => {
                void health.refetch();
                void books.refetch();
              }}
            >
              重新加载
            </Button>
          }
        />
      ) : null}

      {!user && !studyPending ? (
        <Alert
          type="info"
          showIcon
          title="当前是访客模式"
          description="作答记录只保存在浏览器会话中，最长一小时；登录后成绩、错题与打卡都会保存到账号。"
          action={
            <Button size="small" type="primary" onClick={() => navigate('/login')}>
              登录 / 注册
            </Button>
          }
        />
      ) : null}

      {studyPending ? (
        <Card>
          <Skeleton active paragraph={{ rows: 2 }} />
        </Card>
      ) : running && state ? (
        <Card
          className="surface-card"
          title={
            <Space size={8} wrap>
              正在进行的学习
              <Tag bordered={false} color="green">
                {modeLabels[state.mode]}
              </Tag>
            </Space>
          }
          extra={
            <Typography.Text type="secondary">已完成本轮 {studyProgress(state)}%</Typography.Text>
          }
        >
          <div className="metric-row">
            <Statistic title="本轮得分" value={state.score} suffix="分" />
            <Statistic title="已答对" value={state.correctCount} suffix="题" />
            <Statistic title="错词" value={state.wrongCount} suffix="个" />
            <Statistic title="当前题号" value={`${state.currentIndex + 1} / ${state.totalCount}`} />
          </div>
          <Progress
            className="study-progress"
            percent={studyProgress(state)}
            showInfo={false}
            strokeColor={{ from: '#2f8a5f', to: '#176b57' }}
          />
          <Space wrap>
            <Button type="primary" onClick={() => navigate('/study')}>
              继续背诵
            </Button>
            <Button type="text" onClick={() => navigate('/statistics')}>
              查看本轮统计
            </Button>
          </Space>
        </Card>
      ) : null}

      <Row gutter={[20, 20]}>
        <Col xs={24} md={8}>
          <Card className="metric-card" loading={books.isPending}>
            <div className="metric-card-head">
              <span className="metric-icon metric-icon--green">
                <BookOutlined />
              </span>
              <Typography.Text type="secondary">可用词库</Typography.Text>
            </div>
            <Statistic value={bookCount} suffix="本" />
            <Typography.Text type="secondary" className="metric-hint">
              含公共示例与你的私人词库
            </Typography.Text>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="metric-card" loading={books.isPending}>
            <div className="metric-card-head">
              <span className="metric-icon metric-icon--cream">
                <FontSizeOutlined />
              </span>
              <Typography.Text type="secondary">可学词汇</Typography.Text>
            </div>
            <Statistic value={wordCount} suffix="词" />
            <Typography.Text type="secondary" className="metric-hint">
              进入任一词库即可查看全部单词
            </Typography.Text>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="metric-card">
            <div className="metric-card-head">
              <span className="metric-icon metric-icon--blue">
                <ThunderboltOutlined />
              </span>
              <Typography.Text type="secondary">背诵方式</Typography.Text>
            </div>
            <Statistic value={3} suffix="种" />
            <Typography.Text type="secondary" className="metric-hint">
              选择题 / 拼写单词 / 看英文写中文
            </Typography.Text>
          </Card>
        </Col>
      </Row>

      <Card className="surface-card" title="怎么用">
        <Row gutter={[24, 20]}>
          {STEPS.map((step) => (
            <Col xs={24} md={8} key={step.index}>
              <div className="step-item">
                <span className="step-index">{step.index}</span>
                <Typography.Title level={4}>{step.title}</Typography.Title>
                <Typography.Paragraph type="secondary">{step.description}</Typography.Paragraph>
                <Button type="link" className="step-link" onClick={() => navigate(step.to)}>
                  {step.action}
                  <ArrowRightOutlined />
                </Button>
              </div>
            </Col>
          ))}
        </Row>
      </Card>
    </div>
  );
}
