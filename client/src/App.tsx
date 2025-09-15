import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/system/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";

// Export the User type from useAuth for reuse
export type { User } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";

// Super Root Pages
import SuperRootDashboard from "@/pages/super-root/dashboard";
import SuperRootSettings from "@/pages/super-root/settings";
import SuperRootWhatsApp from "@/pages/super-root/whatsapp";
import SuperRootAI from "@/pages/super-root/ai";
import SuperRootPlans from "@/pages/super-root/plans";
import SuperRootFranchisors from "@/pages/super-root/franchisors";
import SuperRootProfile from "@/pages/super-root/profile";

// Admin Pages (now Franchisor)
import AdminDashboard from "@/pages/admin/dashboard";
import ClientsPage from "@/pages/admin/clients";
import TeamPage from "@/pages/admin/team";
import FranchisesPage from "@/pages/admin/franchises";
import AdminSettings from "@/pages/admin/settings";
import AIPage from "@/pages/admin/ai";
import WhatsAppPage from "@/pages/admin/whatsapp";
import AdminMessages from "@/pages/admin/messages"; // Nova importação

// Franchise Pages
import FranchiseDashboard from "@/pages/franchise/dashboard";
import FranchiseInvoicesPage from "@/pages/franchise/invoices";
import FranchiseProfilePage from "@/pages/franchise/profile";
import FranchiseClientsPage from "@/pages/franchise/clients";
import FranchiseWhatsAppPage from "@/pages/franchise/whatsapp";
import FranchiseConversationsPage from "@/pages/franchise/conversations";
import FranchiseAIPage from "@/pages/franchise/ai";
import FranchiseCalendarPage from "@/pages/franchise/calendar";
import FranchiseAtendimentoPage from "@/pages/franchise/crm/atendimento";

// Team Pages
import TeamDashboard from "@/pages/team/dashboard";
import TeamProjectsPage from "@/pages/team/projects";
import TeamProfilePage from "@/pages/team/profile";

// Debug Page
import Debug from "@/pages/debug";

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
      case "super_root":
        return "/super-root";
      case "franchisor":
      case "admin": // Backward compatibility
        return "/admin";
      case "franchise":
      case "client": // Tratar client como franchise
        return "/franchise";
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
          if (defaultRoute === "/super-root") return <SuperRootDashboard />;
          if (defaultRoute === "/admin") return <AdminDashboard />;
          if (defaultRoute === "/franchise") return <FranchiseDashboard />;
          if (defaultRoute === "/team") return <TeamDashboard />;
          return <Landing />;
        }}
      </Route>

      {/* Super Root Routes */}
      {user?.role === "super_root" && (
        <>
          <Route path="/super-root" component={SuperRootDashboard} />
          <Route path="/super-root/plans" component={SuperRootPlans} />
          <Route path="/super-root/franchisors" component={SuperRootFranchisors} />
          <Route path="/super-root/reports">
            {() => (
              <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">Relatórios do Sistema</h1>
                  <p className="text-gray-600">Esta funcionalidade será implementada em breve.</p>
                </div>
              </div>
            )}
          </Route>
          <Route path="/super-root/ai" component={SuperRootAI} />
          <Route path="/super-root/whatsapp" component={SuperRootWhatsApp} />
          <Route path="/super-root/settings" component={SuperRootSettings} />
          <Route path="/super-root/profile" component={SuperRootProfile} />
        </>
      )}

      {/* Franchisor Routes (Admin) */}
      {(user?.role === "franchisor" || user?.role === "admin") && (
        <>
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/admin/clients" component={ClientsPage} />
          <Route path="/admin/clients/new" component={ClientsPage} />
          <Route path="/admin/team" component={TeamPage} />
          <Route path="/admin/team/new" component={TeamPage} />
          <Route path="/admin/franchises" component={FranchisesPage} />
          <Route path="/admin/franchises/new" component={FranchisesPage} />
          <Route path="/admin/ai" component={AIPage} />
          <Route path="/admin/whatsapp" component={WhatsAppPage} />
          <Route path="/admin/messages" component={AdminMessages} /> {/* Nova rota */}
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

      {/* Franchise Routes */}
      {(user?.role === "franchise" || user?.role === "client") && (
        <>
          <Route path="/franchise" component={FranchiseDashboard} />
          <Route path="/franchise/clients" component={FranchiseClientsPage} />
          <Route path="/franchise/crm/atendimento" component={FranchiseAtendimentoPage} />
          <Route path="/franchise/ai" component={FranchiseAIPage} />
          <Route path="/franchise/whatsapp" component={FranchiseWhatsAppPage} />
          <Route path="/franchise/conversations" component={FranchiseConversationsPage} />
          <Route path="/franchise/invoices" component={FranchiseInvoicesPage} />
          <Route path="/franchise/profile" component={FranchiseProfilePage} />
          <Route path="/franchise/calendar" component={FranchiseCalendarPage} />
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

      {/* Debug Route */}
      <Route path="/debug" component={Debug} />

      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <SonnerToaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
