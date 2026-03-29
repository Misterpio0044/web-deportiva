import './Badge.css';

interface BadgeProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'success' | 'warning';
}

export function Badge({ label, variant = 'primary' }: BadgeProps) {
  return <span className={`badge badge--${variant}`}>{label}</span>;
}
