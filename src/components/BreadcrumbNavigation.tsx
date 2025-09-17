import React from 'react';
import { Link } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';

interface BreadcrumbNavigationProps {
  className?: string;
  maxItems?: number;
}

export const BreadcrumbNavigation: React.FC<BreadcrumbNavigationProps> = ({
  className,
  maxItems = 4,
}) => {
  const { breadcrumbs, generateSchemaMarkup } = useBreadcrumbs();
  
  // Don't render if there's only one item (just Home)
  if (breadcrumbs.length <= 1) {
    return null;
  }
  
  // Handle ellipsis for long breadcrumb chains
  const shouldShowEllipsis = breadcrumbs.length > maxItems;
  const displayItems = shouldShowEllipsis
    ? [
        breadcrumbs[0], // Home
        ...breadcrumbs.slice(-2), // Last 2 items
      ]
    : breadcrumbs;
  
  const schemaMarkup = generateSchemaMarkup();
  
  return (
    <>
      {schemaMarkup && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaMarkup) }}
        />
      )}
      
      <Breadcrumb className={className}>
        <BreadcrumbList>
          {shouldShowEllipsis && (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to={breadcrumbs[0].href}>{breadcrumbs[0].label}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbEllipsis />
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </>
          )}
          
          {displayItems.map((item, index) => {
            const isLast = item.isActive;
            const shouldSkipIfEllipsis = shouldShowEllipsis && index === 0;
            
            if (shouldSkipIfEllipsis) return null;
            
            return (
              <React.Fragment key={item.href}>
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage>{item.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link to={item.href}>{item.label}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {!isLast && <BreadcrumbSeparator />}
              </React.Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </>
  );
};