import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import Components from "@/pages/components";
import Alerts from "@/pages/alerts";
import Inspections from "@/pages/inspections";
import GeminiInspector from "@/pages/gemini";
import NotFound from "@/pages/not-found";
import { queryClient } from "@/lib/queryClient";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/components" component={Components} />
        <Route path="/alerts" component={Alerts} />
        <Route path="/inspections" component={Inspections} />
        <Route path="/gemini" component={GeminiInspector} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
