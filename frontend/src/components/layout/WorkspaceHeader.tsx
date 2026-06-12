import { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

interface WorkspaceHeaderProps {
  title: string;
  subtitle: string;
  badge: string;
  action?: ReactNode;
}

export function WorkspaceHeader({ title, subtitle, badge, action }: WorkspaceHeaderProps) {
  return (
    <div className="h-14 border-b border-border bg-card/30 flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground font-medium">{title}</span>
          <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
          <span className="text-foreground font-semibold">{subtitle}</span>
        </div>
        <div className="px-2 py-0.5 rounded-sm bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold tracking-widest uppercase">
          {badge}
        </div>
      </div>
      
      {action && (
        <div className="flex items-center gap-3">
          {action}
        </div>
      )}
    </div>
  );
}
