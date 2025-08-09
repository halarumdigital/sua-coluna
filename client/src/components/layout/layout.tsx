import { useState } from "react";
import { Menu, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import Sidebar from "./sidebar";
import DocumentHead from "@/components/system/DocumentHead";

interface LayoutProps {
  children: React.ReactNode;
  title: string;
}

export default function Layout({ children, title }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const { systemName } = useSystemSettings();

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "super_root":
        return "Super Root";
      case "franchisor":
      case "admin":
        return "Franqueador";
      case "franchise":
      case "client":
        return "Franquia";
      case "team":
        return "Equipe";
      default:
        return "Usuário";
    }
  };

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-hidden">
      <DocumentHead title={title} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col lg:ml-64 min-w-0">
        {/* Header interno */}
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-20">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
            </div>

            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
              </Button>

              <div className="flex items-center space-x-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage
                    src={user?.profileImageUrl || ""}
                    alt="User Avatar"
                    className="object-cover"
                  />
                  <AvatarFallback className="text-xs">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.firstName && user?.lastName
                      ? `${user.firstName} ${user.lastName}`
                      : user?.email?.split("@")[0] || "Usuário"}
                  </p>
                  <p className="text-xs text-gray-600">
                    {getRoleLabel(user?.role || "")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-hidden">
          <div className="p-6 h-full overflow-y-auto">{children}</div>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 py-4">
          <div className="px-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">
                © {new Date().getFullYear()} {systemName}. Todos os direitos reservados.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
