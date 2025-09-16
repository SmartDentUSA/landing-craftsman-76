import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Upload, CheckCircle, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ManualReview {
  id: string;
  author_name: string;
  rating: number;
  review_text: string;
  approved: boolean;
}

interface CSVReviewUploaderProps {
  reviews: ManualReview[];
  onReviewsUpdate: (reviews: ManualReview[]) => void;
}

export const CSVReviewUploader: React.FC<CSVReviewUploaderProps> = ({
  reviews,
  onReviewsUpdate
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const parseCSV = (csvText: string): ManualReview[] => {
    const lines = csvText.split('\n').filter(line => line.trim());
    const parsedReviews: ManualReview[] = [];
    
    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const parts = line.split(';');
      if (parts.length >= 3) {
        const [name, rating, comment] = parts;
        const numericRating = rating.includes('/') ? parseInt(rating.split('/')[0]) : parseInt(rating);
        
        if (name && !isNaN(numericRating) && comment) {
          parsedReviews.push({
            id: `manual_${Date.now()}_${i}`,
            author_name: name.trim(),
            rating: numericRating,
            review_text: comment.trim(),
            approved: true // Auto-approve manual reviews
          });
        }
      }
    }
    
    return parsedReviews;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: "❌ Formato inválido",
        description: "Por favor, selecione um arquivo CSV",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    
    try {
      const text = await file.text();
      const newReviews = parseCSV(text);
      
      if (newReviews.length === 0) {
        toast({
          title: "❌ Nenhuma review encontrada",
          description: "Verifique o formato do arquivo CSV",
          variant: "destructive"
        });
        return;
      }

      // Replace existing reviews with new ones
      onReviewsUpdate(newReviews);
      
      // Save to database
      try {
        const useLandingPages = (await import('@/hooks/useLandingPages')).default;
        const landingPageId = window.location.pathname.split('/').pop() || 'default';
        await useLandingPages.getState().saveManualReviews(landingPageId, newReviews);
      } catch (error) {
        console.error('Error saving to database:', error);
      }
      
      toast({
        title: "✅ Reviews importadas!",
        description: `${newReviews.length} avaliações carregadas com sucesso`
      });
    } catch (error) {
      toast({
        title: "❌ Erro ao processar arquivo",
        description: "Verifique o formato do arquivo CSV",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      // Reset input
      event.target.value = '';
    }
  };

  const removeReview = (reviewId: string) => {
    const updatedReviews = reviews.filter(r => r.id !== reviewId);
    onReviewsUpdate(updatedReviews);
    
    toast({
      title: "🗑️ Review removida",
      description: "Avaliação removida com sucesso"
    });
  };

  const toggleApproval = (reviewId: string) => {
    const updatedReviews = reviews.map(r => 
      r.id === reviewId ? { ...r, approved: !r.approved } : r
    );
    onReviewsUpdate(updatedReviews);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Reviews Manuais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="csv-upload">Upload do Arquivo CSV</Label>
            <div className="mt-1">
              <Input
                id="csv-upload"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Formato: Nome;Nota;Comentário (ex: João Silva;5/5;Excelente serviço)
              <br />
              <a 
                href="/template-reviews.csv" 
                download 
                className="text-blue-600 hover:underline"
              >
                📄 Baixar modelo CSV
              </a>
            </p>
          </div>

          {reviews.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Reviews Carregadas</h4>
                <Badge variant="secondary">
                  {reviews.filter(r => r.approved).length} aprovadas de {reviews.length}
                </Badge>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2">
                {reviews.map((review) => (
                  <div key={review.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{review.author_name}</span>
                          <div className="flex">{renderStars(review.rating)}</div>
                          {review.approved && (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {review.review_text}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <Button
                          size="sm"
                          variant={review.approved ? "secondary" : "outline"}
                          onClick={() => toggleApproval(review.id)}
                          className="text-xs px-2 py-1"
                        >
                          {review.approved ? "Aprovada" : "Pendente"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeReview(review.id)}
                          className="text-xs p-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onReviewsUpdate([]);
                  toast({
                    title: "🗑️ Reviews removidas",
                    description: "Todas as reviews manuais foram removidas"
                  });
                }}
                className="w-full"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Remover Todas as Reviews
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};