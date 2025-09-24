import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { TagInput } from '@/components/ui/tag-input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Combobox } from '@/components/ui/combobox';
import { useCategoryConfig } from '@/hooks/useCategoryConfig';
import { useCategoryContext } from '@/contexts/CategoryContext';
import { Plus, Edit, Trash2, Save, X, Info, FileEdit, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CategoryFormData {
  category: string;
  subcategory: string;
  target_audience: string[];
  keywords: string[];
  market_keywords: string[];
  search_intent_keywords: string[];
}

interface RenameData {
  type: 'category' | 'subcategory';
  oldName: string;
  newName: string;
  category?: string;
}

const CategoryManager = () => {
  const { configs, loading, createConfig, updateConfig, deleteConfig } = useCategoryConfig();
  const { unifiedCategories, unifiedSubcategories, getUnifiedSubcategoriesForCategory, notifyCategoryChange } = useCategoryContext();
  const { toast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<string | null>(null);
  const [renameMode, setRenameMode] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameData, setRenameData] = useState<RenameData>({
    type: 'category',
    oldName: '',
    newName: '',
    category: ''
  });
  const [formData, setFormData] = useState<CategoryFormData>({
    category: '',
    subcategory: '',
    target_audience: [],
    keywords: [],
    market_keywords: [],
    search_intent_keywords: []
  });

  // Filtrar subcategorias com base na categoria selecionada
  const availableSubcategories = useMemo(() => {
    if (!formData.category) return unifiedSubcategories;
    return getUnifiedSubcategoriesForCategory(formData.category);
  }, [formData.category, unifiedSubcategories, getUnifiedSubcategoriesForCategory]);

  // Verificar se já existe configuração para a combinação categoria/subcategoria
  const existingConfig = useMemo(() => {
    if (!formData.category || !formData.subcategory) return null;
    return configs.find(config => 
      config.category === formData.category && 
      config.subcategory === formData.subcategory &&
      config.id !== editingConfig
    );
  }, [formData.category, formData.subcategory, configs, editingConfig]);

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

  const handleCategoryChange = (category: string) => {
    setFormData(prev => ({
      ...prev,
      category,
      subcategory: '' // Reset subcategoria quando categoria muda
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('=== DEBUG CategoryManager handleSubmit ===');
    console.log('formData antes do submit:', JSON.stringify(formData, null, 2));
    console.log('target_audience length:', formData.target_audience.length);
    console.log('keywords length:', formData.keywords.length);
    console.log('market_keywords length:', formData.market_keywords.length);
    console.log('search_intent_keywords length:', formData.search_intent_keywords.length);
    
    try {
      if (editingConfig) {
        console.log('Editando config:', editingConfig);
        await updateConfig(editingConfig, formData);
      } else {
        console.log('Criando nova config');
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

  const handleRename = async () => {
    if (!renameData.newName.trim() || renameData.newName === renameData.oldName) {
      toast({
        title: "Erro",
        description: "Digite um novo nome válido e diferente do atual.",
        variant: "destructive"
      });
      return;
    }

    setIsRenaming(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('rename-category', {
        body: renameData
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: data.message,
      });

      // Notify global category change for automatic synchronization
      await notifyCategoryChange('rename', {
        type: renameData.type,
        oldName: renameData.oldName,
        newName: renameData.newName,
        category: renameData.category
      });
      
      setIsRenameDialogOpen(false);
      setRenameData({ type: 'category', oldName: '', newName: '', category: '' });
      
    } catch (error) {
      console.error('Error renaming:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao renomear. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsRenaming(false);
    }
  };

  const openRenameDialog = (type: 'category' | 'subcategory', oldName: string, category?: string) => {
    setRenameData({
      type,
      oldName,
      newName: oldName,
      category: category || ''
    });
    setIsRenameDialogOpen(true);
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
                  <div className="flex items-center justify-between">
                    <Label>Categoria</Label>
                    {formData.category && unifiedCategories.includes(formData.category) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => openRenameDialog('category', formData.category)}
                        className="h-6 text-xs"
                      >
                        <FileEdit className="h-3 w-3 mr-1" />
                        Renomear
                      </Button>
                    )}
                  </div>
                  <Combobox
                    value={formData.category}
                    onValueChange={handleCategoryChange}
                    options={unifiedCategories}
                    placeholder="Selecione ou digite nova categoria"
                    searchPlaceholder="Buscar categoria..."
                    emptyText="Nenhuma categoria encontrada."
                    createText="Criar categoria"
                  />
                  <div className="text-xs text-muted-foreground">
                    {unifiedCategories.length} categorias existentes no repositório
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Subcategoria</Label>
                    {formData.subcategory && formData.category && availableSubcategories.includes(formData.subcategory) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => openRenameDialog('subcategory', formData.subcategory, formData.category)}
                        className="h-6 text-xs"
                      >
                        <FileEdit className="h-3 w-3 mr-1" />
                        Renomear
                      </Button>
                    )}
                  </div>
                  <Combobox
                    value={formData.subcategory}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, subcategory: value }))}
                    options={availableSubcategories}
                    placeholder="Selecione ou digite nova subcategoria"
                    searchPlaceholder="Buscar subcategoria..."
                    emptyText={formData.category ? "Nenhuma subcategoria para esta categoria." : "Selecione uma categoria primeiro."}
                    createText="Criar subcategoria"
                  />
                  <div className="text-xs text-muted-foreground">
                    {formData.category 
                      ? `${availableSubcategories.length} subcategorias para "${formData.category}"`
                      : "Selecione uma categoria para ver subcategorias"
                    }
                  </div>
                </div>
              </div>

              {existingConfig && (
                <div className="flex items-start gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50">
                  <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-800 dark:text-amber-200">
                      Configuração já existe
                    </p>
                    <p className="text-amber-700 dark:text-amber-300">
                      Já existe uma configuração para "{formData.category} → {formData.subcategory}". 
                      Criar uma nova configuração irá sobrescrever a existente.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Público-Alvo</Label>
                <TagInput
                  value={formData.target_audience}
                  onChange={(value) => {
                    console.log('DEBUG TagInput target_audience onChange:', value);
                    setFormData(prev => ({ ...prev, target_audience: value }));
                  }}
                  placeholder="Digite e pressione Enter para adicionar"
                />
              </div>

              <div className="space-y-2">
                <Label>Keywords</Label>
                <TagInput
                  value={formData.keywords}
                  onChange={(value) => {
                    console.log('DEBUG TagInput keywords onChange:', value);
                    setFormData(prev => ({ ...prev, keywords: value }));
                  }}
                  placeholder="Digite e pressione Enter para adicionar"
                />
              </div>

              <div className="space-y-2">
                <Label>Keywords de Mercado</Label>
                <TagInput
                  value={formData.market_keywords}
                  onChange={(value) => {
                    console.log('DEBUG TagInput market_keywords onChange:', value);
                    setFormData(prev => ({ ...prev, market_keywords: value }));
                  }}
                  placeholder="Digite e pressione Enter para adicionar"
                />
              </div>

              <div className="space-y-2">
                <Label>Keywords de Intenção de Busca</Label>
                <TagInput
                  value={formData.search_intent_keywords}
                  onChange={(value) => {
                    console.log('DEBUG TagInput search_intent_keywords onChange:', value);
                    setFormData(prev => ({ ...prev, search_intent_keywords: value }));
                  }}
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

        {/* Rename Dialog */}
        <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileEdit className="h-4 w-4" />
                Renomear {renameData.type === 'category' ? 'Categoria' : 'Subcategoria'}
              </DialogTitle>
              <DialogDescription>
                {renameData.type === 'category' 
                  ? 'Esta ação irá renomear a categoria em todos os produtos e configurações.'
                  : `Esta ação irá renomear a subcategoria em todos os produtos da categoria "${renameData.category}".`
                }
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome atual</Label>
                <Input value={renameData.oldName} disabled className="bg-muted" />
              </div>
              
              <div className="space-y-2">
                <Label>Novo nome</Label>
                <Input
                  value={renameData.newName}
                  onChange={(e) => setRenameData(prev => ({ ...prev, newName: e.target.value }))}
                  placeholder="Digite o novo nome"
                />
              </div>
              
              <div className="flex items-center gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50">
                <Users className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <div className="text-sm text-amber-700 dark:text-amber-300">
                  Esta operação pode afetar múltiplos produtos no repositório.
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setIsRenameDialogOpen(false)}
                disabled={isRenaming}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleRename}
                disabled={isRenaming || !renameData.newName.trim() || renameData.newName === renameData.oldName}
              >
                {isRenaming ? 'Renomeando...' : 'Renomear'}
              </Button>
            </div>
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