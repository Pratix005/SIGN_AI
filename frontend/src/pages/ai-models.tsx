import { useState, useEffect, useCallback } from "react";
import { WorkspaceHeader } from "@/components/layout/WorkspaceHeader";
import { StatusBadge } from "@/components/workspace/StatusBadge";
import { Brain, Settings, Activity, RefreshCw, Cpu, Database, Sparkles } from "lucide-react";

interface ServiceStatus {
  status: 'active' | 'inactive' | 'error' | 'warning';
  latency: string;
  details: string;
  additionalInfo?: string;
  loading: boolean;
}

export default function AiModels() {
  const [services, setServices] = useState<Record<string, ServiceStatus>>({
    gesture: { status: 'inactive', latency: '—', details: 'Awaiting check...', loading: true },
    translation: { status: 'inactive', latency: '—', details: 'Awaiting check...', loading: true },
    scoring: { status: 'inactive', latency: '—', details: 'Awaiting check...', loading: true },
    llm: { status: 'inactive', latency: '—', details: 'Awaiting check...', loading: true }
  });

  const checkHealth = useCallback(async () => {
    // Set all to loading state
    setServices(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => {
        next[k] = { ...next[k], loading: true };
      });
      return next;
    });

    const checkService = async (
      key: string,
      url: string,
      parseResponse: (data: any) => { status: 'active' | 'inactive' | 'error' | 'warning'; details: string; additionalInfo?: string }
    ) => {
      const startTime = performance.now();
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const endTime = performance.now();
        const latencyMs = Math.round(endTime - startTime);
        const parsed = parseResponse(data);
        setServices(prev => ({
          ...prev,
          [key]: {
            status: parsed.status,
            latency: `${latencyMs}ms`,
            details: parsed.details,
            additionalInfo: parsed.additionalInfo,
            loading: false
          }
        }));
      } catch (err: any) {
        setServices(prev => ({
          ...prev,
          [key]: {
            status: 'error',
            latency: '—',
            details: `Unreachable: ${err.message || err}`,
            loading: false
          }
        }));
      }
    };

    // 1. Gesture Predictor (Port 8000)
    checkService('gesture', 'http://localhost:8000/health', (data) => {
      const isLoaded = data.classifier_loaded;
      return {
        status: isLoaded ? 'active' : 'warning',
        details: isLoaded ? 'Pipeline & Classification Ready' : 'Pipeline OK, model not trained yet',
        additionalInfo: `Model Loaded: ${isLoaded ? 'Yes' : 'No'}`
      };
    });

    // 2. Translation API (Port 8001)
    checkService('translation', 'http://localhost:8001/health', (data) => {
      const hasLlm = data.llm_available;
      return {
        status: 'active',
        details: hasLlm ? 'Claude LLM Connected' : 'Local join fallback (No API Key)',
        additionalInfo: hasLlm ? 'Anthropic API Available' : 'Fallback mode'
      };
    });

    // 3. Scoring/DTW API (Port 8002)
    checkService('scoring', 'http://localhost:8002/health', (data) => {
      const count = data.signs_in_library ?? 0;
      return {
        status: 'active',
        details: `Pose evaluation and skeleton distance metrics active`,
        additionalInfo: `${count} sign templates in library`
      };
    });

    // 4. LLM Backend / Ollama (Port 8080)
    checkService('llm', 'http://localhost:8080/health', (data) => {
      const ollamaOk = data.ollama === 'running';
      const modelsList = data.models ? data.models.join(', ') : '';
      return {
        status: ollamaOk ? 'active' : 'warning',
        details: ollamaOk ? 'Ollama local connection active' : 'Ollama integration not running',
        additionalInfo: ollamaOk ? `Active: ${modelsList || 'none'}` : 'Ollama server offline'
      };
    });
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  const models = [
    {
      id: "gesture",
      name: "MediaPipe Holistic Predictor",
      provider: "Google / SignAI Custom",
      type: "Computer Vision",
      version: "v0.8.11",
      description: "Real-time hand and pose tracking engine. Extracts 21 keypoints per hand to predict fingerspelling signs.",
      healthUrl: "http://localhost:8000/health",
      icon: Cpu,
    },
    {
      id: "translation",
      name: "Claude 3.5 Sonnet Translator",
      provider: "Anthropic / Wouter Engine",
      type: "LLM & Translation Queue",
      version: "Latest (Claude-3.5-Sonnet)",
      description: "Handles natural language translation, converting raw sign glosses into coherent spoken/written sentences.",
      healthUrl: "http://localhost:8001/health",
      icon: Sparkles,
    },
    {
      id: "scoring",
      name: "DTW Alignment Scoring Engine",
      provider: "SignAI Custom",
      type: "Dynamic Time Warping / Math",
      version: "v1.2.0",
      description: "Scores physical gestures against a golden template library of sign postures, returning per-finger accuracy feedback.",
      healthUrl: "http://localhost:8002/health",
      icon: Database,
    },
    {
      id: "llm",
      name: "Local AI Tutor & Coach",
      provider: "Ollama Llama-3.2",
      type: "Local LLM",
      version: "llama3.2:3b",
      description: "Provides automated lesson planning and personalized feedback by analyzing practice history and accuracy metrics.",
      healthUrl: "http://localhost:8080/health",
      icon: Brain,
    }
  ];

  return (
    <div className="min-h-[100dvh] pt-16 flex flex-col bg-background">
      <WorkspaceHeader 
        title="SignAI"
        subtitle="AI Models Configuration"
        badge="Admin"
        action={
          <button 
            onClick={checkHealth}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-border bg-card hover:bg-accent/10 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Ping All Services
          </button>
        }
      />

      <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-space font-bold mb-2">Engine Models</h1>
            <p className="text-muted-foreground text-sm">Manage and monitor the underlying AI systems powering the SignAI workspaces.</p>
          </div>
          <button className="p-2 rounded-md bg-card border border-border hover:bg-accent/10">
            <Settings className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {models.map((model) => {
            const state = services[model.id] || { status: 'inactive', latency: '—', details: 'Checking...', loading: false };
            const Icon = model.icon;

            return (
              <div key={model.id} className="bg-card border border-border rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-primary/30 transition-all duration-300">
                <div className="flex-1 flex gap-4 items-start">
                  <div className="p-3 bg-primary/10 text-primary rounded-xl border border-primary/20 mt-1">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h3 className="text-xl font-space font-bold">{model.name}</h3>
                      <StatusBadge 
                        label={state.loading ? "checking..." : state.status} 
                        status={state.status} 
                        pulse={state.status === 'active' && !state.loading} 
                      />
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono mb-4">
                      <span className="flex items-center gap-1"><Brain className="w-3 h-3" /> {model.provider}</span>
                      <span>•</span>
                      <span>{model.type}</span>
                      <span>•</span>
                      <span>{model.version}</span>
                    </div>
                    <p className="text-sm text-foreground/80 mb-3">{model.description}</p>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-mono text-muted-foreground">{state.details}</span>
                      {state.additionalInfo && (
                        <span className="text-[11px] font-mono text-primary/80 bg-primary/5 px-2 py-0.5 rounded border border-primary/10 self-start">
                          {state.additionalInfo}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-row md:flex-col gap-4 md:items-end md:min-w-[150px] justify-between border-t md:border-t-0 pt-4 md:pt-0 border-border">
                  <div className="flex flex-col md:items-end">
                    <span className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Latency</span>
                    <div className="flex items-center gap-1.5 text-lg font-bold font-mono">
                      <Activity className="w-4 h-4 text-emerald-500" />
                      {state.latency}
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => {
                      if (model.healthUrl) {
                        window.open(model.healthUrl, '_blank');
                      }
                    }}
                    className="px-4 py-2 rounded bg-secondary text-secondary-foreground text-xs font-semibold hover:bg-secondary/80 w-auto"
                  >
                    View JSON API
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
