import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { FileText, ExternalLink } from "lucide-react";

interface Tutorial {
  id: string;
  course_name: string;
  course_url: string;
  created_at: string;
}

interface TutorialsListProps {
  productId: string | null;
  onInsert: (text: string) => void;
}

export function TutorialsList({ productId, onInsert }: TutorialsListProps) {
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [insertCount, setInsertCount] = useState(0);

  useEffect(() => {
    if (!productId) {
      setTutorials([]);
      setInsertCount(0);
      return;
    }

    const fetchTutorials = async () => {
      const { data, error } = await supabase
        .from('products_repository')
        .select('tutorial_resources')
        .eq('id', productId)
        .single();

      if (error) {
        console.error('Erro ao carregar tutoriais:', error);
        return;
      }

      const resources = data?.tutorial_resources as { tutorials?: Tutorial[] } | null;
      setTutorials(resources?.tutorials || []);
      setInsertCount(0); // Reset counter quando trocar de produto
    };

    fetchTutorials();
  }, [productId]);

  const handleInsertTutorial = (tutorial: Tutorial) => {
    const nextNumber = insertCount + 1;
    const formattedText = `\n\n${nextNumber}) ${tutorial.course_name}: ${tutorial.course_url}\n`;
    onInsert(formattedText);
    setInsertCount(nextNumber);
  };

  if (!productId || tutorials.length === 0) {
    return null;
  }

  return (
    <Card className="mt-3 bg-blue-50/40 border-blue-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="h-4 w-4 text-blue-600" />
          🎓 Tutoriais do Produto
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {tutorials.map((tutorial) => (
          <div 
            key={tutorial.id} 
            className="flex items-center justify-between border border-blue-200 p-2 rounded-lg bg-white hover:bg-blue-50/50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">
                {tutorial.course_name}
              </div>
              <a 
                href={tutorial.course_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline truncate flex items-center gap-1 mt-0.5"
              >
                {tutorial.course_url}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleInsertTutorial(tutorial)}
              className="ml-2 flex-shrink-0"
            >
              Inserir na Mensagem
            </Button>
          </div>
        ))}
        <p className="text-xs text-muted-foreground mt-2">
          💡 Dica: Os tutoriais serão numerados automaticamente (1, 2, 3...)
        </p>
      </CardContent>
    </Card>
  );
}
