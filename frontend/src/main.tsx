import React from 'react';
import ReactDOM from 'react-dom/client';
import { App as AntApp, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HashRouter } from 'react-router-dom';
import App from './App';
import 'antd/dist/reset.css';
import './styles.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false, staleTime: 15_000 },
  },
});

const brand = '#176b57';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: brand,
          colorInfo: brand,
          colorSuccess: '#2f8a5f',
          colorWarning: '#b7791f',
          colorError: '#c04a35',
          // antd 6 会从自定义状态色推导出偏暗的背景色，这里显式指定浅色背景与描边，
          // 保证 Alert 等组件在浅色界面上有足够的可读性。
          colorInfoBg: '#eaf3ef',
          colorInfoBorder: '#cfe3d8',
          colorSuccessBg: '#eaf5ee',
          colorSuccessBorder: '#c6e0d2',
          colorWarningBg: '#fdf4e4',
          colorWarningBorder: '#efd7a6',
          colorErrorBg: '#fbece8',
          colorErrorBorder: '#efccc3',
          colorTextBase: '#253b35',
          colorBgLayout: '#f6f8f5',
          colorTextSecondary: '#65786e',
          colorBorder: '#dfe9e3',
          colorBorderSecondary: '#ebf2ee',
          borderRadius: 10,
          borderRadiusLG: 18,
          controlHeight: 40,
          fontFamily: 'Inter, "Segoe UI", "Microsoft YaHei", system-ui, sans-serif',
        },
        components: {
          Layout: {
            headerBg: 'rgba(255, 255, 255, 0.88)',
            bodyBg: '#f6f8f5',
            siderBg: '#ffffff',
            footerBg: 'transparent',
            headerHeight: 64,
            headerPadding: '0 28px',
          },
          Menu: {
            itemHeight: 44,
            itemBorderRadius: 12,
            itemMarginBlock: 6,
            itemMarginInline: 12,
            itemBg: 'transparent',
            itemHoverBg: '#f2f8f4',
            itemSelectedBg: '#e8f2ed',
            itemSelectedColor: '#14624f',
            itemColor: '#3d5749',
            activeBarWidth: 0,
          },
          Card: {
            headerFontSize: 16,
            headerHeight: 52,
            paddingLG: 24,
          },
          Table: {
            headerBg: '#f6faf7',
            headerColor: '#3c5a4e',
            rowHoverBg: '#f7fbf9',
            borderColor: '#ebf2ee',
            headerSplitColor: 'transparent',
          },
          Button: {
            fontWeight: 500,
            primaryShadow: '0 6px 16px -8px rgba(23, 107, 87, 0.6)',
          },
          Segmented: {
            trackBg: '#eef4f0',
            itemSelectedBg: '#ffffff',
            itemSelectedColor: '#14624f',
          },
          Statistic: {
            contentFontSize: 26,
          },
          Alert: {
            defaultPadding: '12px 16px',
          },
        },
      }}
    >
      <AntApp>
        <QueryClientProvider client={queryClient}>
          <HashRouter>
            <App />
          </HashRouter>
        </QueryClientProvider>
      </AntApp>
    </ConfigProvider>
  </React.StrictMode>,
);
