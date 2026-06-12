import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import NotFound from "@/pages/not-found";

import { Navbar } from "@/components/layout/Navbar";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import Gesture from "@/pages/gesture";
import Practice from "@/pages/practice";
import Translation from "@/pages/translation";
import AiModels from "@/pages/ai-models";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/gesture" component={Gesture} />
      <Route path="/practice" component={Practice} />
      <Route path="/translation" component={Translation} />
      <Route path="/ai" component={AiModels} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <div className="relative min-h-screen">
            <Navbar />
            <Router />
          </div>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
