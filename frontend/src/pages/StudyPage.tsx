import { useEffect, useRef, useState } from 'react';
import type { InputRef } from 'antd';
import {
  Alert,
  App as AntApp,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Grid,
  Input,
  Progress,
  Radio,
  Result,
  Row,
  Segmented,
  Select,
  Space,
  Statistic,
  Tag,
  Typography,
} from 'antd';
import {
  ArrowRightOutlined,
  CheckCircleFilled,
  ReadOutlined,
  RedoOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, ApiError, type StudyMode, type StudyState } from '../lib/api';
import { useStudyState } from '../lib/queries';
import { modeHints, modeLabels, modePrompts, percentage, studyProgress } from '../lib/study';
import PageHeader from '../components/PageHeader';
import { ErrorState, PageSkeleton } from '../components/PageStates';

const MODE_OPTIONS: { label: string; value: StudyMode }[] = [
  { label: '拼写单词', value: 'spelling' },
  { label: '选择题', value: 'choice' },
  { label: '看英文输中文', value: 'meaning' },
];

export default function StudyPage({ review = false }: { review?: boolean }) {
  const navigate = useNavigate();
  const { message } = AntApp.useApp();
  const client = useQueryClient();
  const screens = Grid.useBreakpoint();
  const compactMode = screens.sm === false;
  const [searchParams] = useSearchParams();

  const [answer, setAnswer] = useState('');
  const [selectedBook, setSelectedBook] = useState<number>();
  const [mode, setMode] = useState<StudyMode>('spelling');
  const [setupOpen, setSetupOpen] = useState(false);
  const inputRef = useRef<InputRef>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  const books = useQuery({ queryKey: ['wordbooks'], queryFn: api.wordbooks });
  const study = useStudyState();
  const state = study.state;

  const value = Number(searchParams.get('wordbookId'));
  const urlBookId = Number.isSafeInteger(value) && value > 0 ? value : undefined;
  const bookId = selectedBook ?? urlBookId ?? books.data?.items[0]?.id;
  const activeBookId = state?.wordbookId ?? bookId;

  const mutation = useMutation({
    mutationFn: (action: () => Promise<StudyState>) => action(),
    onMutate: () => client.cancelQueries({ queryKey: ['study'] }),
    onSuccess: (data) => {
      client.setQueryData(['study'], data);
      if (!data.result) {
        // 进入下一题或新一轮时清空输入；保留答案是为了让用户看到自己刚选/刚写的答案。
        setAnswer('');
      }
      void client.invalidateQueries({ queryKey: ['statistics'] });
      void client.invalidateQueries({ queryKey: ['history'] });
    },
    onError: (error: Error) => {
      if (error instanceof ApiError && error.status === 404) {
        void client.resetQueries({ queryKey: ['study'] });
        setAnswer('');
      }
      message.error(error.message);
    },
  });
  const pending = mutation.isPending;
  const studyError = study.error && !study.noSession ? study.error : null;

  useEffect(() => {
    if (pending || review || !state || state.finished) return;
    if (state.canAdvance) nextRef.current?.focus({ preventScroll: true });
    else inputRef.current?.focus({ preventScroll: true });
  }, [
    pending,
    review,
    state?.currentIndex,
    state?.question?.wordId,
    state?.canAdvance,
    state?.finished,
  ]);

  useEffect(() => {
    if (urlBookId && state?.finished && urlBookId !== state.wordbookId) setSetupOpen(true);
  }, [urlBookId, state?.finished, state?.wordbookId]);

  const canAnswer = state !== undefined && !state.finished && !state.canAdvance && !pending;
  const isLastQuestion = state !== undefined && state.currentIndex + 1 >= state.totalCount;

  function submitAnswer(raw: string) {
    if (!state || state.finished || state.canAdvance || pending) return;
    const trimmed = raw.trim();
    if (!trimmed) {
      message.warning('请先输入答案');
      return;
    }
    mutation.mutate(() => api.answer(trimmed));
  }

  function startRound(book: number | undefined, nextMode: StudyMode = mode) {
    if (book === undefined) {
      message.warning('请先选择词库');
      return;
    }
    mutation.mutate(() => api.start(book, nextMode), { onSuccess: () => setSetupOpen(false) });
  }

  function startReview() {
    mutation.mutate(api.review, {
      onSuccess: () => {
        setSetupOpen(false);
        navigate('/study');
      },
    });
  }

  const header = (
    <PageHeader
      title={review ? '错题复习' : '开始背诵'}
      description={
        review
          ? '完成一轮后，把本轮答错的单词再认真练习一遍。'
          : '看中文选英文、看中文拼写，或看英文写中文，三种方式随时切换。'
      }
    />
  );

  if (review) {
    return (
      <div className="page-stack">
        {header}
        {study.isPending ? <PageSkeleton rows={4} /> : null}
        {studyError ? (
          <ErrorState
            title="复习状态加载失败"
            error={studyError}
            onRetry={() => void study.refetch()}
            retrying={study.isFetching}
          />
        ) : null}

        {!study.isPending && !studyError && study.noSession ? (
          <Card className="state-card">
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有本轮错题可以复习">
              <Button type="primary" icon={<ReadOutlined />} onClick={() => navigate('/study')}>
                去完成一轮背诵
              </Button>
            </Empty>
          </Card>
        ) : null}

        {study.noSession || studyError ? null : state && !state.finished ? (
          <Card
            className="review-hub"
            title="本轮还在进行中"
            extra={
              <Tag bordered={false} color="gold">
                进行中
              </Tag>
            }
          >
            <Typography.Paragraph type="secondary">
              当前还有一轮背诵没有完成（第 {state.currentIndex + 1} / {state.totalCount} 题）。
              先答完这一轮，才能针对本轮错词开启复习。
            </Typography.Paragraph>
            <Progress
              className="study-progress"
              percent={studyProgress(state)}
              showInfo={false}
              strokeColor={{ from: '#2f8a5f', to: '#176b57' }}
            />
            <Button type="primary" onClick={() => navigate('/study')}>
              继续当前这一轮
            </Button>
          </Card>
        ) : null}

        {state?.finished ? (
          <Card className="state-card">
            <Result
              icon={<RedoOutlined className="result-mark" />}
              title={state.wrongCount > 0 ? `本轮有 ${state.wrongCount} 个错词` : '本轮没有错词'}
              subTitle={
                state.wrongCount > 0
                  ? '错题复习会用拼写模式重新练习这些单词，答对后即完成复习。'
                  : '这一轮全部首次答对，可以换一本词库继续挑战。'
              }
              extra={
                <Space wrap>
                  {state.wrongCount > 0 ? (
                    <Button type="primary" loading={pending} onClick={startReview}>
                      开始错题复习
                    </Button>
                  ) : null}
                  <Button onClick={() => navigate('/study')}>再来一轮</Button>
                  <Button type="text" onClick={() => navigate('/statistics')}>
                    查看本轮统计
                  </Button>
                </Space>
              }
            />
          </Card>
        ) : null}
      </div>
    );
  }

  const showSetup = !study.isPending && !studyError && (!state || (state.finished && setupOpen));
  const selectedBookData = books.data?.items.find((book) => book.id === bookId);
  const selectionError =
    selectedBookData?.wordCount === 0
      ? '这本词库还没有单词，请先添加或导入单词。'
      : mode === 'choice' && selectedBookData && selectedBookData.wordCount < 2
        ? '选择题至少需要两个不同的单词，请切换模式或补充词库。'
        : undefined;

  return (
    <div className="page-stack">
      {header}

      {study.isPending ? <PageSkeleton rows={5} /> : null}
      {studyError ? (
        <ErrorState
          title="背诵状态加载失败"
          error={studyError}
          onRetry={() => void study.refetch()}
          retrying={study.isFetching}
        />
      ) : null}
      {books.isError ? (
        <ErrorState
          title="词库加载失败"
          error={books.error}
          onRetry={() => void books.refetch()}
          retrying={books.isFetching}
        />
      ) : null}

      {state && !state.finished && urlBookId && urlBookId !== state.wordbookId ? (
        <Alert
          type="info"
          showIcon
          title="当前还有一轮背诵正在进行"
          description="先完成当前这一轮，再选择新的词库开始练习。"
        />
      ) : null}

      {showSetup ? (
        <Card className="setup-card" title={state?.finished ? '换一组继续' : '选择词库与方式'}>
          {books.isSuccess && books.data.items.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有可用的词库">
              <Button type="primary" onClick={() => navigate('/wordbooks')}>
                去创建词库
              </Button>
            </Empty>
          ) : (
            <Form layout="vertical" onFinish={() => startRound(bookId)}>
              <Row gutter={[16, 0]}>
                <Col xs={24} md={10}>
                  <Form.Item label="词库">
                    <Select
                      aria-label="选择词库"
                      value={bookId}
                      loading={books.isPending}
                      placeholder={books.isPending ? '正在加载词库' : '请选择词库'}
                      disabled={pending || books.isError}
                      onChange={setSelectedBook}
                      options={books.data?.items.map((book) => ({
                        value: book.id,
                        label: `${book.name}（${book.wordCount} 词）`,
                      }))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={14}>
                  <Form.Item label="背诵方式">
                    <Segmented
                      block
                      vertical={compactMode}
                      value={mode}
                      disabled={pending}
                      onChange={(next) => setMode(next as StudyMode)}
                      options={MODE_OPTIONS}
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Typography.Paragraph type="secondary" className="setup-hint">
                {modeHints[mode]}
              </Typography.Paragraph>
              {selectionError ? (
                <Alert
                  className="setup-warning"
                  type="warning"
                  showIcon
                  title={selectionError}
                  action={
                    selectedBookData?.wordCount === 0 ? (
                      <Button size="small" onClick={() => navigate('/wordbooks')}>
                        管理词库
                      </Button>
                    ) : undefined
                  }
                />
              ) : null}
              <Space wrap>
                <Button
                  type="primary"
                  size="large"
                  htmlType="submit"
                  loading={pending}
                  disabled={
                    !selectedBookData || Boolean(selectionError) || books.isError || books.isPending
                  }
                >
                  开始背诵
                </Button>
                {state?.finished ? (
                  <Button size="large" onClick={() => setSetupOpen(false)}>
                    返回本轮成绩
                  </Button>
                ) : null}
              </Space>
            </Form>
          )}
        </Card>
      ) : null}

      {state?.finished && !setupOpen ? (
        <Card className="state-card">
          <Result
            icon={<TrophyOutlined className="result-mark" />}
            title={
              state.passed === false
                ? '本轮完成，正确率还没到过关线'
                : state.wrongCount > 0
                  ? '本轮完成，再巩固一下错词'
                  : '本轮全部答对，继续保持'
            }
            subTitle={`首次答对 ${state.correctCount} / ${state.totalCount} 题，首次正确率 ${percentage(
              state.correctCount,
              state.totalCount,
            )}%。${
              state.passed === false
                ? ` 达到 ${Math.round((state.passThreshold ?? 0.8) * 100)}% 即为过关。`
                : ''
            }`}
            extra={
              <div className="result-stats">
                <Statistic title="本轮得分" value={state.score} suffix="分" />
                <Statistic title="首次答对" value={state.correctCount} suffix="题" />
                <Statistic title="错词" value={state.wrongCount} suffix="个" />
                <Statistic
                  title="首次正确率"
                  value={percentage(state.correctCount, state.totalCount)}
                  suffix="%"
                />
              </div>
            }
          />
          <div className="result-actions">
            {state.wrongCount > 0 ? (
              <Button type="primary" loading={pending} onClick={startReview}>
                错题重背（拼写模式）
              </Button>
            ) : null}
            <Button
              loading={pending}
              onClick={() => startRound(activeBookId, state.mode)}
              type={state.wrongCount > 0 ? 'default' : 'primary'}
            >
              再来一轮
            </Button>
            <Button onClick={() => setSetupOpen(true)}>更换词库与方式</Button>
            <Button type="text" onClick={() => navigate('/statistics')}>
              查看统计
            </Button>
          </div>
        </Card>
      ) : null}

      {state && !state.finished ? (
        <Card
          className="study-card"
          title={
            <Space size={8} wrap>
              <Tag bordered={false} color="green">
                {modeLabels[state.mode]}
              </Tag>
              <Typography.Text type="secondary" className="study-counter">
                第 {state.currentIndex + 1} / {state.totalCount} 题
              </Typography.Text>
            </Space>
          }
          extra={
            <Space size={16}>
              <Typography.Text type="secondary">得分</Typography.Text>
              <Typography.Text strong className="study-score">
                {state.score}
              </Typography.Text>
            </Space>
          }
        >
          <Progress
            className="study-progress"
            percent={studyProgress(state)}
            showInfo={false}
            strokeColor={{ from: '#2f8a5f', to: '#176b57' }}
          />
          <Typography.Text type="secondary" className="study-prompt">
            {modePrompts[state.mode]}
          </Typography.Text>
          <div className="study-question">
            {state.mode === 'meaning'
              ? state.question?.english
              : state.question?.meanings.join('；')}
            {state.question?.partOfSpeech ? (
              <Tag bordered={false} className="pos-tag pos-inline">
                {state.question.partOfSpeech}
              </Tag>
            ) : null}
          </div>

          <Form
            onFinish={() => (state.canAdvance ? mutation.mutate(api.next) : submitAnswer(answer))}
            className="study-form"
          >
            <Form.Item>
              {state.mode === 'choice' ? (
                <Radio.Group
                  value={answer}
                  onChange={(event) => {
                    const next = event.target.value as string;
                    setAnswer(next);
                    if (canAnswer) mutation.mutate(() => api.answer(next));
                  }}
                  disabled={pending || state.canAdvance}
                  className="choice-options"
                  aria-label="英文选项"
                  options={state.question?.choices.map((option, index) => ({
                    label: (
                      <span className="choice-label">
                        <span className="choice-letter">{String.fromCharCode(65 + index)}</span>
                        <span>{option}</span>
                      </span>
                    ),
                    value: option,
                    className:
                      answer === option && state.result
                        ? state.result.correct
                          ? 'choice-correct'
                          : 'choice-incorrect'
                        : undefined,
                  }))}
                />
              ) : (
                <Input
                  ref={inputRef}
                  aria-label={state.mode === 'meaning' ? '中文答案' : '英文答案'}
                  size="large"
                  placeholder={state.mode === 'meaning' ? '输入中文释义' : '输入英文单词'}
                  autoComplete="off"
                  spellCheck={false}
                  autoCapitalize="none"
                  autoCorrect="off"
                  maxLength={500}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && event.nativeEvent.isComposing)
                      event.preventDefault();
                  }}
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  disabled={pending || state.canAdvance}
                />
              )}
            </Form.Item>

            {state.result ? (
              <Alert
                className="answer-feedback"
                role="status"
                aria-live="polite"
                showIcon
                type={state.result.correct ? 'success' : 'warning'}
                title={state.result.message}
                description={
                  <>
                    {state.result.firstAttempt ? '首次作答' : '再次作答'} ·{' '}
                    {state.result.scoreDelta === 0
                      ? '本题不再计分'
                      : `${state.result.scoreDelta > 0 ? '+' : ''}${state.result.scoreDelta} 分`}
                  </>
                }
              />
            ) : null}

            <div className="study-actions">
              {state.canAdvance ? (
                <Button
                  ref={nextRef}
                  type="primary"
                  size="large"
                  icon={isLastQuestion ? <CheckCircleFilled /> : <ArrowRightOutlined />}
                  iconPosition="end"
                  loading={pending}
                  onClick={() => mutation.mutate(api.next)}
                >
                  {isLastQuestion ? '完成本轮' : '下一题'}
                </Button>
              ) : state.mode === 'choice' ? null : (
                <Button
                  type="primary"
                  size="large"
                  htmlType="submit"
                  loading={pending}
                  disabled={!answer.trim()}
                >
                  提交答案
                </Button>
              )}
              <Typography.Text type="secondary" className="study-tip">
                {state.canAdvance
                  ? '答对了，继续下一题。'
                  : state.mode === 'choice'
                    ? '选择后会自动判题。'
                    : '按 Enter 也可以提交。'}
              </Typography.Text>
            </div>
          </Form>
        </Card>
      ) : null}

      <Typography.Text type="secondary" className="page-footnote">
        首次答对 +10 分，答错 −10 分；重试不重复计分。登录后自动保存成绩与错词。
      </Typography.Text>
    </div>
  );
}
