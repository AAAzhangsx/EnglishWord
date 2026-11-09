import { lazy, Suspense } from 'react';
import { Layout, Menu, Spin, Tag, Typography } from 'antd';
import {
  BookOutlined,
  HomeOutlined,
  ReadOutlined,
  RedoOutlined,
  TeamOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';

const HomePage = lazy(() => import('./pages/HomePage'));
const WordbooksPage = lazy(() => import('./pages/WordbooksPage'));
const StudyPage = lazy(() => import('./pages/StudyPage'));
const PendingPage = lazy(() => import('./pages/PendingPage'));

const items = [
  { key: '/', icon: <HomeOutlined />, label: <Link to="/">学习概览</Link> },
  { key: '/wordbooks', icon: <BookOutlined />, label: <Link to="/wordbooks">我的词库</Link> },
  { key: '/study', icon: <ReadOutlined />, label: <Link to="/study">开始背诵</Link> },
  { key: '/review', icon: <RedoOutlined />, label: <Link to="/review">错题复习</Link> },
  { key: '/statistics', icon: <BarChartOutlined />, label: <Link to="/statistics">学习统计</Link> },
  { key: '/account', icon: <TeamOutlined />, label: <Link to="/account">账号与打卡</Link> },
];

export default function App() {
  const location = useLocation();
  return (
    <Layout className="app-layout">
      <Layout.Sider width={232} breakpoint="lg" collapsedWidth={0} theme="light">
        <Link to="/" className="brand">
          <span className="brand-mark">E</span>
          <span>
            EnglishWord<small>每天记住一点</small>
          </span>
        </Link>
        <Menu mode="inline" selectedKeys={[location.pathname]} items={items} />
        <div className="sidebar-note">
          <Tag color="green">项目骨架 v0.1</Tag>
          <p>
            先跑通一轮学习，
            <br />
            再一起完善每一个模块。
          </p>
        </div>
      </Layout.Sider>
      <Layout>
        <Layout.Header className="app-header">
          <Typography.Text>个性化背单词</Typography.Text>
          <Tag>访客演示 · 不保存学习成绩</Tag>
        </Layout.Header>
        <Layout.Content className="app-content">
          <Suspense
            fallback={
              <Spin tip="正在加载页面">
                <div style={{ minHeight: 200 }} />
              </Spin>
            }
          >
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/wordbooks" element={<WordbooksPage />} />
              <Route path="/study" element={<StudyPage />} />
              <Route path="/review" element={<StudyPage review />} />
              <Route path="/statistics" element={<PendingPage kind="statistics" />} />
              <Route path="/account" element={<PendingPage kind="account" />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </Layout.Content>
      </Layout>
    </Layout>
  );
}
