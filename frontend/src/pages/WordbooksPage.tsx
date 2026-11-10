import { useState } from 'react';
import { Alert, Button, Card, Select, Space, Table, Tag, Typography, Input } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, type Word } from '../lib/api';

export default function WordbooksPage() {
  const [selected, setSelected] = useState<number>();
  const books = useQuery({ queryKey: ['wordbooks'], queryFn: api.wordbooks });
  const bookId = selected ?? books.data?.items[0]?.id;
  const words = useQuery({
    queryKey: ['words', bookId],
    queryFn: () => api.words(bookId!),
    enabled: bookId !== undefined,
  });
  const [keyword, setKeyword] = useState('');
  const query = keyword.trim().toLowerCase();
  const filteredWords = (words.data?.items ?? []).filter(
    (word) => 
    {
      const matchesEnglish = word.english.toLowerCase().includes(query);
      const matchesChinese = word.meanings.some((meaning) =>
        meaning.includes(query)
      );

      return matchesEnglish || matchesChinese
    }
  )
  const canStart = (bookId !== undefined && words.isSuccess && words.data.items.length > 0)
  return (
    <Space orientation="vertical" size={20} className="full-width">
      <div>
        <Typography.Title level={2}>我的词库</Typography.Title>
        <Typography.Text type="secondary">先认识单词，再开始今天的练习。</Typography.Text>
      </div>
      <Alert
        type="info"
        showIcon
        title="当前展示公共示例词库"
        description="私人词库、文件导入、增删改和补充释义的开发任务见 docs/PLAN.md。"
      />
      {(books.isError || words.isError) && (
        <Alert
          type="error"
          showIcon
          title="词库加载失败"
          description={(books.error ?? words.error)?.message}
        />
      )}
      <Card>
        <Space wrap className="toolbar">
          <Select
            aria-label="选择词库"
            style={{ minWidth: 220 }}
            value={bookId}
            loading={books.isPending}
            onChange={(value) => {
              setSelected(value);
              setKeyword('');
            }}
            options={books.data?.items.map((book) => ({
              value: book.id,
              label: `${book.name}（${book.wordCount} 词）`,
            }))}
          />
          {canStart ?(
            <Link to={`/study?wordbookId=${bookId}`}>
              <Button type='primary'>开始背诵</Button>
            </Link>
          ) : (
            <Button type='primary' disabled>
              开始背诵
            </Button>
          )}
          <Tag>只读示例</Tag>

        </Space>
        <Input 
          aria-label = "搜索单词"
          placeholder='搜索英文或中文释义'
          allowClear
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          style={{ marginBottom:16 }}
        />
        {words.isSuccess && (
          <Typography.Paragraph type='secondary'>
            共 {words.data.items.length} 个单词，
            匹配 { filteredWords.length} 个
          </Typography.Paragraph>
        )}
        <Table<Word>
          rowKey="id"
          loading={words.isFetching}
          dataSource={filteredWords}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 560 }}
          columns={[
            {
              title: '英文单词',
              dataIndex: 'english',
              render: (value: string) => <strong className="word-english">{value}</strong>,
            },
            { title: '词性', dataIndex: 'partOfSpeech', width: 100 },
            {
              title: '中文释义',
              dataIndex: 'meanings',
              render: (values: string[]) => values.join('；'),
            },
          ]}
        />
      </Card>
    </Space>
  );
}
