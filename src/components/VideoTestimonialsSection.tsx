import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { VideoIcon, Instagram, Youtube, Plus, Edit, Trash2, Star, MapPin, Wand2, Upload } from 'lucide-react';
import { VideoTestimonialCSVUploader } from './VideoTestimonialCSVUploader';

interface VideoTestimonial {
  id: string;
  client_name: string;
  profession?: string;
  location?: string;
  state?: string;
  youtube_url?: string;
  instagram_url?: string;
  testimonial_text: string;
  specialty?: string;
  ai_keywords?: any;
  ai_extracted_benefits?: any;
  sentiment_score?: number;
  approved: boolean;
  display_order?: number;
}

interface VideoTestimonialsSectionProps {
  landingPageId: string;
}

export default function VideoTestimonialsSection({ landingPageId }: VideoTestimonialsSectionProps) {
  const [testimonials, setTestimonials] = useState<VideoTestimonial[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<VideoTestimonial | null>(null);
  const [formData, setFormData] = useState({
    client_name: '',
    profession: '',
    location: '',
    state: '',
    youtube_url: '',
    instagram_url: '',
    testimonial_text: '',
    specialty: ''
  });

  const specialties = [
    'implantodontia',
    'ortodontia', 
    'endodontia',
    'periodontia',
    'prótese',
    'cirurgia',
    'estética',
    'odontopediatria'
  ];

  const states = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 
    'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ];

  useEffect(() => {
    loadTestimonials();
  }, [landingPageId]);

  const loadTestimonials = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('video_testimonials')
        .select('*')
        .eq('landing_page_id', landingPageId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setTestimonials(data || []);
    } catch (error) {
      console.error('Error loading testimonials:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar depoimentos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const processWithAI = async (testimonial: VideoTestimonial) => {
    try {
      setAiProcessing(true);
      
      const { data, error } = await supabase.functions.invoke('ai-seo-generator', {
        body: {
          type: 'video_testimonial_analysis',
          content: testimonial.testimonial_text,
          context: {
            client_name: testimonial.client_name,
            profession: testimonial.profession,
            location: testimonial.location,
            specialty: testimonial.specialty
          }
        }
      });

      if (error) throw error;

      // Update testimonial with AI-generated data
      const { error: updateError } = await supabase
        .from('video_testimonials')
        .update({
          ai_keywords: data.keywords || [],
          ai_extracted_benefits: data.benefits || [],
          sentiment_score: data.sentiment_score || 0.8
        })
        .eq('id', testimonial.id);

      if (updateError) throw updateError;

      toast({
        title: "IA Processada",
        description: "Depoimento analisado e enriquecido com IA",
      });
      
      loadTestimonials();
    } catch (error) {
      console.error('Error processing with AI:', error);
      toast({
        title: "Erro na IA",
        description: "Falha ao processar com IA",
        variant: "destructive",
      });
    } finally {
      setAiProcessing(false);
    }
  };

  const saveTestimonial = async () => {
    try {
      setLoading(true);
      
      const testimonialData = {
        ...formData,
        landing_page_id: landingPageId,
        approved: true,
        display_order: testimonials.length + 1
      };

      if (editingTestimonial) {
        const { error } = await supabase
          .from('video_testimonials')
          .update(testimonialData)
          .eq('id', editingTestimonial.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('video_testimonials')
          .insert([testimonialData]);
        
        if (error) throw error;
      }

      toast({
        title: "Sucesso",
        description: editingTestimonial ? "Depoimento atualizado" : "Depoimento adicionado",
      });
      
      setIsDialogOpen(false);
      resetForm();
      loadTestimonials();
    } catch (error) {
      console.error('Error saving testimonial:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar depoimento",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteTestimonial = async (id: string) => {
    try {
      const { error } = await supabase
        .from('video_testimonials')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Depoimento removido",
      });
      
      loadTestimonials();
    } catch (error) {
      console.error('Error deleting testimonial:', error);
      toast({
        title: "Erro",
        description: "Falha ao remover depoimento",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      client_name: '',
      profession: '',
      location: '',
      state: '',
      youtube_url: '',
      instagram_url: '',
      testimonial_text: '',
      specialty: ''
    });
    setEditingTestimonial(null);
  };

  const openEditDialog = (testimonial: VideoTestimonial) => {
    setFormData({
      client_name: testimonial.client_name,
      profession: testimonial.profession || '',
      location: testimonial.location || '',
      state: testimonial.state || '',
      youtube_url: testimonial.youtube_url || '',
      instagram_url: testimonial.instagram_url || '',
      testimonial_text: testimonial.testimonial_text,
      specialty: testimonial.specialty || ''
    });
    setEditingTestimonial(testimonial);
    setIsDialogOpen(true);
  };

  const getVideoId = (url: string) => {
    if (url.includes('youtube.com/shorts/')) {
      return url.split('/shorts/')[1]?.split('?')[0];
    }
    if (url.includes('youtu.be/')) {
      return url.split('youtu.be/')[1]?.split('?')[0];
    }
    if (url.includes('watch?v=')) {
      return url.split('watch?v=')[1]?.split('&')[0];
    }
    return null;
  };

  return (
    <Card className="border-l-4 border-l-blue-500/50 bg-gradient-to-r from-blue-50/30 to-background dark:from-blue-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <VideoIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold text-foreground">
                📺 Depoimentos em Vídeo
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Gerencie depoimentos do YouTube e Instagram para maximizar o SEO local
              </p>
            </div>
          </div>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
            {testimonials.length} depoimentos
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="manual" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">✏️ Manual</TabsTrigger>
            <TabsTrigger value="import">📥 Importação</TabsTrigger>
          </TabsList>
          
          <TabsContent value="manual" className="space-y-4">
            <div className="flex justify-end items-center">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Depoimento
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingTestimonial ? 'Editar' : 'Adicionar'} Depoimento
                  </DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder="Nome do cliente"
                    value={formData.client_name}
                    onChange={(e) => setFormData({...formData, client_name: e.target.value})}
                  />
                  <Input
                    placeholder="Profissão"
                    value={formData.profession}
                    onChange={(e) => setFormData({...formData, profession: e.target.value})}
                  />
                  <Input
                    placeholder="Cidade"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                  />
                  <Select value={formData.state} onValueChange={(value) => setFormData({...formData, state: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {states.map(state => (
                        <SelectItem key={state} value={state}>{state}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={formData.specialty} onValueChange={(value) => setFormData({...formData, specialty: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Especialidade" />
                    </SelectTrigger>
                    <SelectContent>
                      {specialties.map(specialty => (
                        <SelectItem key={specialty} value={specialty}>
                          {specialty.charAt(0).toUpperCase() + specialty.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="URL do YouTube"
                    value={formData.youtube_url}
                    onChange={(e) => setFormData({...formData, youtube_url: e.target.value})}
                  />
                  <Input
                    placeholder="URL do Instagram"
                    value={formData.instagram_url}
                    onChange={(e) => setFormData({...formData, instagram_url: e.target.value})}
                  />
                </div>
                <Textarea
                  placeholder="Texto do depoimento..."
                  value={formData.testimonial_text}
                  onChange={(e) => setFormData({...formData, testimonial_text: e.target.value})}
                  rows={4}
                  className="col-span-2"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={saveTestimonial} disabled={loading}>
                    {loading ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            </div>

            {loading ? (
              <div className="text-center py-8">Carregando depoimentos...</div>
            ) : testimonials.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum depoimento cadastrado ainda
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-2">
                {testimonials.map((testimonial) => (
                  <div key={testimonial.id} className="border rounded-lg p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm truncate">{testimonial.client_name}</h4>
                          {testimonial.profession && (
                            <>
                              <span className="text-xs text-muted-foreground">•</span>
                              <span className="text-xs text-muted-foreground truncate">{testimonial.profession}</span>
                            </>
                          )}
                          {testimonial.location && (
                            <>
                              <span className="text-xs text-muted-foreground">•</span>
                              <span className="text-xs text-muted-foreground truncate">
                                {testimonial.location}, {testimonial.state}
                              </span>
                            </>
                          )}
                          {testimonial.sentiment_score && (
                            <>
                              <span className="text-xs text-muted-foreground">•</span>
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                {(testimonial.sentiment_score * 100).toFixed(0)}%
                              </span>
                            </>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {testimonial.testimonial_text}
                        </p>
                        <div className="flex gap-1 flex-wrap">
                          {testimonial.youtube_url && (
                            <a
                              href={testimonial.youtube_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
                            >
                              <Youtube className="h-3 w-3" />
                              YouTube
                            </a>
                          )}
                          {testimonial.instagram_url && (
                            <a
                              href={testimonial.instagram_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-pink-600 hover:text-pink-700 ml-2"
                            >
                              <Instagram className="h-3 w-3" />
                              Instagram
                            </a>
                          )}
                          {testimonial.specialty && (
                            <Badge variant="secondary" className="text-xs h-5 ml-2">
                              {testimonial.specialty}
                            </Badge>
                          )}
                          {Array.isArray(testimonial.ai_keywords) && testimonial.ai_keywords.slice(0, 2).map((keyword: string, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-xs h-5 ml-1">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => processWithAI(testimonial)}
                          disabled={aiProcessing}
                          className="h-7 px-2"
                        >
                          <Wand2 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(testimonial)}
                          className="h-7 px-2"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteTestimonial(testimonial.id)}
                          className="h-7 px-2"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="import">
            <VideoTestimonialCSVUploader 
              landingPageId={landingPageId}
              onTestimonialsUpdate={loadTestimonials}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}