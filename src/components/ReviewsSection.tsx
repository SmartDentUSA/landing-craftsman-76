/**
 * ReviewsSection Component
 * Interface para gerenciar reviews da empresa (manuais e Google sync)
 */

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Star, Plus, Trash2, Edit, ExternalLink, Loader2, RefreshCw, CheckCircle2, Upload, ChevronDown, ChevronUp } from "lucide-react";
import { CSVReviewUploader } from "@/components/CSVReviewUploader";
import { useCompanyReviews } from "@/hooks/useCompanyReviews";
import { useAuthReady } from "@/hooks/useAuthReady";
import type { CompanyReviewsJSONB } from "@/types/reviews";

export function ReviewsSection() {
  const { loading, syncing, loadCompanyReviews, saveCompanyReviews, syncGoogleReviews } = useCompanyReviews();
  const { isAuthenticated, isReady } = useAuthReady();
  
  const [reviews, setReviews] = useState<CompanyReviewsJSONB>({
    manual_reviews: [],
    google_reviews_imported: false,
    google_place_id: null,
    last_google_sync: null
  });

  
  const [editingReview, setEditingReview] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedReviews, setExpandedReviews] = useState<Set<number>>(new Set());

  // Form states
  const [formAuthor, setFormAuthor] = useState("");
  const [formRating, setFormRating] = useState(5);
  const [formText, setFormText] = useState("");

  // Carregar reviews apenas quando autenticado
  useEffect(() => {
    if (isReady && isAuthenticated) {
      loadReviews();
    }
  }, [isReady, isAuthenticated]);

  const loadReviews = async () => {
    const data = await loadCompanyReviews();
    if (data) {
      console.log('🔄 Reviews recarregados:', {
        manual_count: data.manual_reviews?.length || 0,
        google_imported: data.google_reviews_imported,
        google_place_id: data.google_place_id,
        last_sync: data.last_google_sync
      });
      
      setReviews(data);
    }
  };

  const handleSave = async () => {
    await saveCompanyReviews(reviews);
  };


  const handleAddReview = async () => {
    if (!formAuthor.trim() || !formText.trim()) return;

    const newReview = {
      author_name: formAuthor,
      rating: formRating,
      review_text: formText,
      review_date: new Date().toISOString()
    };

    let updatedReviews: CompanyReviewsJSONB;

    if (editingReview !== null) {
      // Editar existente
      const updated = [...reviews.manual_reviews];
      updated[editingReview] = newReview;
      updatedReviews = { ...reviews, manual_reviews: updated };
    } else {
      // Adicionar novo
      updatedReviews = {
        ...reviews,
        manual_reviews: [...reviews.manual_reviews, newReview]
      };
    }

    setReviews(updatedReviews);
    await saveCompanyReviews(updatedReviews);

    // Reset form
    setFormAuthor("");
    setFormRating(5);
    setFormText("");
    setEditingReview(null);
    setIsModalOpen(false);
  };

  const handleEditReview = (index: number) => {
    const review = reviews.manual_reviews[index];
    setFormAuthor(review.author_name);
    setFormRating(review.rating);
    setFormText(review.review_text);
    setEditingReview(index);
    setIsModalOpen(true);
  };

  const handleDeleteReview = async (index: number) => {
    const updated = reviews.manual_reviews.filter((_, i) => i !== index);
    const updatedReviews = { ...reviews, manual_reviews: updated };
    setReviews(updatedReviews);
    await saveCompanyReviews(updatedReviews);
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Botão Salvar no topo */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Salvar Reviews
        </Button>
      </div>

      <Accordion type="multiple" defaultValue={["manual-reviews", "csv-upload"]} className="w-full space-y-4">
        {/* Seção 1: Reviews Manuais */}
        <AccordionItem value="manual-reviews">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <Star className="h-5 w-5 text-yellow-500" />
              <span className="font-semibold">Reviews Manuais da Empresa</span>
              <Badge variant="secondary">{reviews.manual_reviews.length} reviews</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Gerenciar Reviews Manuais</CardTitle>
                <CardDescription>
                  Adicione reviews manualmente para aparecerem no schema LocalBusiness
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Card de boas-vindas quando não há reviews */}
                {reviews.manual_reviews.length === 0 && (
                  <Card className="border-dashed bg-muted/50">
                    <CardContent className="flex flex-col items-center justify-center py-8 px-4 text-center space-y-4">
                      <div className="rounded-full bg-primary/10 p-4">
                        <Star className="h-8 w-8 text-primary" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-semibold text-lg">Nenhum review adicionado ainda</h3>
                        <p className="text-sm text-muted-foreground max-w-md">
                          Reviews são essenciais para SEO! Eles aparecem no schema LocalBusiness e ajudam a aumentar a confiança dos clientes.
                        </p>
                      </div>
                      <Button 
                        onClick={() => {
                          setEditingReview(null);
                          setFormAuthor("");
                          setFormRating(5);
                          setFormText("");
                          setIsModalOpen(true);
                        }}
                        className="group"
                      >
                        <Plus className="h-4 w-4 mr-2 transition-transform group-hover:scale-110" />
                        Adicionar Primeiro Review
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Lista de reviews */}
                <div className="space-y-3">
                  {reviews.manual_reviews.length > 0 && (
                    reviews.manual_reviews.map((review, index) => {
                      const isExpanded = expandedReviews.has(index);
                      const shouldTruncate = review.review_text && review.review_text.length > 150;
                      const displayText = isExpanded || !shouldTruncate 
                        ? review.review_text 
                        : review.review_text.substring(0, 150) + '...';

                      return (
                        <Card key={index} className="p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1">
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
                                  <span className="font-semibold">{review.author_name}</span>
                                  {renderStars(review.rating)}
                                </div>
                                <div 
                                  className={shouldTruncate ? "cursor-pointer select-none" : ""}
                                  onClick={() => {
                                    if (shouldTruncate) {
                                      setExpandedReviews(prev => {
                                        const newSet = new Set(prev);
                                        if (newSet.has(index)) {
                                          newSet.delete(index);
                                        } else {
                                          newSet.add(index);
                                        }
                                        return newSet;
                                      });
                                    }
                                  }}
                                >
                                  <p className="text-sm text-muted-foreground">
                                    {displayText}
                                  </p>
                                  {shouldTruncate && (
                                    <div className="flex items-center gap-1 text-primary text-xs mt-1 font-medium hover:underline">
                                      {isExpanded ? (
                                        <>
                                          <span>Ver menos</span>
                                          <ChevronUp className="h-3 w-3" />
                                        </>
                                      ) : (
                                        <>
                                          <span>Ver mais</span>
                                          <ChevronDown className="h-3 w-3" />
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(review.review_date || "").toLocaleDateString("pt-BR")}
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-2">
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
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      );
                    })
                  )}
                </div>

                {/* Botão adicionar (visível apenas quando já houver reviews) */}
                {reviews.manual_reviews.length > 0 && (
                  <Button 
                    className="w-full group" 
                    onClick={() => {
                      setEditingReview(null);
                      setFormAuthor("");
                      setFormRating(5);
                      setFormText("");
                      setIsModalOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2 transition-transform group-hover:rotate-90" />
                    Adicionar Review Manual
                  </Button>
                )}

                {/* Modal para adicionar/editar */}
                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingReview !== null ? "Editar Review" : "Adicionar Review"}
                      </DialogTitle>
                      <DialogDescription>
                        Preencha os dados do review manualmente
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Nome do Autor</Label>
                        <Input
                          value={formAuthor}
                          onChange={(e) => setFormAuthor(e.target.value)}
                          placeholder="Ex: João Silva"
                        />
                      </div>
                      <div>
                        <Label>Rating (1-5 estrelas)</Label>
                        <Input
                          type="number"
                          min={1}
                          max={5}
                          value={formRating}
                          onChange={(e) => setFormRating(parseInt(e.target.value) || 5)}
                        />
                      </div>
                      <div>
                        <Label>Texto do Review</Label>
                        <Textarea
                          value={formText}
                          onChange={(e) => setFormText(e.target.value)}
                          placeholder="Digite o review..."
                          rows={4}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleAddReview}>
                        {editingReview !== null ? "Salvar" : "Adicionar"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* Seção 2: Importação via CSV */}
        <AccordionItem value="csv-upload">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <Upload className="h-5 w-5 text-purple-500" />
              <span className="font-semibold">Importar Reviews via CSV</span>
              <Badge variant="secondary">{reviews.manual_reviews.length} reviews</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Upload de Reviews em Massa</CardTitle>
                <CardDescription>
                  Importe múltiplos reviews de uma vez usando um arquivo CSV
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CSVReviewUploader 
                  reviews={reviews.manual_reviews.map((r, idx) => ({
                    id: `manual_${idx}`,
                    author_name: r.author_name,
                    rating: r.rating,
                    review_text: r.review_text || '',
                    approved: true
                  }))}
                  onReviewsUpdate={async (updatedReviews) => {
                    const updatedData = {
                      ...reviews,
                      manual_reviews: updatedReviews.map(r => ({
                        author_name: r.author_name,
                        rating: r.rating,
                        review_text: r.review_text,
                        review_date: new Date().toISOString(),
                        approved: r.approved ?? true,
                        profile_photo_url: r.profile_photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.author_name)}&background=4285f4&color=fff&size=128`
                      }))
                    };
                    setReviews(updatedData);
                    await saveCompanyReviews(updatedData);
                  }}
                />
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
