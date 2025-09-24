import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TagInput } from '@/components/ui/tag-input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useCategoryConfig } from '@/hooks/useCategoryConfig';
import { useProductCategories } from '@/hooks/useProductCategories';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CategoryFormData {
  category: string;
  subcategory: string;
  target_audience: string[];
  keywords: string[];
  market_keywords: string[];
  search_intent_keywords: string[];
}

const CategoryManager = () => {
  const { configs, loading, createConfig, updateConfig, deleteConfig } = useCategoryConfig();
  const { categories, subcategories } = useProductCategories();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<string | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    category: '',
    subcategory: '',
    target_audience: [],
    keywords: [],
    market_keywords: [],
    search_intent_keywords: []
  });

  const resetForm = () => {
    setFormData({
      category: '',
      subcategory: '',
      target_audience: [],
      keywords: [],
      market_keywords: [],
      search_intent_keywords: []
    });
    setEditingConfig(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingConfig) {
        await updateConfig(editingConfig, formData);
      } else {
        await createConfig(formData);
      }
      
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving config:', error);
    }
  };

  const handleEdit = (config: any) => {
    setFormData({
      category: config.category,
      subcategory: config.subcategory,
      target_audience: config.target_audience || [],
      keywords: config.keywords || [],
      market_keywords: config.market_keywords || [],
      search_intent_keywords: config.search_intent_keywords || []
    });
    setEditingConfig(config.id);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await deleteConfig(id);
  };

  if (loading) {
    return <div className="p-6">Carregando configurações...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gerenciar Categorias</h2>
          <p className="text-muted-foreground">
            Configure campos padrões para categorias e subcategorias
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Configuração
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingConfig ? 'Editar' : 'Criar'} Configuração de Categoria
              </DialogTitle>
              <DialogDescription>
                Configure os campos padrões que serão preenchidos automaticamente nos produtos
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subcategory">Subcategoria</Label>
                  <Select
                    value={formData.subcategory}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, subcategory: value }))}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma subcategoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {subcategories.map((subcategory) => (
                        <SelectItem key={subcategory} value={subcategory}>
                          {subcategory}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Público-Alvo</Label>
                <TagInput
                  value={formData.target_audience}
                  onChange={(value) => setFormData(prev => ({ ...prev, target_audience: value }))}
                  placeholder="Digite e pressione Enter para adicionar"
                />
              </div>

              <div className="space-y-2">
                <Label>Keywords</Label>
                <TagInput
                  value={formData.keywords}
                  onChange={(value) => setFormData(prev => ({ ...prev, keywords: value }))}
                  placeholder="Digite e pressione Enter para adicionar"
                />
              </div>

              <div className="space-y-2">
                <Label>Keywords de Mercado</Label>
                <TagInput
                  value={formData.market_keywords}
                  onChange={(value) => setFormData(prev => ({ ...prev, market_keywords: value }))}
                  placeholder="Digite e pressione Enter para adicionar"
                />
              </div>

              <div className="space-y-2">
                <Label>Keywords de Intenção de Busca</Label>
                <TagInput
                  value={formData.search_intent_keywords}
                  onChange={(value) => setFormData(prev => ({ ...prev, search_intent_keywords: value }))}
                  placeholder="Digite e pressione Enter para adicionar"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button type="submit">
                  <Save className="h-4 w-4 mr-2" />
                  {editingConfig ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {configs.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">
                Nenhuma configuração de categoria encontrada.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Crie uma nova configuração para começar.
              </p>
            </CardContent>
          </Card>
        ) : (
          configs.map((config) => (
            <Card key={config.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {config.category} → {config.subcategory}
                    </CardTitle>
                    <CardDescription>
                      Configuração criada em {new Date(config.created_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(config)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir esta configuração? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(config.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                {config.target_audience?.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Público-Alvo:</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {config.target_audience.map((item, index) => (
                        <Badge key={index} variant="secondary">{item}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {config.keywords?.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Keywords:</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {config.keywords.map((item, index) => (
                        <Badge key={index} variant="outline">{item}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {config.market_keywords?.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Keywords de Mercado:</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {config.market_keywords.map((item, index) => (
                        <Badge key={index} variant="outline">{item}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {config.search_intent_keywords?.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Keywords de Intenção:</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {config.search_intent_keywords.map((item, index) => (
                        <Badge key={index} variant="outline">{item}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default CategoryManager;