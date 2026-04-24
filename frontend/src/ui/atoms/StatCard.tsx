import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: ReactNode;
  className?: string;
}

export function StatCard({ title, value, subtitle, icon, className = '' }: StatCardProps) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        {icon && <div className="text-slate-400">{icon}</div>}
      </div>
      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
      {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
    </div>
  );
}
