import type { ReactNode } from 'react';
import { Typography } from 'antd';

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** 标题右侧的标签，例如“进行中”“待开发”。 */
  tag?: ReactNode;
  /** 右上角操作区，窄屏会自动换行到标题下方。 */
  extra?: ReactNode;
}

/** 页面统一的标题区：标题 + 说明 + 操作，保证各页面视觉节奏一致。 */
export default function PageHeader({ title, description, tag, extra }: PageHeaderProps) {
  return (
    <div className="page-header">
      <div className="page-header-text">
        <div className="page-header-title">
          <Typography.Title level={2}>{title}</Typography.Title>
          {tag}
        </div>
        {description ? (
          <Typography.Paragraph type="secondary">{description}</Typography.Paragraph>
        ) : null}
      </div>
      {extra ? <div className="page-header-extra">{extra}</div> : null}
    </div>
  );
}
