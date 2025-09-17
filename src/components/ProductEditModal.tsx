import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TagInput } from "@/components/ui/tag-input";
import { Badge } from "@/components/ui/badge";
import { ImageUploader } from "@/components/ImageUploader";
import { Save, Trash2, Plus, X, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Product {
  id: string;
  name: string;
  description?: string;
  price?: number;
  currency?: string;
  category?: string;
  subcategory?: string;
  image_url?: string;
  product_url?: string;
  youtube_url?: string;
  target_audience?: string;
  use_in_ai_generation: boolean;
  approved: boolean;
  keywords?: string[];
  benefits?: string[];
  features?: string[];
}

interface ProductEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product | null;
  onSave: (product: Product) => void;
  onDelete?: (productId: string) => void;
}

export function ProductEditModal({ isOpen, onClose, product, onSave, onDelete }: ProductEditModalProps) {
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    description: '',
    price: 0,
    currency: 'BRL',
    category: '',
    subcategory: '',
    image_url: '',
    product_url: '',
    youtube_url: '',
    target_audience: '',
    use_in_ai_generation: true,
    approved: true,
    keywords: [],
    benefits: [],
    features: []
  });
  const [benefits, setBenefits] = useState<string[]>([]);
  const [features, setFeatures] = useState<string[]>([]);
  const [newBenefit, setNewBenefit] = useState('');
  const [newFeature, setNewFeature] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [generatingKeywords, setGeneratingKeywords] = useState(false);
  const { toast } = useToast();

  const isEditing = !!product;

  useEffect(() => {
    if (product) {
      setFormData({
        ...product,
        keywords: product.keywords || [],
        benefits: product.benefits || [],
        features: product.features || []
      });
      setBenefits(product.benefits || []);
      setFeatures(product.features || []);
    } else {
      setFormData({
        name: '',
        description: '',
        price: 0,
        currency: 'BRL',
        category: '',
        subcategory: '',
        image_url: '',
        product_url: '',
        youtube_url: '',
        target_audience: '',
        use_in_ai_generation: true,
        approved: true,
        keywords: [],
        benefits: [],
        features: []
      });
      setBenefits([]);
      setFeatures([]);
    }
  }, [product]);

  const handleImageUploaded = (imageUrl: string) => {
    setFormData(prev => ({ ...prev, image_url: imageUrl }));
  };

  const addBenefit = () => {
    if (newBenefit.trim()) {
      const updatedBenefits = [...benefits, newBenefit.trim()];
      setBenefits(updatedBenefits);
      setFormData(prev => ({ ...prev, benefits: updatedBenefits }));
      setNewBenefit('');
    }
  };

  const removeBenefit = (index: number) => {
    const updatedBenefits = benefits.filter((_, i) => i !== index);
    setBenefits(updatedBenefits);
    setFormData(prev => ({ ...prev, benefits: updatedBenefits }));
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      const updatedFeatures = [...features, newFeature.trim()];
      setFeatures(updatedFeatures);
      setFormData(prev => ({ ...prev, features: updatedFeatures }));
      setNewFeature('');
    }
  };

  const removeFeature = (index: number) => {
    const updatedFeatures = features.filter((_, i) => i !== index);
    setFeatures(updatedFeatures);
    setFormData(prev => ({ ...prev, features: updatedFeatures }));
  };

  const generateKeywordsWithAI = async () => {
    // Check if we have enough content to generate keywords
    const hasContent = formData.description?.trim() || 
                      benefits.length > 0 || 
                      features.length > 0 || 
                      formData.name?.trim();

    if (!hasContent) {
      toast({
        title: "Erro",
        description: "Adicione pelo menos nome, descrição, benefícios ou recursos para gerar keywords",
        variant: "destructive"
      });
      return;
    }

    setGeneratingKeywords(true);
    try {
      // Prepare content for AI
      const contentParts = [];
      
      if (formData.name?.trim()) {
        contentParts.push(`Produto: ${formData.name}`);
      }
      
      if (formData.description?.trim()) {
        contentParts.push(`Descrição: ${formData.description}`);
      }
      
      if (benefits.length > 0) {
        contentParts.push(`Benefícios: ${benefits.join(', ')}`);
      }
      
      if (features.length > 0) {
        contentParts.push(`Recursos: ${features.join(', ')}`);
      }

      const content = contentParts.join('\n\n');

      const { data, error } = await supabase.functions.invoke('ai-seo-generator', {
        body: {
          type: 'keywords',
          content: content
        }
      });

      if (error) throw error;

      if (data?.success && data?.content) {
        // Parse the keywords response
        let newKeywords: string[] = [];
        
        if (typeof data.content === 'object') {
          // Combine all keyword types
          const keywordData = data.content;
          newKeywords = [
            ...(keywordData.primary || []),
            ...(keywordData.secondary || []),
            ...(keywordData.lsi || []),
            ...(keywordData.long_tail || [])
          ];
        } else if (Array.isArray(data.content)) {
          newKeywords = data.content;
        }

        // Filter out duplicates and merge with existing keywords
        const existingKeywords = formData.keywords || [];
        const uniqueNewKeywords = newKeywords.filter(
          keyword => !existingKeywords.includes(keyword)
        );

        const updatedKeywords = [...existingKeywords, ...uniqueNewKeywords];
        setFormData(prev => ({ ...prev, keywords: updatedKeywords }));

        toast({
          title: "Sucesso",
          description: `${uniqueNewKeywords.length} novas keywords geradas com IA!`
        });
      } else {
        throw new Error('Resposta inválida da IA');
      }
    } catch (error) {
      console.error('Error generating keywords:', error);
      toast({
        title: "Erro",
        description: "Erro ao gerar keywords com IA. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setGeneratingKeywords(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name?.trim()) {
      toast({
        title: "Erro",
        description: "Nome do produto é obrigatório",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const dataToSave = {
        name: formData.name!,
        description: formData.description,
        price: formData.price,
        currency: formData.currency,
        category: formData.category,
        subcategory: formData.subcategory,
        image_url: formData.image_url,
        product_url: formData.product_url,
        youtube_url: formData.youtube_url,
        target_audience: formData.target_audience,
        use_in_ai_generation: formData.use_in_ai_generation,
        approved: formData.approved,
        keywords: formData.keywords || [],
        benefits: benefits,
        features: features,
        source_type: 'manual',
        updated_at: new Date().toISOString()
      };

      let result;
      if (isEditing) {
        result = await supabase
          .from('products_repository')
          .update(dataToSave)
          .eq('id', product.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from('products_repository')
          .insert(dataToSave)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      onSave(result.data);
      onClose();
      
      toast({
        title: "Sucesso",
        description: `Produto ${isEditing ? 'atualizado' : 'criado'} com sucesso!`
      });
    } catch (error) {
      console.error('Error saving product:', error);
      toast({
        title: "Erro",
        description: `Erro ao ${isEditing ? 'atualizar' : 'criar'} produto`,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!product || !onDelete) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('products_repository')
        .delete()
        .eq('id', product.id);

      if (error) throw error;

      onDelete(product.id);
      onClose();
      
      toast({
        title: "Sucesso",
        description: "Produto excluído com sucesso!"
      });
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir produto",
        variant: "destructive"
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Produto' : 'Adicionar Produto'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Produto *</Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome do produto"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Input
                id="category"
                value={formData.category || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                placeholder="Categoria"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descrição do produto"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Preço</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Moeda</Label>
              <Select value={formData.currency} onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRL">BRL</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subcategory">Subcategoria</Label>
              <Input
                id="subcategory"
                value={formData.subcategory || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, subcategory: e.target.value }))}
                placeholder="Subcategoria"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Imagem do Produto</Label>
            <div className="flex gap-2">
              <Input
                type="url"
                value={formData.image_url || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                placeholder="URL da imagem do produto"
                className="flex-1"
              />
              {formData.image_url && (
                <div className="w-12 h-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
                  <img 
                    src={formData.image_url} 
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="product_url">URL do Produto</Label>
              <Input
                id="product_url"
                type="url"
                value={formData.product_url || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, product_url: e.target.value }))}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="youtube_url">URL do YouTube</Label>
              <Input
                id="youtube_url"
                type="url"
                value={formData.youtube_url || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, youtube_url: e.target.value }))}
                placeholder="https://youtube.com/..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="target_audience">Público-Alvo</Label>
            <Input
              id="target_audience"
              value={formData.target_audience || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, target_audience: e.target.value }))}
              placeholder="Descreva o público-alvo"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Keywords</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={generateKeywordsWithAI}
                disabled={generatingKeywords}
                className="gap-2"
              >
                {generatingKeywords ? (
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                Gerar com IA
              </Button>
            </div>
            <TagInput
              value={formData.keywords || []}
              onChange={(keywords) => setFormData(prev => ({ ...prev, keywords }))}
              placeholder="Adicione keywords"
            />
          </div>

          <div className="space-y-2">
            <Label>Benefícios</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newBenefit}
                onChange={(e) => setNewBenefit(e.target.value)}
                placeholder="Adicionar benefício"
                onKeyPress={(e) => e.key === 'Enter' && addBenefit()}
              />
              <Button onClick={addBenefit} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {benefits.map((benefit, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {benefit}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => removeBenefit(index)} />
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Recursos</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                placeholder="Adicionar recurso"
                onKeyPress={(e) => e.key === 'Enter' && addFeature()}
              />
              <Button onClick={addFeature} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {features.map((feature, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {feature}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => removeFeature(index)} />
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                id="use_in_ai"
                checked={formData.use_in_ai_generation}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, use_in_ai_generation: checked }))}
              />
              <Label htmlFor="use_in_ai">Usar na geração de IA</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="approved"
                checked={formData.approved}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, approved: checked }))}
              />
              <Label htmlFor="approved">Aprovado</Label>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <div>
              {isEditing && onDelete && (
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="gap-2"
                >
                  {deleting ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Excluir
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isEditing ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}