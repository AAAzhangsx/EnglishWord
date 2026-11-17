import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import {
  App as AntApp,
  Avatar,
  Button,
  Drawer,
  Dropdown,
  Grid,
  Layout,
  Menu,
  Tag,
  Typography,
} from 'antd';
import {
  BarChartOutlined,
  BookOutlined,
  DownOutlined,
  HomeOutlined,
  IdcardOutlined,
  LoginOutlined,
  LogoutOutlined,
  MenuOutlined,
  ReadOutlined,
  RedoOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { api } from './lib/api';
import { useCurrentUser } from './lib/queries';
import ErrorBoundary from './components/ErrorBoundary';
import { PageSkeleton } from './components/PageStates';

const HomePage = lazy(() => import('./pages/HomePage'));
const WordbooksPage = lazy(() => import('./pages/WordbooksPage'));
const StudyPage = lazy(() => import('./pages/StudyPage'));
const StatisticPage = lazy(() => import('./pages/StatisticPage'));
const AccountPage = lazy(() => import('./pages/AccountPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

const NAV_ITEMS = [
  { key: '/', icon: <HomeOutlined />, label: '学习概览' },
  { key: '/wordbooks', icon: <BookOutlined />, label: '我的词库' },
  { key: '/study', icon: <ReadOutlined />, label: '开始背诵' },
  { key: '/review', icon: <RedoOutlined />, label: '错题复习' },
  { key: '/statistics', icon: <BarChartOutlined />, label: '学习统计' },
  { key: '/account', icon: <TeamOutlined />, label: '账号与打卡' },
];

/** 不在导航里的页面也需要一个像样的页头标题。 */
const EXTRA_TITLES: Record<string, string> = {
  '/login': '登录 / 注册',
  '/404': '页面不存在',
};

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const screens = Grid.useBreakpoint();
  const { message } = AntApp.useApp();
  const [navOpen, setNavOpen] = useState(false);
  const { data: user, isPending: userPending } = useCurrentUser();

  const compact = screens.lg === false;
  const current = NAV_ITEMS.find((item) => item.key === location.pathname);
  const selectedKey = current?.key ?? location.pathname;
  const pageTitle = current?.label ?? EXTRA_TITLES[location.pathname] ?? '页面';

  const logout = useMutation({
    mutationFn: () => api.logout(),
    onSuccess: () => {
      message.success('已退出登录');
      // 清空缓存，避免退出后仍显示上一个账号的成绩与打卡。
      queryClient.clear();
      navigate('/');
    },
    onError: (error: Error) => message.error(error.message),
  });

  // 切换页面时回到顶部，移动端也关闭抽屉导航。
  useEffect(() => {
    window.scrollTo(0, 0);
    setNavOpen(false);
  }, [location.pathname]);

  const menuItems = useMemo(
    () =>
      NAV_ITEMS.map((item) => ({
        key: item.key,
        icon: item.icon,
        label: (
          <Link to={item.key} onClick={() => setNavOpen(false)}>
            {item.label}
          </Link>
        ),
      })),
    [],
  );

  const userMenu = {
    items: [
      { key: 'account', icon: <IdcardOutlined />, label: '账号与打卡' },
      { type: 'divider' as const },
      { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true },
    ],
    onClick: ({ key }: { key: string }) => {
      if (key === 'account') navigate('/account');
      if (key === 'logout') logout.mutate();
    },
  };

  const brand = (
    <Link to="/" className="brand" onClick={() => setNavOpen(false)}>
      <span className="brand-mark" aria-hidden="true">
        E
      </span>
      <span className="brand-text">
        EnglishWord
        <small>每天记住一点</small>
      </span>
    </Link>
  );

  return (
    <Layout className="app-layout">
      <a
        className="skip-link"
        href="#main"
        onClick={(event) => {
          // HashRouter 下不能真正跳转 hash，否则会被当成路由；这里只移动焦点。
          event.preventDefault();
          document.getElementById('main')?.focus();
        }}
      >
        跳到主要内容
      </a>
      <Layout.Sider
        className="app-sider"
        width={236}
        breakpoint="lg"
        collapsedWidth={0}
        trigger={null}
        theme="light"
      >
        {brand}
        <Menu className="app-nav" mode="inline" selectedKeys={[selectedKey]} items={menuItems} />
        <div className="sidebar-foot">
          <Tag bordered={false} color="green">
            课程项目 v0.1
          </Tag>
          <p>登录后自动保存成绩、错题与打卡记录。</p>
        </div>
      </Layout.Sider>

      <Drawer
        className="nav-drawer"
        placement="left"
        width={272}
        open={navOpen}
        onClose={() => setNavOpen(false)}
        closable={false}
        styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column' } }}
      >
        {brand}
        <Menu mode="inline" selectedKeys={[selectedKey]} items={menuItems} />
        <div className="sidebar-foot">
          <Tag bordered={false} color="green">
            课程项目 v0.1
          </Tag>
          <p>登录后自动保存成绩、错题与打卡记录。</p>
        </div>
      </Drawer>

      <Layout className="app-main">
        <Layout.Header className="app-header">
          <div className="app-header-left">
            {compact ? (
              <Button
                type="text"
                className="nav-toggle"
                aria-label="打开导航菜单"
                icon={<MenuOutlined />}
                onClick={() => setNavOpen(true)}
              />
            ) : null}
            <div className="app-header-title">
              <Typography.Text className="app-header-eyebrow"> EnglishWord </Typography.Text>
              <Typography.Text strong className="app-header-page">
                {pageTitle}
              </Typography.Text>
            </div>
          </div>
          <div className="app-header-actions">
            {userPending ? (
              <span className="header-placeholder" aria-hidden="true" />
            ) : user ? (
              <Dropdown trigger={['click']} menu={userMenu} placement="bottomRight">
                <button type="button" className="user-chip" aria-label="账号菜单">
                  <Avatar size={28} className="user-chip-avatar">
                    {user.username.slice(0, 1).toUpperCase()}
                  </Avatar>
                  <span className="user-chip-name">{user.username}</span>
                  <DownOutlined className="user-chip-caret" />
                </button>
              </Dropdown>
            ) : (
              <>
                <Tag bordered={false} icon={<UserOutlined />} className="guest-tag">
                  访客
                </Tag>
                <Button
                  type="primary"
                  size="small"
                  icon={<LoginOutlined />}
                  onClick={() => navigate('/login')}
                >
                  登录 / 注册
                </Button>
              </>
            )}
          </div>
        </Layout.Header>

        <Layout.Content className="app-content" id="main">
          <ErrorBoundary key={location.pathname}>
            <Suspense fallback={<PageSkeleton />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/wordbooks" element={<WordbooksPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/study" element={<StudyPage />} />
                <Route path="/review" element={<StudyPage review />} />
                <Route path="/statistics" element={<StatisticPage />} />
                <Route path="/account" element={<AccountPage />} />
                <Route path="/404" element={<NotFoundPage />} />
                <Route path="*" element={<Navigate to="/404" replace />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </Layout.Content>

        <Layout.Footer className="app-footer">
          EnglishWord · 课程项目 · 数据保存在本地 SQLite
        </Layout.Footer>
      </Layout>
    </Layout>
  );
}
