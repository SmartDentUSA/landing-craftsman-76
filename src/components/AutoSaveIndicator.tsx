import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2 } from 'lucide-react';

interface AutoSaveIndicatorProps {
  isSaving?: boolean;
  lastSaved?: Date;
  className?: string;
}

export const AutoSaveIndicator: React.FC<AutoSaveIndicatorProps> = ({
  isSaving = false,
  lastSaved,
  className = ""
}) => {
  if (isSaving) {
    return (
      <Badge variant="secondary" className={`animate-pulse ${className}`}>
        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
        Salvando...
      </Badge>
    );
  }

  if (lastSaved) {
    return (
      <Badge variant="outline" className={className}>
        <Check className="h-3 w-3 mr-1 text-green-600" />
        Salvo {lastSaved.toLocaleTimeString()}
      </Badge>
    );
  }

  return null;
};