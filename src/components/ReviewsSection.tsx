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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Star, Plus, Trash2, Edit, ExternalLink, Loader2, RefreshCw, CheckCircle2, Upload } from "lucide-react";
import { CSVReviewUploader } from "@/components/CSVReviewUploader";
import { useCompanyReviews } from "@/hooks/useCompanyReviews";
import type { CompanyReviewsJSONB } from "@/types/reviews";

export function ReviewsSection() {
  const { loading, syncing, loadCompanyReviews, saveCompanyReviews, syncGoogleReviews } = useCompanyReviews();
  
  const [reviews, setReviews] = useState<CompanyReviewsJSONB>({
    manual_reviews: [],
    google_reviews_imported: false,
    google_place_id: null,
    last_google_sync: null
  });

  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [editingReview, setEditingReview] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [formAuthor, setFormAuthor] = useState("");
  const [formRating, setFormRating] = useState(5);
  const [formText, setFormText] = useState("");

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    const data = await loadCompanyReviews();
    if (data) {
      setReviews(data);
      if (data.google_place_id) {
        setGoogleMapsUrl(`https://maps.google.com/?cid=${data.google_place_id}`);
      }
    }
  };

  const handleSave = async () => {
    await saveCompanyReviews(reviews);
  };

  const handleGoogleSync = async () => {
    if (!googleMapsUrl.trim()) return;
    
    const success = await syncGoogleReviews(googleMapsUrl);
    if (success) {
      await loadReviews(); // Recarregar após sync
    }
  };

  const handleAddReview = () => {
    if (!formAuthor.trim() || !formText.trim()) return;

    const newReview = {
      author_name: formAuthor,
      rating: formRating,
      review_text: formText,
      review_date: new Date().toISOString()
    };

    if (editingReview !== null) {
      // Editar existente
      const updated = [...reviews.manual_reviews];
      updated[editingReview] = newReview;
      setReviews({ ...reviews, manual_reviews: updated });
    } else {
      // Adicionar novo
      setReviews({
        ...reviews,
        manual_reviews: [...reviews.manual_reviews, newReview]
      });
    }

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

  const handleDeleteReview = (index: number) => {
    const updated = reviews.manual_reviews.filter((_, i) => i !== index);
    setReviews({ ...reviews, manual_reviews: updated });
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

      <Accordion type="multiple" defaultValue={["manual-reviews"]} className="w-full space-y-4">
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
                    reviews.manual_reviews.map((review, index) => (
                      <Card key={index} className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{review.author_name}</span>
                              {renderStars(review.rating)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {review.review_text}
                            </p>
                            <span className="text-xs text-muted-foreground">
                              {new Date(review.review_date || "").toLocaleDateString("pt-BR")}
                            </span>
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
                    ))
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

        {/* Seção 2: Importação Google */}
        <AccordionItem value="google-sync">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <ExternalLink className="h-5 w-5 text-blue-500" />
              <span className="font-semibold">Importar do Google Reviews</span>
              {reviews.google_reviews_imported && (
                <Badge variant="default">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Sincronizado
                </Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sincronizar Google Reviews</CardTitle>
                <CardDescription>
                  Importe reviews do Google Maps para o perfil da empresa
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Card informativo */}
                <Card className="bg-muted/30 border-primary/20">
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">
                      <strong>💡 Como encontrar:</strong> Acesse o Google Maps, procure sua empresa, copie a URL da página (ex: https://maps.google.com/?cid=123456789) e cole abaixo.
                    </p>
                  </CardContent>
                </Card>

                <div>
                  <Label>Google Maps URL ou Place ID</Label>
                  <div className="flex gap-2">
                    <Input
                      value={googleMapsUrl}
                      onChange={(e) => setGoogleMapsUrl(e.target.value)}
                      placeholder="https://maps.google.com/?cid=..."
                    />
                    <Button
                      onClick={handleGoogleSync}
                      disabled={syncing || !googleMapsUrl.trim()}
                    >
                      {syncing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Status da sincronização */}
                <div className="flex flex-col gap-2">
                  {reviews.last_google_sync && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1 text-success" />
                        Última sincronização: {new Date(reviews.last_google_sync).toLocaleString("pt-BR")}
                      </Badge>
                    </div>
                  )}

                  {reviews.google_place_id && (
                    <div className="text-sm text-muted-foreground">
                      <strong>Place ID:</strong> <code className="bg-muted px-2 py-0.5 rounded">{reviews.google_place_id}</code>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* Seção 3: Importação via CSV */}
        <AccordionItem value="csv-import">
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
                  onReviewsUpdate={(updatedReviews) => {
                    setReviews({
                      ...reviews,
                      manual_reviews: updatedReviews.map(r => ({
                        author_name: r.author_name,
                        rating: r.rating,
                        review_text: r.review_text,
                        review_date: new Date().toISOString()
                      }))
                    });
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
