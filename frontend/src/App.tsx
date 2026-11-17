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
    document.title = `${pageTitle} · EnglishWord`;
  }, [location.pathname, pageTitle]);

  const menuItems = useMemo(
    () =>
      NAV_ITEMS.map((item) => ({
        key: item.key,
        icon: item.icon,
        label: (
          <Link
            to={item.key}
            aria-current={item.key === location.pathname ? 'page' : undefined}
            onClick={() => setNavOpen(false)}
          >
            {item.label}
          </Link>
        ),
      })),
    [location.pathname],
  );

  const userMenu = {
    items: [
      { key: 'account', icon: <IdcardOutlined />, label: '账号与打卡' },
      { type: 'divider' as const },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: '退出登录',
        danger: true,
        disabled: logout.isPending,
      },
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

  const sidebarFoot = (
    <div className="sidebar-foot">
      <div className="sidebar-reminder">
        <ReadOutlined aria-hidden="true" />
        <strong>一点积累，也有回响。</strong>
        <p>{user ? '把今天学到的，变成明天记得的。' : '登录后，留住每一次学习的进步。'}</p>
        <Link to={user ? '/account' : '/login'} onClick={() => setNavOpen(false)}>
          {user ? '记录今天的坚持 →' : '开启我的学习记录 →'}
        </Link>
      </div>
      <span className="sidebar-caption">A LITTLE, EVERY DAY.</span>
    </div>
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
        <div className="sidebar-label">我的学习空间</div>
        <nav aria-label="主导航">
          <Menu className="app-nav" mode="inline" selectedKeys={[selectedKey]} items={menuItems} />
        </nav>
        {sidebarFoot}
      </Layout.Sider>

      <Drawer
        className="nav-drawer"
        placement="left"
        title="学习导航"
        width={272}
        open={navOpen}
        onClose={() => setNavOpen(false)}
        closable
        styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column' } }}
      >
        {brand}
        <nav aria-label="移动端导航">
          <Menu className="app-nav" mode="inline" selectedKeys={[selectedKey]} items={menuItems} />
        </nav>
        {sidebarFoot}
      </Drawer>

      <Layout className="app-main">
        <Layout.Header className="app-header">
          <div className="app-header-left">
            {compact ? (
              <Button
                type="text"
                className="nav-toggle"
                aria-label="打开导航菜单"
                aria-expanded={navOpen}
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
                <span className="guest-tag">
                  <UserOutlined /> 访客体验
                </span>
                <Button
                  type="primary"
                  icon={<LoginOutlined />}
                  onClick={() =>
                    navigate('/login', { state: { from: location.pathname + location.search } })
                  }
                >
                  登录 / 注册
                </Button>
              </>
            )}
          </div>
        </Layout.Header>

        <Layout.Content className="app-content" id="main" role="main" tabIndex={-1}>
          <ErrorBoundary key={location.pathname}>
            <Suspense fallback={<PageSkeleton />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/wordbooks" element={<WordbooksPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/study" element={<StudyPage key="study" />} />
                <Route path="/review" element={<StudyPage key="review" review />} />
                <Route path="/statistics" element={<StatisticPage />} />
                <Route path="/account" element={<AccountPage />} />
                <Route path="/404" element={<NotFoundPage />} />
                <Route path="*" element={<Navigate to="/404" replace />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </Layout.Content>

        <Layout.Footer className="app-footer">
          <span>EnglishWord</span>
          <span>每天记住一点，让进步看得见。</span>
        </Layout.Footer>
      </Layout>
    </Layout>
  );
}
