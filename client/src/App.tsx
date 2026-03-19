import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import DataSources from "./pages/DataSources";
import JobScheduling from "./pages/JobScheduling";
import Monitoring from "./pages/Monitoring";
import LeadDetail from "./pages/LeadDetail";
import ScoringConfig from "./pages/ScoringConfig";
import ActivityLogs from "./pages/ActivityLogs";
import UserManagement from "./pages/UserManagement";
import WhatsappTemplates from "./pages/WhatsappTemplates";
import WhatsAppConnection from "./pages/WhatsAppConnection";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/data-sources" component={DataSources} />
      <Route path="/scheduling" component={JobScheduling} />
      <Route path="/monitoring" component={Monitoring} />
      <Route path="/leads/:id" component={LeadDetail} />
      <Route path="/scoring" component={ScoringConfig} />
      <Route path="/logs" component={ActivityLogs} />
      <Route path="/user-management" component={UserManagement} />
      <Route path="/whatsapp" component={WhatsappTemplates} />
      <Route path="/whatsapp-connection" component={WhatsAppConnection} />
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
