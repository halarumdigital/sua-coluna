import { useQuery } from "@tanstack/react-query";

interface SystemSettings {
  systemName?: string;
  favicon?: string;
  logo?: string;
  systemColor?: string;
  primary_color?: string;
  [key: string]: any;
}

export function useSystemSettings() {
  const { data: settings, isLoading } = useQuery<SystemSettings>({
    queryKey: ["/api/system/settings"],
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
  });

  return {
    settings,
    isLoading,
    systemName: settings?.systemName || "Sistema de Gerenciamento",
    favicon: settings?.favicon,
    logo: settings?.logo,
    systemColor: settings?.systemColor || settings?.primary_color || "#3b82f6",
  };
}