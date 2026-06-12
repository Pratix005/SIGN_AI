import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../app/components/ui/card';
import { Badge } from '../app/components/ui/badge';
import { Progress } from '../app/components/ui/progress';

export default function UnifiedDashboard() {
  // Mock data matching the telemetry structure parsed in reference_library.json and pipelines
  const technicalMetrics = [
    { name: 'Model Inference Speed', value: '14ms', status: 'optimal', color: 'text-violet-400' },
    { name: 'Fingerspelling Accuracy', value: '98.2%', status: 'nominal', color: 'text-emerald-400' },
    { name: 'Gesture Framework Load', value: '4.2%', status: 'low', color: 'text-cyan-400' }
  ];

  const recentRecognitions = [
    { character: 'A', confidence: '99.1%', timestamp: '10:42:15', type: 'Fingerspelling' },
    { character: 'Hello', confidence: '94.5%', timestamp: '10:41:48', type: 'Word Gesture' },
    { character: 'C', confidence: '97.8%', timestamp: '10:40:22', type: 'Fingerspelling' }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Grid of Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {technicalMetrics.map((metric, i) => (
          <Card key={i} className="bg-zinc-900/40 border-zinc-800/80 backdrop-blur-sm shadow-xl">
            <CardHeader className="pb-2">
              <CardDescription className="text-zinc-500 font-mono text-[10px] uppercase tracking-wider">{metric.name}</CardDescription>
              <CardTitle className={`text-3xl font-heading font-extrabold tracking-tight ${metric.color} mt-1`}>
                {metric.value}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                Protocol Status: Operational
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Live Stream Telemetry Monitor Feed Container Placeholder */}
        <Card className="lg:col-span-2 bg-zinc-900/40 border-zinc-800/80 backdrop-blur-sm flex flex-col justify-between">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="font-heading text-lg font-bold text-white">System Diagnostics Feed</CardTitle>
                <CardDescription className="text-zinc-400">Active classification layer pipelines</CardDescription>
              </div>
              <Badge variant="outline" className="border-violet-500/30 text-violet-400 font-mono text-[11px] bg-violet-500/5">
                CLASSIFIER: ACTIVE
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono text-zinc-400">
                <span>Dataset Collection Training Progress</span>
                <span className="text-white font-bold">78% Complete</span>
              </div>
              <Progress value={78} className="h-2 bg-zinc-950" />
            </div>

            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-850 font-mono text-xs text-zinc-400 space-y-1.5 leading-relaxed">
              <div className="text-zinc-500">[INFO 2026-06-02] Loading MediaPipe Hand Landmarker network...</div>
              <div className="text-emerald-400">[READY] Model successfully mapped to device tensor memory slots.</div>
              <div className="text-violet-400">[SOCKET] Established connection loop on port 8000. Listening...</div>
            </div>
          </CardContent>
        </Card>

        {/* Live Classification Tokens Log */}
        <Card className="bg-zinc-900/40 border-zinc-800/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="font-heading text-lg font-bold text-white">Live Vector Stream</CardTitle>
            <CardDescription className="text-zinc-400">Recent model inferences</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentRecognitions.map((rec, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/60 border border-zinc-900 hover:border-zinc-800 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center font-heading font-extrabold text-white">
                      {rec.character}
                    </div>
                    <div>
                      <div className="text-xs font-medium text-zinc-200">{rec.type}</div>
                      <div className="text-[10px] font-mono text-zinc-500">{rec.timestamp}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-emerald-400">{rec.confidence}</span>
                    <div className="text-[9px] text-zinc-500 uppercase tracking-widest">Match</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
