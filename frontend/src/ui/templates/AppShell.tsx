import { ReactNode } from 'react';
import { Navbar } from '../organisms/Navbar';

interface Props {
  children: ReactNode;
}

export function AppShell({ children }: Props) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
