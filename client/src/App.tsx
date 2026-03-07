import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import DataSources from "./pages/DataSources";
import JobScheduling from "./pages/JobScheduling";
import Monitoring from "./pages/Monitoring";

function Router() {
  return (
    <Switch>
      <Route path="" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/data-sources" component={DataSources} />
      <Route path="/scheduling" component={JobScheduling} />
      <Route path="/monitoring" component={Monitoring} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
