import { useState } from "react";
import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Splash } from "@/components/splash";
import { AuthProvider, useAuth } from "@/contexts/auth";
import Login from "@/pages/login";
import RailwayDashboard from "@/pages/railway-dashboard";
import EngineerDashboard from "@/pages/engineer-dashboard";
import { queryClient } from "@/lib/queryClient";

function ProtectedRoute({ role, children }: { role: "railway" | "engineer"; children: React.ReactNode }) {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  if (!user) { navigate("/login"); return null; }
  if (user.role !== role) { navigate(user.role === "railway" ? "/railway" : "/engineer"); return null; }
  return <>{children}</>;
}

function Router() {
  const { user } = useAuth();
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/railway">
        <ProtectedRoute role="railway"><RailwayDashboard /></ProtectedRoute>
      </Route>
      <Route path="/engineer">
        <ProtectedRoute role="engineer"><EngineerDashboard /></ProtectedRoute>
      </Route>
      <Route path="/">
        {user
          ? <Redirect to={user.role === "railway" ? "/railway" : "/engineer"} />
          : <Redirect to="/login" />}
      </Route>
      <Route>
        <Redirect to="/login" />
      </Route>
    </Switch>
  );
}

function App() {
  const [splashDone, setSplashDone] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          {!splashDone && <Splash onDone={() => setSplashDone(true)} />}
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
