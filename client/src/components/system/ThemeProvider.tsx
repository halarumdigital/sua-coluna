import { useEffect } from "react";
import { useSystemSettings } from "@/hooks/useSystemSettings";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { systemColor, isLoading } = useSystemSettings();

  useEffect(() => {
    if (!isLoading && systemColor) {
      // Aplicar a cor principal do sistema às variáveis CSS globais
      const root = document.documentElement;
      
      // Converter hex para HSL se necessário
      const hexToHsl = (hex: string) => {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h = 0;
        let s = 0;
        const l = (max + min) / 2;

        if (max !== min) {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
          }
          h /= 6;
        }

        return `${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%`;
      };

      let hslColor: string;
      
      // Se a cor já está em formato HSL
      if (systemColor.startsWith('hsl(')) {
        hslColor = systemColor.replace('hsl(', '').replace(')', '');
      } else if (systemColor.startsWith('#')) {
        // Converter hex para HSL
        hslColor = hexToHsl(systemColor);
      } else {
        // Usar cor padrão se formato inválido
        hslColor = "207, 90%, 54%"; // Blue padrão
      }

      // Aplicar a cor principal às variáveis CSS
      root.style.setProperty('--primary', `hsl(${hslColor})`);
      root.style.setProperty('--primary-foreground', 'hsl(210, 40%, 98%)');
      
      // Aplicar às variáveis do sidebar
      root.style.setProperty('--sidebar-primary', `hsl(${hslColor})`);
      root.style.setProperty('--sidebar-primary-foreground', 'hsl(210, 40%, 98%)');
      
      // Aplicar às variáveis dos charts
      root.style.setProperty('--chart-1', `hsl(${hslColor})`);
      
      // Aplicar cor de foco/ring
      root.style.setProperty('--ring', `hsl(${hslColor})`);

      console.log(`🎨 Tema aplicado: ${systemColor} -> hsl(${hslColor})`);
    }
  }, [systemColor, isLoading]);

  return <>{children}</>;
}