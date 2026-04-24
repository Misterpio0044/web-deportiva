interface LoadingSkeletonProps {
  className?: string;
}

export function LoadingSkeleton({ className = 'h-48' }: LoadingSkeletonProps) {
  return (
    <div className={`animate-pulse rounded-xl bg-slate-100 ${className}`} />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <LoadingSkeleton className="h-24" />
        <LoadingSkeleton className="h-24" />
        <LoadingSkeleton className="h-24" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <LoadingSkeleton className="h-72" />
        <LoadingSkeleton className="h-72" />
        <LoadingSkeleton className="h-72" />
        <LoadingSkeleton className="h-72" />
      </div>
      <LoadingSkeleton className="h-64" />
    </div>
  );
}
