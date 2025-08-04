import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";

// Admin Pages
import AdminDashboard from "@/pages/admin/dashboard";
import ClientsPage from "@/pages/admin/clients";
import TeamPage from "@/pages/admin/team";
import AdminSettings from "@/pages/admin/settings";
import AIPage from "@/pages/admin/ai";

// Client Pages
import ClientDashboard from "@/pages/client/dashboard";
import ClientInvoicesPage from "@/pages/client/invoices";
import ClientProfilePage from "@/pages/client/profile";

// Team Pages
import TeamDashboard from "@/pages/team/dashboard";
import TeamProjectsPage from "@/pages/team/projects";
import TeamProfilePage from "@/pages/team/profile";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Show landing page if not authenticated
  if (!isAuthenticated) {
    return <Landing />;
  }

  // Route users to their appropriate dashboard based on role
  const getDefaultRoute = () => {
    switch (user?.role) {
      case "admin":
        return "/admin";
      case "client":
        return "/client";
      case "team":
        return "/team";
      default:
        return "/";
    }
  };

  return (
    <Switch>
      {/* Root route - redirect based on user role */}
      <Route path="/">
        {() => {
          const defaultRoute = getDefaultRoute();
          if (defaultRoute === "/admin") return <AdminDashboard />;
          if (defaultRoute === "/client") return <ClientDashboard />;
          if (defaultRoute === "/team") return <TeamDashboard />;
          return <Landing />;
        }}
      </Route>

      {/* Admin Routes */}
      {user?.role === "admin" && (
        <>
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/admin/clients" component={ClientsPage} />
          <Route path="/admin/clients/new" component={ClientsPage} />
          <Route path="/admin/team" component={TeamPage} />
          <Route path="/admin/team/new" component={TeamPage} />
          <Route path="/admin/ai" component={AIPage} />
          <Route path="/admin/settings" component={AdminSettings} />
          <Route path="/admin/reports">
            {() => (
              <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">Relatórios</h1>
                  <p className="text-gray-600">Esta funcionalidade será implementada em breve.</p>
                </div>
              </div>
            )}
          </Route>
        </>
      )}

      {/* Client Routes */}
      {user?.role === "client" && (
        <>
          <Route path="/client" component={ClientDashboard} />
          <Route path="/client/invoices" component={ClientInvoicesPage} />
          <Route path="/client/profile" component={ClientProfilePage} />
        </>
      )}

      {/* Team Routes */}
      {user?.role === "team" && (
        <>
          <Route path="/team" component={TeamDashboard} />
          <Route path="/team/projects" component={TeamProjectsPage} />
          <Route path="/team/profile" component={TeamProfilePage} />
        </>
      )}

      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
