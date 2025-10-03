import React from 'react';
import { Button } from '@/components/ui/button';
import { Edit, FileText, Code } from 'lucide-react';

interface ContentViewToggleProps {
  mode: 'edit' | 'text' | 'html';
  onModeChange: (mode: 'edit' | 'text' | 'html') => void;
}

export const ContentViewToggle: React.FC<ContentViewToggleProps> = ({ mode, onModeChange }) => {
  return (
    <div className="inline-flex rounded-lg border border-input bg-background p-1 gap-1">
      <Button
        variant={mode === 'edit' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onModeChange('edit')}
        className="gap-2"
      >
        <Edit className="h-4 w-4" />
        Editar
      </Button>
      <Button
        variant={mode === 'text' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onModeChange('text')}
        className="gap-2"
      >
        <FileText className="h-4 w-4" />
        Texto
      </Button>
      <Button
        variant={mode === 'html' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onModeChange('html')}
        className="gap-2"
      >
        <Code className="h-4 w-4" />
        HTML
      </Button>
    </div>
  );
};
