import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Edit, Check, X, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface KOL {
  id: string;
  full_name: string;
  photo_url?: string;
  mini_cv?: string;
  lattes_url?: string;
  website_url?: string;
  instagram_url?: string;
  youtube_url?: string;
  specialty?: string;
  approved: boolean;
  display_order?: number;
  created_at: string;
  updated_at: string;
}

export const KOLManager = () => {
  const [kols, setKols] = useState<KOL[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingKOL, setEditingKOL] = useState<KOL | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    photo_url: '',
    mini_cv: '',
    lattes_url: '',
    website_url: '',
    instagram_url: '',
    youtube_url: '',
    specialty: '',
    approved: true,
    display_order: 0
  });

  useEffect(() => {
    loadKOLs();
  }, []);

  const loadKOLs = async () => {
    try {
      const { data, error } = await supabase
        .from('key_opinion_leaders')
        .select('*')
        .order('display_order', { ascending: true, nullsFirst: false })
        .order('full_name', { ascending: true });

      if (error) throw error;
      setKols(data || []);
    } catch (error) {
      console.error('Error loading KOLs:', error);
      toast.error('Erro ao carregar especialistas');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      photo_url: '',
      mini_cv: '',
      lattes_url: '',
      website_url: '',
      instagram_url: '',
      youtube_url: '',
      specialty: '',
      approved: true,
      display_order: 0
    });
    setEditingKOL(null);
  };

  const openEditDialog = (kol: KOL) => {
    setEditingKOL(kol);
    setFormData({
      full_name: kol.full_name,
      photo_url: kol.photo_url || '',
      mini_cv: kol.mini_cv || '',
      lattes_url: kol.lattes_url || '',
      website_url: kol.website_url || '',
      instagram_url: kol.instagram_url || '',
      youtube_url: kol.youtube_url || '',
      specialty: kol.specialty || '',
      approved: kol.approved,
      display_order: kol.display_order || 0
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (!formData.full_name.trim()) {
        toast.error('Nome completo é obrigatório');
        return;
      }

      if (editingKOL) {
        const { error } = await supabase
          .from('key_opinion_leaders')
          .update(formData)
          .eq('id', editingKOL.id);

        if (error) throw error;
        toast.success('Especialista atualizado com sucesso');
      } else {
        const { error } = await supabase
          .from('key_opinion_leaders')
          .insert([formData]);

        if (error) throw error;
        toast.success('Especialista criado com sucesso');
      }

      setIsDialogOpen(false);
      resetForm();
      loadKOLs();
    } catch (error) {
      console.error('Error saving KOL:', error);
      toast.error('Erro ao salvar especialista');
    }
  };

  const toggleApproval = async (kolId: string, currentApproval: boolean) => {
    try {
      const { error } = await supabase
        .from('key_opinion_leaders')
        .update({ approved: !currentApproval })
        .eq('id', kolId);

      if (error) throw error;
      
      toast.success(`Especialista ${!currentApproval ? 'aprovado' : 'desaprovado'} com sucesso`);
      loadKOLs();
    } catch (error) {
      console.error('Error toggling approval:', error);
      toast.error('Erro ao alterar aprovação');
    }
  };

  const deleteKOL = async (kolId: string) => {
    try {
      const { error } = await supabase
        .from('key_opinion_leaders')
        .delete()
        .eq('id', kolId);

      if (error) throw error;
      
      toast.success('Especialista removido com sucesso');
      loadKOLs();
    } catch (error) {
      console.error('Error deleting KOL:', error);
      toast.error('Erro ao remover especialista');
    }
  };

  if (loading) {
    return <div className="p-4">Carregando especialistas...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Key Opinion Leaders</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Especialista
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingKOL ? 'Editar Especialista' : 'Adicionar Especialista'}
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nome Completo *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Dr. João Silva"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="specialty">Especialidade</Label>
                <Input
                  id="specialty"
                  value={formData.specialty}
                  onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                  placeholder="Ortodontia"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="photo_url">URL da Foto</Label>
                <Input
                  id="photo_url"
                  value={formData.photo_url}
                  onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                  placeholder="https://exemplo.com/foto.jpg"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="mini_cv">Mini Currículo</Label>
                <Textarea
                  id="mini_cv"
                  value={formData.mini_cv}
                  onChange={(e) => setFormData({ ...formData, mini_cv: e.target.value })}
                  placeholder="Breve descrição da experiência e qualificações..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lattes_url">Currículo Lattes</Label>
                <Input
                  id="lattes_url"
                  value={formData.lattes_url}
                  onChange={(e) => setFormData({ ...formData, lattes_url: e.target.value })}
                  placeholder="http://lattes.cnpq.br/..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website_url">Website</Label>
                <Input
                  id="website_url"
                  value={formData.website_url}
                  onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                  placeholder="https://www.site.com.br"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram_url">Instagram</Label>
                <Input
                  id="instagram_url"
                  value={formData.instagram_url}
                  onChange={(e) => setFormData({ ...formData, instagram_url: e.target.value })}
                  placeholder="https://instagram.com/usuario"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="youtube_url">YouTube</Label>
                <Input
                  id="youtube_url"
                  value={formData.youtube_url}
                  onChange={(e) => setFormData({ ...formData, youtube_url: e.target.value })}
                  placeholder="https://youtube.com/canal"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="display_order">Ordem de Exibição</Label>
                <Input
                  id="display_order"
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                {editingKOL ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {kols.map((kol) => (
          <Card key={kol.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-start space-x-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={kol.photo_url} alt={kol.full_name} />
                  <AvatarFallback>{kol.full_name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <CardTitle className="text-base">{kol.full_name}</CardTitle>
                  {kol.specialty && (
                    <p className="text-sm text-muted-foreground">{kol.specialty}</p>
                  )}
                </div>
                <div className="flex items-center space-x-1">
                  <Badge variant={kol.approved ? "default" : "secondary"}>
                    {kol.approved ? "Aprovado" : "Pendente"}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {kol.mini_cv && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {kol.mini_cv}
                </p>
              )}
              
              <div className="flex flex-wrap gap-2 mb-3">
                {kol.lattes_url && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={kol.lattes_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Lattes
                    </a>
                  </Button>
                )}
                {kol.website_url && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={kol.website_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Site
                    </a>
                  </Button>
                )}
                {kol.instagram_url && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={kol.instagram_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      IG
                    </a>
                  </Button>
                )}
                {kol.youtube_url && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={kol.youtube_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      YT
                    </a>
                  </Button>
                )}
              </div>

              <div className="flex justify-between items-center">
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEditDialog(kol)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleApproval(kol.id, kol.approved)}
                  >
                    {kol.approved ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                  </Button>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    if (confirm('Tem certeza que deseja remover este especialista?')) {
                      deleteKOL(kol.id);
                    }
                  }}
                >
                  Remover
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {kols.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Nenhum especialista cadastrado ainda.</p>
          <p className="text-sm text-muted-foreground">
            Clique no botão "Adicionar Especialista" para começar.
          </p>
        </div>
      )}
    </div>
  );
};