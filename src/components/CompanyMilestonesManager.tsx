import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Plus, Trash2, Edit, Calendar, MapPin, Users, Cpu, Award, 
  Image, Video, Copy, Loader2, History, Building2, ChevronRight,
  Clock, CheckCircle2, AlertCircle
} from "lucide-react";
import { 
  Milestone, 
  generateMilestoneSlug, 
  generateMilestoneEventSchema,
  formatMilestoneDisplayDate 
} from "@/lib/milestone-schema-helper";

interface KeyPerson {
  name: string;
  role: string;
}

const CompanyMilestonesManager: React.FC = () => {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  // Estado do formulário
  const [formData, setFormData] = useState<Partial<Milestone>>({
    year: new Date().getFullYear(),
    month: undefined,
    day: undefined,
    slug: '',
    title: '',
    description: '',
    market_context: '',
    strategic_decision: '',
    impact: '',
    legacy: '',
    location: { city: '', state: '', country: 'Brasil' },
    key_people: [],
    products_involved: [],
    technologies: [],
    certifications: [],
    image_url: '',
    video_url: '',
    is_published: true
  });

  useEffect(() => {
    loadMilestones();
  }, []);

  const loadMilestones = async () => {
    try {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;

      const { data, error } = await supabase
        .from('company_milestones')
        .select('*')
        .order('year', { ascending: true });

      if (error) throw error;
      
      // Cast the data to Milestone type
      const typedMilestones = (data || []).map(item => ({
        ...item,
        location: item.location as Milestone['location'],
        key_people: item.key_people as Milestone['key_people'],
        products_involved: item.products_involved as Milestone['products_involved'],
        technologies: item.technologies as Milestone['technologies'],
        certifications: item.certifications as Milestone['certifications']
      })) as Milestone[];
      
      setMilestones(typedMilestones);
    } catch (error) {
      console.error('Erro ao carregar marcos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os marcos históricos.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      year: new Date().getFullYear(),
      month: undefined,
      day: undefined,
      slug: '',
      title: '',
      description: '',
      market_context: '',
      strategic_decision: '',
      impact: '',
      legacy: '',
      location: { city: '', state: '', country: 'Brasil' },
      key_people: [],
      products_involved: [],
      technologies: [],
      certifications: [],
      image_url: '',
      video_url: '',
      is_published: true
    });
    setEditingMilestone(null);
  };

  const openNewMilestone = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditMilestone = (milestone: Milestone) => {
    setEditingMilestone(milestone);
    setFormData({
      ...milestone,
      location: milestone.location || { city: '', state: '', country: 'Brasil' },
      key_people: milestone.key_people || [],
      products_involved: milestone.products_involved || [],
      technologies: milestone.technologies || [],
      certifications: milestone.certifications || []
    });
    setIsDialogOpen(true);
  };

  const handleTitleChange = (title: string) => {
    const year = formData.year || new Date().getFullYear();
    setFormData(prev => ({
      ...prev,
      title,
      slug: generateMilestoneSlug(year, title)
    }));
  };

  const handleYearChange = (year: number) => {
    setFormData(prev => ({
      ...prev,
      year,
      slug: prev.title ? generateMilestoneSlug(year, prev.title) : ''
    }));
  };

  const saveMilestone = async () => {
    if (!formData.title || !formData.year) {
      toast({
        title: "Campos obrigatórios",
        description: "Título e ano são obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    try {
      setSaving(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error('Usuário não autenticado');

      const milestoneData = {
        user_id: userData.user.id,
        year: formData.year,
        month: formData.month || null,
        day: formData.day || null,
        slug: formData.slug || generateMilestoneSlug(formData.year, formData.title!),
        title: formData.title,
        description: formData.description || null,
        market_context: formData.market_context || null,
        strategic_decision: formData.strategic_decision || null,
        impact: formData.impact || null,
        legacy: formData.legacy || null,
        location: formData.location,
        key_people: formData.key_people,
        products_involved: formData.products_involved,
        technologies: formData.technologies,
        certifications: formData.certifications,
        image_url: formData.image_url || null,
        video_url: formData.video_url || null,
        is_published: formData.is_published ?? true
      };

      if (editingMilestone?.id) {
        // Update existing
        const { error } = await supabase
          .from('company_milestones')
          .update(milestoneData)
          .eq('id', editingMilestone.id);

        if (error) throw error;
        toast({ title: "Marco atualizado com sucesso!" });
      } else {
        // Insert new
        const { error } = await supabase
          .from('company_milestones')
          .insert(milestoneData);

        if (error) throw error;
        toast({ title: "Marco criado com sucesso!" });
      }

      setIsDialogOpen(false);
      resetForm();
      loadMilestones();
    } catch (error: any) {
      console.error('Erro ao salvar marco:', error);
      toast({
        title: "Erro ao salvar",
        description: error.message || "Não foi possível salvar o marco.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteMilestone = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este marco?')) return;

    try {
      const { error } = await supabase
        .from('company_milestones')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({ title: "Marco excluído com sucesso!" });
      loadMilestones();
    } catch (error) {
      console.error('Erro ao excluir marco:', error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o marco.",
        variant: "destructive"
      });
    }
  };

  const copySchemaToClipboard = (milestone: Milestone) => {
    const schema = generateMilestoneEventSchema(milestone);
    navigator.clipboard.writeText(JSON.stringify(schema, null, 2));
    toast({ title: "Schema JSON-LD copiado!" });
  };

  // Gerenciamento de pessoas-chave
  const addKeyPerson = () => {
    setFormData(prev => ({
      ...prev,
      key_people: [...(prev.key_people || []), { name: '', role: '' }]
    }));
  };

  const updateKeyPerson = (index: number, field: keyof KeyPerson, value: string) => {
    setFormData(prev => ({
      ...prev,
      key_people: prev.key_people?.map((person, i) => 
        i === index ? { ...person, [field]: value } : person
      )
    }));
  };

  const removeKeyPerson = (index: number) => {
    setFormData(prev => ({
      ...prev,
      key_people: prev.key_people?.filter((_, i) => i !== index)
    }));
  };

  // Gerenciamento de arrays de strings (produtos, tecnologias, certificações)
  const handleArrayInput = (field: 'products_involved' | 'technologies' | 'certifications', value: string) => {
    const items = value.split(',').map(item => item.trim()).filter(Boolean);
    setFormData(prev => ({ ...prev, [field]: items }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Carregando marcos históricos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <History className="h-5 w-5" />
            Marcos Históricos
          </h3>
          <p className="text-sm text-muted-foreground">
            Gerencie a linha do tempo da empresa para SEO e IA
          </p>
        </div>
        <Button onClick={openNewMilestone}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Marco
        </Button>
      </div>

      {/* Timeline Visual */}
      {milestones.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Calendar className="h-12 w-12 opacity-50" />
            <p>Nenhum marco histórico cadastrado</p>
            <Button variant="outline" onClick={openNewMilestone}>
              <Plus className="h-4 w-4 mr-2" />
              Criar primeiro marco
            </Button>
          </div>
        </Card>
      ) : (
        <div className="relative">
          {/* Linha vertical da timeline */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border" />
          
          <div className="space-y-6">
            {milestones.map((milestone, index) => (
              <div key={milestone.id} className="relative flex gap-4">
                {/* Ponto da timeline */}
                <div className="relative z-10 flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground font-bold text-lg shadow-lg">
                  {milestone.year}
                </div>
                
                {/* Card do marco */}
                <Card className="flex-1 hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-lg">{milestone.title}</h4>
                          {milestone.is_published ? (
                            <Badge variant="default" className="text-xs">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Publicado
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Rascunho
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatMilestoneDisplayDate(milestone)}
                          </span>
                          {milestone.location?.city && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {milestone.location.city}, {milestone.location.state}
                            </span>
                          )}
                        </div>
                        
                        {milestone.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {milestone.description}
                          </p>
                        )}
                        
                        {/* Tags de tecnologias/produtos */}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {milestone.technologies?.slice(0, 3).map((tech, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              <Cpu className="h-2 w-2 mr-1" />
                              {tech}
                            </Badge>
                          ))}
                          {(milestone.technologies?.length || 0) > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{(milestone.technologies?.length || 0) - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Ações */}
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => copySchemaToClipboard(milestone)}
                          title="Copiar Schema JSON-LD"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => openEditMilestone(milestone)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => deleteMilestone(milestone.id!)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de Edição */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              {editingMilestone ? 'Editar Marco Histórico' : 'Novo Marco Histórico'}
            </DialogTitle>
            <DialogDescription>
              Preencha as informações do marco para construir a linha do tempo da empresa
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh] pr-4">
            <Accordion type="multiple" defaultValue={["temporal", "editorial"]} className="space-y-2">
              {/* Seção 1: Dados Temporais */}
              <AccordionItem value="temporal">
                <AccordionTrigger className="text-sm font-medium">
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Dados Temporais
                  </span>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label>Ano *</Label>
                      <Input
                        type="number"
                        min="1900"
                        max="2100"
                        value={formData.year || ''}
                        onChange={(e) => handleYearChange(parseInt(e.target.value))}
                        placeholder="2009"
                      />
                    </div>
                    <div>
                      <Label>Mês</Label>
                      <Input
                        type="number"
                        min="1"
                        max="12"
                        value={formData.month || ''}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          month: e.target.value ? parseInt(e.target.value) : undefined 
                        }))}
                        placeholder="3"
                      />
                    </div>
                    <div>
                      <Label>Dia</Label>
                      <Input
                        type="number"
                        min="1"
                        max="31"
                        value={formData.day || ''}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          day: e.target.value ? parseInt(e.target.value) : undefined 
                        }))}
                        placeholder="15"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Slug (URL)</Label>
                    <Input
                      value={formData.slug || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                      placeholder="2009-fundacao-smart-dent"
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Gerado automaticamente a partir do ano e título
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Seção 2: Conteúdo Editorial */}
              <AccordionItem value="editorial">
                <AccordionTrigger className="text-sm font-medium">
                  <span className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Conteúdo Editorial
                  </span>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <div>
                    <Label>Título do Marco *</Label>
                    <Input
                      value={formData.title || ''}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      placeholder="Fundação da Smart Dent Brasil"
                    />
                  </div>
                  <div>
                    <Label>Descrição</Label>
                    <Textarea
                      value={formData.description || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Resumo do marco histórico..."
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label>Contexto de Mercado</Label>
                    <Textarea
                      value={formData.market_context || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, market_context: e.target.value }))}
                      placeholder="Como estava o mercado na época deste marco..."
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label>Decisão Estratégica</Label>
                    <Textarea
                      value={formData.strategic_decision || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, strategic_decision: e.target.value }))}
                      placeholder="Qual foi a decisão tomada e por quê..."
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label>Impacto</Label>
                    <Textarea
                      value={formData.impact || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, impact: e.target.value }))}
                      placeholder="Qual foi o impacto desta decisão..."
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label>Legado Atual</Label>
                    <Textarea
                      value={formData.legacy || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, legacy: e.target.value }))}
                      placeholder="Como este marco influencia a empresa hoje..."
                      rows={2}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Seção 3: Dados Técnicos */}
              <AccordionItem value="technical">
                <AccordionTrigger className="text-sm font-medium">
                  <span className="flex items-center gap-2">
                    <Cpu className="h-4 w-4" />
                    Dados Técnicos
                  </span>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label>Cidade</Label>
                      <Input
                        value={formData.location?.city || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          location: { ...prev.location!, city: e.target.value }
                        }))}
                        placeholder="São Carlos"
                      />
                    </div>
                    <div>
                      <Label>Estado</Label>
                      <Input
                        value={formData.location?.state || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          location: { ...prev.location!, state: e.target.value }
                        }))}
                        placeholder="SP"
                      />
                    </div>
                    <div>
                      <Label>País</Label>
                      <Input
                        value={formData.location?.country || 'Brasil'}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          location: { ...prev.location!, country: e.target.value }
                        }))}
                        placeholder="Brasil"
                      />
                    </div>
                  </div>

                  {/* Pessoas-chave */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Pessoas-chave</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addKeyPerson}>
                        <Plus className="h-3 w-3 mr-1" />
                        Adicionar
                      </Button>
                    </div>
                    {formData.key_people?.map((person, index) => (
                      <div key={index} className="flex gap-2 mb-2">
                        <Input
                          value={person.name}
                          onChange={(e) => updateKeyPerson(index, 'name', e.target.value)}
                          placeholder="Nome"
                          className="flex-1"
                        />
                        <Input
                          value={person.role}
                          onChange={(e) => updateKeyPerson(index, 'role', e.target.value)}
                          placeholder="Cargo/Função"
                          className="flex-1"
                        />
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon"
                          onClick={() => removeKeyPerson(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div>
                    <Label>Produtos Envolvidos</Label>
                    <Input
                      value={formData.products_involved?.join(', ') || ''}
                      onChange={(e) => handleArrayInput('products_involved', e.target.value)}
                      placeholder="Scanner 3D, Impressora, Software CAD (separados por vírgula)"
                    />
                  </div>

                  <div>
                    <Label>Tecnologias</Label>
                    <Input
                      value={formData.technologies?.join(', ') || ''}
                      onChange={(e) => handleArrayInput('technologies', e.target.value)}
                      placeholder="CAD/CAM, Impressão 3D, IA (separadas por vírgula)"
                    />
                  </div>

                  <div>
                    <Label>Certificações</Label>
                    <Input
                      value={formData.certifications?.join(', ') || ''}
                      onChange={(e) => handleArrayInput('certifications', e.target.value)}
                      placeholder="ISO 13485, ANVISA, FDA (separadas por vírgula)"
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Seção 4: Mídia */}
              <AccordionItem value="media">
                <AccordionTrigger className="text-sm font-medium">
                  <span className="flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    Mídia
                  </span>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <div>
                    <Label>URL da Imagem</Label>
                    <Input
                      value={formData.image_url || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <Label>URL do Vídeo</Label>
                    <Input
                      value={formData.video_url || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, video_url: e.target.value }))}
                      placeholder="https://youtube.com/..."
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Checkbox publicado */}
            <div className="flex items-center space-x-2 mt-4 pt-4 border-t">
              <Checkbox
                id="is_published"
                checked={formData.is_published}
                onCheckedChange={(checked) => setFormData(prev => ({ 
                  ...prev, 
                  is_published: checked as boolean 
                }))}
              />
              <Label htmlFor="is_published" className="text-sm">
                Publicar marco (visível publicamente)
              </Label>
            </div>
          </ScrollArea>

          {/* Footer com botões */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveMilestone} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {editingMilestone ? 'Atualizar Marco' : 'Criar Marco'}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CompanyMilestonesManager;
