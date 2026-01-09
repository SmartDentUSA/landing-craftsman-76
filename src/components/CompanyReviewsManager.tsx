/**
 * Company Reviews Manager
 * Gerencia reviews globais da empresa (Google + Manuais)
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Star, Download, Plus, Edit, Trash2, Calendar, MapPin, ChevronDown, ChevronUp } from "lucide-react";
import { useCompanyReviews } from "@/hooks/useCompanyReviews";
import { useAuthReady } from "@/hooks/useAuthReady";
import { useToast } from "@/hooks/use-toast";
import type { CompanyReviewsJSONB } from "@/types/reviews";

export function CompanyReviewsManager() {
  const { loading, syncing, loadCompanyReviews, saveCompanyReviews, syncGoogleReviews } = useCompanyReviews();
  const { isAuthenticated, isReady } = useAuthReady();
  const { toast } = useToast();
  
  const [reviewsData, setReviewsData] = useState<CompanyReviewsJSONB | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [googleMapsUrl, setGoogleMapsUrl] = useState("https://maps.app.goo.gl/XCU7EwqCUmS9kCsx7");
  
  // Form state
  const [formData, setFormData] = useState({
    author_name: "",
    rating: 5,
    review_text: "",
    review_date: new Date().toISOString().split('T')[0]
  });

  // Carregar reviews apenas quando autenticado
  useEffect(() => {
    if (isReady && isAuthenticated) {
      loadReviews();
    }
  }, [isReady, isAuthenticated]);

  const loadReviews = async () => {
    const data = await loadCompanyReviews();
    if (data) {
      setReviewsData(data);
    }
  };

  const handleSyncGoogle = async (url: string) => {
    const success = await syncGoogleReviews(url);
    if (success) {
      await loadReviews();
    }
  };

  const handleSaveReview = async () => {
    if (!reviewsData) return;
    
    const newReview = {
      author_name: formData.author_name.trim(),
      rating: formData.rating,
      review_text: formData.review_text.trim(),
      review_date: formData.review_date
    };

    const updatedManualReviews = editingIndex !== null
      ? reviewsData.manual_reviews.map((r, i) => i === editingIndex ? newReview : r)
      : [...reviewsData.manual_reviews, newReview];

    const success = await saveCompanyReviews({
      ...reviewsData,
      manual_reviews: updatedManualReviews
    });

    if (success) {
      setReviewsData({
        ...reviewsData,
        manual_reviews: updatedManualReviews
      });
      setIsAddModalOpen(false);
      setEditingIndex(null);
      setFormData({
        author_name: "",
        rating: 5,
        review_text: "",
        review_date: new Date().toISOString().split('T')[0]
      });
    }
  };

  const handleEditReview = (index: number) => {
    if (!reviewsData) return;
    const review = reviewsData.manual_reviews[index];
    setFormData({
      author_name: review.author_name,
      rating: review.rating,
      review_text: review.review_text,
      review_date: review.review_date || new Date().toISOString().split('T')[0]
    });
    setEditingIndex(index);
    setIsAddModalOpen(true);
  };

  const handleDeleteReview = async (index: number) => {
    if (!reviewsData) return;
    if (!confirm("Deseja excluir este review?")) return;

    const updatedManualReviews = reviewsData.manual_reviews.filter((_, i) => i !== index);
    const success = await saveCompanyReviews({
      ...reviewsData,
      manual_reviews: updatedManualReviews
    });

    if (success) {
      setReviewsData({
        ...reviewsData,
        manual_reviews: updatedManualReviews
      });
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  const calculateStats = () => {
    if (!reviewsData) return { total: 0, average: 0 };
    const reviews = reviewsData.manual_reviews;
    if (reviews.length === 0) return { total: 0, average: 0 };
    
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return {
      total: reviews.length,
      average: (sum / reviews.length).toFixed(1)
    };
  };

  if (loading && !reviewsData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reviews da Empresa</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Carregando reviews...</p>
        </CardContent>
      </Card>
    );
  }

  const stats = calculateStats();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-400" />
              Reviews da Empresa (Global)
            </CardTitle>
            <CardDescription>
              Importe automaticamente as avaliações da sua empresa no Google Maps. 
              Essas avaliações aparecem nos resultados de SEO de todas as páginas da sua marca.
              Configure OAuth em /google-business-settings para melhores resultados.
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 w-full md:w-auto">
            <Input
              placeholder="URL do Google Maps"
              value={googleMapsUrl}
              onChange={(e) => setGoogleMapsUrl(e.target.value)}
              className="min-w-[300px]"
            />
            <Button
              onClick={() => handleSyncGoogle(googleMapsUrl)}
              disabled={syncing || !googleMapsUrl}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              {syncing ? "Sincronizando..." : "Importar do Google"}
            </Button>
          </div>
          <div className="flex gap-2">
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => {
                  setEditingIndex(null);
                  setFormData({
                    author_name: "",
                    rating: 5,
                    review_text: "",
                    review_date: new Date().toISOString().split('T')[0]
                  });
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Manual
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingIndex !== null ? "Editar Review" : "Adicionar Review Manual"}
                  </DialogTitle>
                  <DialogDescription>
                    Adicione reviews manualmente para complementar os do Google
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="author_name">Nome do Autor *</Label>
                    <Input
                      id="author_name"
                      value={formData.author_name}
                      onChange={(e) => setFormData({ ...formData, author_name: e.target.value })}
                      placeholder="João Silva"
                    />
                  </div>
                  <div>
                    <Label htmlFor="rating">Rating (1-5) *</Label>
                    <Input
                      id="rating"
                      type="number"
                      min="1"
                      max="5"
                      value={formData.rating}
                      onChange={(e) => setFormData({ ...formData, rating: parseInt(e.target.value) || 5 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="review_text">Texto do Review *</Label>
                    <Textarea
                      id="review_text"
                      value={formData.review_text}
                      onChange={(e) => setFormData({ ...formData, review_text: e.target.value })}
                      placeholder="Excelente atendimento e qualidade..."
                      rows={4}
                    />
                  </div>
                  <div>
                    <Label htmlFor="review_date">Data</Label>
                    <Input
                      id="review_date"
                      type="date"
                      value={formData.review_date}
                      onChange={(e) => setFormData({ ...formData, review_date: e.target.value })}
                    />
                  </div>
                  <Button 
                    onClick={handleSaveReview} 
                    disabled={!formData.author_name || !formData.review_text}
                    className="w-full"
                  >
                    {editingIndex !== null ? "Salvar Alterações" : "Adicionar Review"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Total de Reviews</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Média de Rating</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">{stats.average}</p>
              <div className="flex">{renderStars(Math.round(Number(stats.average)))}</div>
            </div>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Status Google</p>
            <Badge variant={reviewsData?.google_reviews_imported ? "default" : "secondary"}>
              {reviewsData?.google_reviews_imported ? "Importado" : "Não importado"}
            </Badge>
            {reviewsData?.last_google_sync && (
              <p className="text-xs text-muted-foreground mt-1">
                <Calendar className="h-3 w-3 inline mr-1" />
                {new Date(reviewsData.last_google_sync).toLocaleDateString('pt-BR')}
              </p>
            )}
          </div>
        </div>

        {/* Expand/Collapse Button */}
        {stats.total > 0 && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full max-w-md"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-2" />
                  Ocultar reviews
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-2" />
                  Ver todos os {stats.total} reviews
                </>
              )}
            </Button>
          </div>
        )}

        {/* Reviews List */}
        {isExpanded && (
          <div className="space-y-3">
            <h3 className="font-semibold">Reviews Manuais ({reviewsData?.manual_reviews.length || 0})</h3>
            {reviewsData?.manual_reviews.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Star className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>Nenhum review manual cadastrado</p>
                <p className="text-sm">Clique em "Adicionar Manual" ou "Importar do Google"</p>
              </div>
            ) : (
              reviewsData?.manual_reviews.map((review, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1">
                      <Avatar className="h-12 w-12 shrink-0">
                        <AvatarImage 
                          src={review.profile_photo_url} 
                          alt={review.author_name} 
                        />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {review.author_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{review.author_name}</p>
                          <div className="flex">{renderStars(review.rating)}</div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{review.review_text}</p>
                        {review.review_date && (
                          <p className="text-xs text-muted-foreground mt-2">
                            <Calendar className="h-3 w-3 inline mr-1" />
                            {new Date(review.review_date).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditReview(index)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteReview(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {reviewsData?.google_place_id && (
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              Google Place ID: {reviewsData.google_place_id}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
