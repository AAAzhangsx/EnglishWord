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
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useCurrentUser, useStudyState } from '../lib/queries';
import { modeLabels, studyProgress } from '../lib/study';
import { ErrorState } from '../components/PageStates';

const STEPS = [
  {
    index: '01',
    title: '遇见新的单词',
    description: '从示例词库开始，或整理一本属于自己的词库。',
    to: '/wordbooks',
    action: '浏览词库',
  },
  {
    index: '02',
    title: '找到记忆的节奏',
    description: '选择、拼写、中文释义，用适合自己的方式记住它。',
    to: '/study',
    action: '开始背诵',
  },
  {
    index: '03',
    title: '让记忆更牢固',
    description: '把本轮错词再练一遍，让不熟悉的单词慢慢变熟。',
    to: '/review',
    action: '查看错题',
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const auth = useCurrentUser();
  const user = auth.data;
  const health = useQuery({ queryKey: ['health'], queryFn: api.health });
  const books = useQuery({ queryKey: ['wordbooks'], queryFn: api.wordbooks });
  const study = useStudyState();
  const { state, isPending: studyPending } = study;

  const bookCount = books.data?.items.length ?? 0;
  const wordCount = books.data?.items.reduce((sum, book) => sum + book.wordCount, 0) ?? 0;
  const running = Boolean(state && !state.finished);
  const connectionError = health.isError || books.isError;

  return (
    <div className="page-stack">
      <div className="overview-heading">
        <div>
          <span className="section-eyebrow">YOUR LEARNING, EVERY DAY</span>
          <Typography.Title level={2}>学习概览</Typography.Title>
        </div>
        <span className="overview-date">
          {new Intl.DateTimeFormat('zh-CN', {
            timeZone: 'Asia/Shanghai',
            month: 'long',
            day: 'numeric',
            weekday: 'long',
          }).format(new Date())}
        </span>
      </div>
      <section className="hero">
        <div className="hero-content">
          <Tag bordered={false} color="green" className="hero-tag">
            {user ? `欢迎回来，${user.username}` : '让学习，成为每天的小习惯'}
          </Tag>
          <Typography.Title level={1}>
            从今天的
            <br />
            <span>第一个单词</span>开始。
          </Typography.Title>
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
              : '正在以访客身份体验，登录后可保存学习记录。'}
          </Typography.Text>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="word-paper word-paper--back" />
          <div className="word-paper">
            <span className="paper-eyebrow">TODAY IS A GOOD DAY TO LEARN</span>
            <span className="paper-word">
              progress<span className="paper-dot">.</span>
            </span>
            <span className="paper-pronunciation">
              /ˈprəʊɡres/ <span>n.</span>
            </span>
            <span className="paper-meaning">进步；进展</span>
            <div className="paper-rule" />
            <span className="paper-example">A little progress, every day.</span>
            <span className="paper-translation">每天一点点，离目标更近一点。</span>
            <span className="paper-stamp">
              <BookOutlined /> 每天记住一点
            </span>
          </div>
          <span className="hero-art-caption">Small steps. Lasting memories.</span>
        </div>
      </section>

      {connectionError ? (
        <Alert
          type="error"
          showIcon
          title="暂时无法获取学习数据"
          description="请检查网络连接，稍后重新加载。"
          action={
            <Button
              size="small"
              loading={health.isFetching || books.isFetching}
              onClick={() => {
                void health.refetch();
                void books.refetch();
                void study.refetch();
                void auth.refetch();
              }}
            >
              重新加载
            </Button>
          }
        />
      ) : null}

      {auth.isError && !connectionError ? (
        <ErrorState
          title="账号状态加载失败"
          error={auth.error}
          onRetry={() => void auth.refetch()}
          retrying={auth.isFetching}
        />
      ) : null}
      {study.isError && !study.noSession && !connectionError ? (
        <ErrorState
          title="本轮进度加载失败"
          error={study.error}
          onRetry={() => void study.refetch()}
          retrying={study.isFetching}
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

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card className="metric-card" loading={books.isPending}>
            <div className="metric-card-head">
              <span className="metric-icon metric-icon--green">
                <BookOutlined />
              </span>
              <Typography.Text type="secondary">可用词库</Typography.Text>
            </div>
            <Statistic value={books.isError && !books.data ? '—' : bookCount} suffix="本" />
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
            <Statistic value={books.isError && !books.data ? '—' : wordCount} suffix="词" />
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

      <section className="learning-path" aria-labelledby="learning-path-title">
        <div className="section-heading">
          <Typography.Title level={3} id="learning-path-title">
            每一步，都算数
          </Typography.Title>
          <Typography.Text type="secondary">从认识，到记住，再到熟悉。</Typography.Text>
        </div>
        <Row gutter={[16, 16]}>
          {STEPS.map((step) => (
            <Col xs={24} md={8} key={step.index}>
              <Link to={step.to} className="step-item">
                <span className="step-index">{step.index}</span>
                <Typography.Title level={4}>{step.title}</Typography.Title>
                <Typography.Paragraph type="secondary">{step.description}</Typography.Paragraph>
                <span className="step-link">
                  {step.action}
                  <ArrowRightOutlined />
                </span>
              </Link>
            </Col>
          ))}
        </Row>
      </section>
    </div>
  );
}
