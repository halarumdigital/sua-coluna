import { useQuery } from "@tanstack/react-query";

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: "super_root" | "franchisor" | "admin" | "franchise" | "client" | "team";
  active: boolean;
  [key: string]: any;
}

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  console.log('useAuth - user:', user);
  console.log('useAuth - isLoading:', isLoading);
  console.log('useAuth - error:', error);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
  };
}
