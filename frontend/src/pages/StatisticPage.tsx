import {
  Button,
  Card,
  Empty,
  Progress,
  Skeleton,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { BarChartOutlined, ReadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api, type StudyHistoryEntry } from '../lib/api';
import { useCurrentUser, useStudyState } from '../lib/queries';
import {
  formatDateTime,
  modeLabels,
  percentage,
  questionNumber,
  studyProgress,
} from '../lib/study';
import PageHeader from '../components/PageHeader';
import { AuthGate, ErrorState } from '../components/PageStates';

export default function StatisticPage() {
  const navigate = useNavigate();
  const auth = useCurrentUser();
  const { data: user, isPending: userPending } = auth;
  const study = useStudyState();
  const state = study.state;

  const stats = useQuery({
    queryKey: ['statistics'],
    queryFn: api.statistics,
    enabled: Boolean(user),
  });
  const history = useQuery({
    queryKey: ['history'],
    queryFn: api.history,
    enabled: Boolean(user),
  });

  const historyColumns: ColumnsType<StudyHistoryEntry> = [
    {
      title: '完成时间',
      dataIndex: 'finishedAt',
      width: 140,
      render: (_value, entry) => (
        <span className="mono-soft">{formatDateTime(entry.finishedAt ?? entry.startedAt)}</span>
      ),
    },
    { title: '词库', dataIndex: 'wordbookName', ellipsis: true },
    {
      title: '方式',
      dataIndex: 'mode',
      width: 120,
      render: (mode: StudyHistoryEntry['mode']) => (
        <Tag bordered={false}>{modeLabels[mode] ?? mode}</Tag>
      ),
    },
    {
      title: '得分',
      dataIndex: 'score',
      width: 90,
      align: 'right',
      render: (score: number) => <strong>{score}</strong>,
    },
    {
      title: '正确率',
      dataIndex: 'accuracy',
      width: 100,
      align: 'right',
      render: (accuracy: number, entry) => (
        <span className="mono-soft">{percentage(entry.correctCount, entry.totalCount)}%</span>
      ),
    },
    {
      title: '结果',
      dataIndex: 'passed',
      width: 100,
      render: (passed: boolean, entry) =>
        !entry.finished ? (
          <Tag bordered={false} color="gold">
            未完成
          </Tag>
        ) : passed ? (
          <Tag bordered={false} color="green">
            过关
          </Tag>
        ) : (
          <Tag bordered={false}>未过关</Tag>
        ),
    },
  ];

  return (
    <div className="page-stack">
      <PageHeader
        title="学习统计"
        description="本轮进度、累计成绩与最近的历史记录都在这里。"
        extra={
          <Button icon={<ReadOutlined />} onClick={() => navigate('/study')}>
            去背诵
          </Button>
        }
      />

      <Card
        className={state ? 'surface-card' : 'state-card'}
        title="本轮"
        extra={
          state ? (
            <Tag bordered={false} color={state.finished ? 'green' : 'gold'}>
              {state.finished ? '已完成' : '进行中'}
            </Tag>
          ) : null
        }
      >
        {study.isPending ? (
          <Skeleton active paragraph={{ rows: 2 }} />
        ) : study.error && !study.noSession ? (
          <ErrorState
            title="本轮状态加载失败"
            error={study.error}
            onRetry={() => void study.refetch()}
            retrying={study.isFetching}
          />
        ) : !state ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前没有进行中的背诵">
            <Button type="primary" onClick={() => navigate('/study')}>
              开始一轮背诵
            </Button>
          </Empty>
        ) : (
          <>
            <div className="metric-row">
              <Statistic title="本轮得分" value={state.score} suffix="分" />
              <Statistic
                title="首次答对"
                value={state.correctCount}
                suffix={`/ ${state.totalCount} 题`}
              />
              <Statistic title="错词" value={state.wrongCount} suffix="个" />
              <Statistic
                title="首次正确率"
                value={percentage(state.correctCount, state.totalCount)}
                suffix="%"
              />
            </div>
            <Progress
              className="study-progress"
              percent={studyProgress(state)}
              showInfo={false}
              strokeColor={{ from: '#2f8a5f', to: '#176b57' }}
            />
            <Space wrap size={12}>
              <Typography.Text type="secondary">
                {modeLabels[state.mode]} ·{' '}
                {state.finished
                  ? `已完成 ${state.totalCount} 题`
                  : `第 ${questionNumber(state)} / ${state.totalCount} 题`}
              </Typography.Text>
              <Button size="small" type="primary" onClick={() => navigate('/study')}>
                {state.finished ? '查看本轮结果' : '继续本轮'}
              </Button>
            </Space>
          </>
        )}
      </Card>

      {userPending ? (
        <Card>
          <Skeleton active paragraph={{ rows: 2 }} />
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
          title="登录后查看累计统计"
          description="登录后可以查看累计得分、完成轮次、首次正确率与每次背诵的历史记录。"
        />
      ) : (
        <>
          <Card
            className="surface-card"
            title={
              <Space size={8}>
                累计统计
                {stats.data ? (
                  <Tag bordered={false} color={stats.data.passed ? 'green' : 'default'}>
                    {stats.data.passed
                      ? '已达标'
                      : `过关线 ${Math.round(stats.data.passThreshold * 100)}%`}
                  </Tag>
                ) : null}
              </Space>
            }
            extra={<BarChartOutlined className="card-icon-muted" />}
          >
            {stats.isPending ? (
              <Skeleton active paragraph={{ rows: 2 }} />
            ) : stats.isError ? (
              <ErrorState
                title="累计统计加载失败"
                error={stats.error}
                onRetry={() => void stats.refetch()}
                retrying={stats.isFetching}
              />
            ) : stats.data ? (
              <div className="metric-row">
                <Statistic title="累计得分" value={stats.data.totalScore} suffix="分" />
                <Statistic
                  title="完成轮次"
                  value={stats.data.completedSessionCount}
                  suffix={`/ ${stats.data.sessionCount} 轮`}
                />
                <Statistic title="首次作答" value={stats.data.firstAttemptCount} suffix="次" />
                <Statistic
                  title="首次正确率"
                  value={percentage(stats.data.correctCount, stats.data.firstAttemptCount)}
                  suffix="%"
                />
              </div>
            ) : null}
          </Card>

          <Card
            className="surface-card"
            title="历史记录"
            extra={<Typography.Text type="secondary">最近 100 轮</Typography.Text>}
          >
            {history.isPending ? (
              <Skeleton active paragraph={{ rows: 4 }} />
            ) : history.isError ? (
              <ErrorState
                title="历史记录加载失败"
                error={history.error}
                onRetry={() => void history.refetch()}
                retrying={history.isFetching}
              />
            ) : (
              <Table<StudyHistoryEntry>
                rowKey="id"
                size="middle"
                dataSource={history.data?.items ?? []}
                columns={historyColumns}
                pagination={{ pageSize: 8, hideOnSinglePage: true, showSizeChanger: false }}
                scroll={{ x: 720 }}
                locale={{
                  emptyText: (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有完成过一轮背诵">
                      <Button type="primary" onClick={() => navigate('/study')}>
                        去背诵
                      </Button>
                    </Empty>
                  ),
                }}
              />
            )}
          </Card>
        </>
      )}
    </div>
  );
}
