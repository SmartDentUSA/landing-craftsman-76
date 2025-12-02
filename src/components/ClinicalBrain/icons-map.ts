import { 
  Layers, ScanLine, Printer, Monitor, Sun, Palette, 
  FlaskConical, Wrench, GraduationCap, Lightbulb, Package,
  type LucideIcon
} from 'lucide-react';

// Mapeamento de ícones por categoria real do banco de dados
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "RESINAS 3D": Layers,
  "SCANNERS 3D": ScanLine,
  "IMPRESSÃO 3D": Printer,
  "SOFTWARES": Monitor,
  "PÓS-IMPRESSÃO": Sun,
  "CARACTERIZAÇÃO": Palette,
  "DENTÍSTICA, ESTÉTICA E ORTODONTIA": FlaskConical,
  "INSUMOS LABORATÓRIO": Wrench,
  "CURSOS": GraduationCap,
  "SOLUÇÕES": Lightbulb,
};

export const DEFAULT_ICON = Package;

/**
 * Retorna o ícone correspondente a uma categoria
 * Faz matching case-insensitive e retorna fallback se não encontrar
 */
export function getIconForCategory(category: string | null | undefined): LucideIcon {
  if (!category) return DEFAULT_ICON;
  
  // Tentar match direto
  if (CATEGORY_ICONS[category]) {
    return CATEGORY_ICONS[category];
  }
  
  // Tentar match case-insensitive
  const upperCategory = category.toUpperCase();
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (key.toUpperCase() === upperCategory) {
      return icon;
    }
  }
  
  return DEFAULT_ICON;
}

/**
 * Extrai a categoria principal de um product_type no formato "CATEGORIA > SUBCATEGORIA"
 */
export function extractCategoryFromProductType(productType: string | null | undefined): string | null {
  if (!productType) return null;
  return productType.split('>')[0].trim();
}
