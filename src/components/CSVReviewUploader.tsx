import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Upload, CheckCircle, Star, Edit } from 'lucide-react';
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
  const [editingReview, setEditingReview] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ author_name: '', rating: 5, review_text: '' });
  const { toast } = useToast();

  const parseCSV = (csvText: string): ManualReview[] => {
    const lines = csvText.split('\n').filter(line => line.trim());
    const parsedReviews: ManualReview[] = [];
    
    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Try to parse CSV properly handling quotes and commas/semicolons
      let parts: string[] = [];
      
      // Check if the line contains quoted values (CSV with commas inside quotes)
      if (line.includes('"')) {
        // Parse CSV with quotes properly
        const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
        parts = line.split(regex).map(part => 
          part.replace(/^"/, '').replace(/"$/, '').trim()
        );
      } else {
        // Try comma first, then semicolon
        if (line.includes(',')) {
          parts = line.split(',');
        } else if (line.includes(';')) {
          parts = line.split(';');
        } else {
          continue; // Skip lines without proper separators
        }
      }
      
      if (parts.length >= 3) {
        const [name, rating, comment] = parts.map(part => part.trim());
        
        // Extract numeric rating from various formats (5/5, 5, etc.)
        let numericRating = 5; // Default to 5
        if (rating.includes('/')) {
          numericRating = parseInt(rating.split('/')[0]);
        } else {
          numericRating = parseInt(rating);
        }
        
        // Ensure rating is between 1 and 5
        if (isNaN(numericRating) || numericRating < 1) numericRating = 1;
        if (numericRating > 5) numericRating = 5;
        
        if (name && comment) {
          parsedReviews.push({
            id: `manual_${Date.now()}_${i}`,
            author_name: name,
            rating: numericRating,
            review_text: comment,
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

  const startEdit = (review: ManualReview) => {
    setEditingReview(review.id);
    setEditForm({
      author_name: review.author_name,
      rating: review.rating,
      review_text: review.review_text
    });
  };

  const saveEdit = () => {
    if (!editingReview) return;
    
    const updatedReviews = reviews.map(r => 
      r.id === editingReview 
        ? { ...r, ...editForm }
        : r
    );
    onReviewsUpdate(updatedReviews);
    setEditingReview(null);
    
    toast({
      title: "✅ Review atualizada",
      description: "Avaliação editada com sucesso"
    });
  };

  const cancelEdit = () => {
    setEditingReview(null);
    setEditForm({ author_name: '', rating: 5, review_text: '' });
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
              Formato: Nome,Nota,Comentário ou Nome;Nota;Comentário (ex: João Silva,5/5,Excelente serviço)
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
                    {editingReview === review.id ? (
                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs">Nome do Autor</Label>
                          <Input
                            value={editForm.author_name}
                            onChange={(e) => setEditForm(prev => ({ ...prev, author_name: e.target.value }))}
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Avaliação (1-5)</Label>
                          <Input
                            type="number"
                            min="1"
                            max="5"
                            value={editForm.rating}
                            onChange={(e) => setEditForm(prev => ({ ...prev, rating: parseInt(e.target.value) || 1 }))}
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Comentário</Label>
                          <Input
                            value={editForm.review_text}
                            onChange={(e) => setEditForm(prev => ({ ...prev, review_text: e.target.value }))}
                            className="h-8"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={saveEdit} className="text-xs">
                            Salvar
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEdit} className="text-xs">
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
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
                            onClick={() => startEdit(review)}
                            className="text-xs p-1"
                          >
                            <Edit className="w-3 h-3" />
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
                    )}
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