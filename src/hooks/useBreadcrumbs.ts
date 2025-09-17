import { useLocation, useParams } from 'react-router-dom';
import { useMemo } from 'react';

export interface BreadcrumbItem {
  label: string;
  href: string;
  isActive?: boolean;
}

export const useBreadcrumbs = () => {
  const location = useLocation();
  const params = useParams();
  
  const breadcrumbs = useMemo(() => {
    const path = location.pathname;
    const segments = path.split('/').filter(Boolean);
    const items: BreadcrumbItem[] = [];
    
    // Always start with Home
    items.push({
      label: 'Home',
      href: '/',
    });
    
    // Build breadcrumbs based on route structure
    let currentPath = '';
    
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === segments.length - 1;
      
      let label = '';
      let href = currentPath;
      
      switch (segment) {
        case 'dashboard':
          label = 'Dashboard';
          break;
        case 'editor':
          label = 'Editor';
          break;
        case 'blog-generator':
          label = 'Blog Generator';
          break;
        case 'publication-settings':
          label = 'Publication Settings';
          break;
        case 'cloudflare-settings':
          label = 'Cloudflare Settings';
          break;
        case 'code-view':
          label = 'Code View';
          break;
        case 'auth':
          label = 'Authentication';
          break;
        default:
          // For dynamic segments like landing page IDs
          if (segment.startsWith('lp_')) {
            label = 'Landing Page';
          } else {
            label = segment.charAt(0).toUpperCase() + segment.slice(1);
          }
      }
      
      items.push({
        label,
        href,
        isActive: isLast,
      });
    });
    
    return items;
  }, [location.pathname, params]);
  
  const generateSchemaMarkup = () => {
    if (breadcrumbs.length <= 1) return null;
    
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": breadcrumbs.map((item, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "name": item.label,
        "item": `${window.location.origin}${item.href}`
      }))
    };
  };
  
  return {
    breadcrumbs,
    generateSchemaMarkup,
  };
};