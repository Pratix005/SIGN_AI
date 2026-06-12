import { Activity, Brain, Server, Zap } from "lucide-react";
import { StatusBadge } from "@/components/workspace/StatusBadge";
import { WorkspaceHeader } from "@/components/layout/WorkspaceHeader";

export default function Dashboard() {
  return (
    <div className="min-h-[100dvh] pt-16 flex flex-col bg-background">
      <WorkspaceHeader 
        title="SIGN_AI"
        subtitle="System Overview"
        badge="Live"
      />
      
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Active Connections", value: "24", icon: Server, color: "text-blue-500" },
            { label: "Avg Latency", value: "42ms", icon: Zap, color: "text-green-500" },
            { label: "Translations Today", value: "8,439", icon: Activity, color: "text-purple-500" },
            { label: "Model Confidence", value: "94.2%", icon: Brain, color: "text-orange-500" }
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className="p-6 rounded-xl bg-card border border-border flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div className="text-3xl font-space font-bold">{stat.value}</div>
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-xl bg-card border border-border p-6">
            <h3 className="text-lg font-space font-bold mb-4">Recent Translations</h3>
            <div className="space-y-4">
              {[
                { time: "Just now", input: "HELLO HOW ARE YOU", output: "Hello, how are you?", conf: "98%" },
                { time: "2 min ago", input: "I NEED WATER", output: "I need water.", conf: "95%" },
                { time: "5 min ago", input: "WHERE IS HOSPITAL", output: "Where is the hospital?", conf: "91%" },
                { time: "12 min ago", input: "THANK YOU", output: "Thank you.", conf: "99%" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-20">{item.time}</span>
                      <span className="font-mono text-sm text-primary bg-primary/10 px-2 py-0.5 rounded">{item.input}</span>
                    </div>
                    <span className="text-sm pl-22">{item.output}</span>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">Conf: {item.conf}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-card border border-border p-6 flex flex-col gap-4">
            <h3 className="text-lg font-space font-bold mb-2">Service Health</h3>
            
            {[
              { name: "Sign Recognition Engine", status: "active" as const },
              { name: "Claude Translation API", status: "active" as const },
              { name: "MediaPipe Hand Tracking", status: "active" as const },
              { name: "Avatar Animation Gen", status: "warning" as const },
            ].map((service, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded bg-background/50 border border-border/50">
                <span className="text-sm font-medium">{service.name}</span>
                <StatusBadge label={service.status} status={service.status} pulse={service.status === 'active'} />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
