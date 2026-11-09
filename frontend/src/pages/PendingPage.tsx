import { Alert, Card, Space, Tag, Typography } from 'antd';

const content = {
  account: {
    title: '账号与打卡',
    description: '此模块已预留页面和数据库结构，接下来由负责账号的同学完成。',
    tasks: [
      '注册、登录、退出与用户数据隔离',
      '使用成熟密码哈希方案保存密码验证信息',
      '登录后直接打卡退出、退出时打卡',
      '同一天只记一次，统计累计背诵天数',
    ],
  },
  statistics: {
    title: '学习统计',
    description: '本轮成绩已在背诵页面显示，历史统计需要接入真实用户和持久化作答记录。',
    tasks: [
      '保存每轮背诵成绩与作答明细',
      '按用户查询累计成绩和首次正确率',
      '实现约定的过关标准',
      '选做：单词出现次数、正确率与提醒',
    ],
  },
};

export default function PendingPage({ kind }: { kind: keyof typeof content }) {
  const page = content[kind];
  return (
    <Space orientation="vertical" size={20} className="full-width">
      <div>
        <Typography.Title level={2}>{page.title}</Typography.Title>
        <Tag color="gold">待开发</Tag>
      </div>
      <Alert type="info" showIcon title={page.description} />
      <Card title="接下来的开发任务">
        <ul className="task-list">
          {page.tasks.map((task) => (
            <li key={task}>{task}</li>
          ))}
        </ul>
        <Typography.Text type="secondary">
          分工、接口约定和验收清单见仓库 docs 目录。
        </Typography.Text>
      </Card>
    </Space>
  );
}
