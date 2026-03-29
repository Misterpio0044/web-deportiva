import type { ReactNode } from 'react';
import './DashboardTemplate.css';

interface DashboardTemplateProps {
  header: ReactNode;
  content: ReactNode;
}

export function DashboardTemplate({ header, content }: DashboardTemplateProps) {
  return (
    <div className="dashboard-template">
      <header className="dashboard-template__header">{header}</header>
      <main className="dashboard-template__content">{content}</main>
    </div>
  );
}
