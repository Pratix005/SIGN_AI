
interface StatusBadgeProps {
  label: string;
  status: 'active' | 'inactive' | 'error' | 'warning';
  pulse?: boolean;
}

export function StatusBadge({ label, status, pulse = true }: StatusBadgeProps) {
  const statusConfig = {
    active: { bg: 'bg-green-500', text: 'text-green-500', border: 'border-green-500/20' },
    inactive: { bg: 'bg-muted-foreground', text: 'text-muted-foreground', border: 'border-white/10' },
    error: { bg: 'bg-destructive', text: 'text-destructive', border: 'border-destructive/20' },
    warning: { bg: 'bg-chart-4', text: 'text-chart-4', border: 'border-chart-4/20' }
  };

  const config = statusConfig[status];

  return (
    <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full border bg-card/50 backdrop-blur-sm ${config.border}`}>
      <div className="relative flex h-2 w-2">
        {pulse && status === 'active' && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${config.bg}`}></span>
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${config.bg}`}></span>
      </div>
      <span className={`text-[10px] font-semibold tracking-wider uppercase ${config.text}`}>
        {label}
      </span>
    </div>
  );
}
