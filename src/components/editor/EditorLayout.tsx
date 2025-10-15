import { ReactNode } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface EditorLayoutProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  children: ReactNode;
}

export function EditorLayout({ currentTab, onTabChange, children }: EditorLayoutProps) {
  return (
    <div className="w-full">
      <Tabs value={currentTab} onValueChange={onTabChange} className="w-full">
        <TabsList className="grid grid-cols-7 w-full">
          <TabsTrigger value="basic">Básico</TabsTrigger>
          <TabsTrigger value="banner">Banner</TabsTrigger>
          <TabsTrigger value="content">Conteúdo</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="schema">Schema</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="footer">Rodapé</TabsTrigger>
        </TabsList>
        
        {children}
      </Tabs>
    </div>
  );
}
