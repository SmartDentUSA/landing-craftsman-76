import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, ExternalLink, Edit, Trash2, Search, Filter, Download, RefreshCw } from 'lucide-react';
import { useLinksRepository, ExternalLink as ExternalLinkType } from '@/hooks/useLinksRepository';
import { useProductCategories } from '@/hooks/useProductCategories';
import { useCategoryConfig } from '@/hooks/useCategoryConfig';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface KeywordLink {
  id: string;
  keyword: string;
  url: string;
  source: 'manual' | 'imported';
  created_at: string;
}

export const LinksManager = () => {
  const { allLinks, isLoading, addExternalLink, updateExternalLink, deleteExternalLink, externalLinks, syncWithProducts } = useLinksRepository();
  const { categories, getSubcategoriesForCategory, loading: categoriesLoading } = useProductCategories();
  const { configs: categoryConfigs, loading: configsLoading } = useCategoryConfig();
  
  // Estado para categorias dinâmicas
  const [dynamicCategories, setDynamicCategories] = useState<{ value: string; label: string }[]>([]);
  const [dynamicSubcategories, setDynamicSubcategories] = useState<Record<string, string[]>>({});
  
  // Estado para mapear produtos e suas categorias
  const [productCategoryMap, setProductCategoryMap] = useState<Record<string, { category: string; subcategory: string }>>({});

  // Combinar categorias do sistema com as configuradas
  useEffect(() => {
    const combinedCategories = new Set<string>();
    
    // Adicionar categorias dos produtos
    categories.forEach(cat => combinedCategories.add(cat));
    
    // Adicionar categorias das configurações
    categoryConfigs.forEach(config => combinedCategories.add(config.category));
    
    const categoryOptions = Array.from(combinedCategories)
      .filter(Boolean)
      .sort()
      .map(cat => ({
        value: cat,
        label: cat.charAt(0).toUpperCase() + cat.slice(1)
      }));
    
    setDynamicCategories(categoryOptions);
    
    // Criar mapeamento de subcategorias
    const subcategoryMap: Record<string, string[]> = {};
    
    // Para cada categoria, buscar suas subcategorias
    Array.from(combinedCategories).forEach(category => {
      const subcats = new Set<string>();
      
      // Subcategorias dos produtos
      const productSubcats = getSubcategoriesForCategory(category);
      productSubcats.forEach(sub => subcats.add(sub));
      
      // Subcategorias das configurações
      const configSubcats = categoryConfigs
        .filter(config => config.category === category)
        .map(config => config.subcategory);
      configSubcats.forEach(sub => subcats.add(sub));
      
      subcategoryMap[category] = Array.from(subcats).filter(Boolean).sort();
    });
    
    setDynamicSubcategories(subcategoryMap);
  }, [categories, categoryConfigs, getSubcategoriesForCategory]);

  // Preload product categories for links pointing to /produto/{id}
  useEffect(() => {
    const loadProductCategories = async () => {
      const productIds = new Set<string>();
      
      // Extract product IDs from URLs
      externalLinks.forEach(link => {
        const match = link.url.match(/\/produto\/([a-f0-9-]{36})/);
        if (match) {
          productIds.add(match[1]);
        }
      });

      if (productIds.size > 0) {
        try {
          const { data: products } = await supabase
            .from('products_repository')
            .select('id, category, subcategory')
            .in('id', Array.from(productIds));

          if (products) {
            const categoryMap: Record<string, { category: string; subcategory: string }> = {};
            products.forEach(product => {
              categoryMap[product.id] = {
                category: product.category || '',
                subcategory: product.subcategory || ''
              };
            });
            setProductCategoryMap(categoryMap);
          }
        } catch (error) {
          console.error('Error loading product categories:', error);
        }
      }
    };

    if (externalLinks.length > 0) {
      loadProductCategories();
    }
  }, [externalLinks]);

  // Helper functions defined before use
  const formatOrigin = (link: ExternalLinkType) => {
    // Detectar origem baseado na descrição, URL ou categoria legacy
    if (link.description?.includes('Keyword do produto:') || 
        link.description?.includes('Importado do produto:') ||
        link.description?.includes('keyword-import') ||
        link.category?.includes('keyword') ||
        link.url.match(/\/produto\/[a-f0-9-]{36}/)) {
      return 'Importação (keyword-import)';
    }
    return 'Manual';
  };

  const formatCategory = (link: ExternalLinkType) => {
    // Extract from description pattern: "Keyword do produto: ... (Category • Subcategory)"
    if (link.description?.includes('Keyword do produto:')) {
      const categoryMatch = link.description.match(/\(([^)]+)\)$/);
      if (categoryMatch) {
        const categoryInfo = categoryMatch[1];
        const categoryPart = categoryInfo.split(' • ')[0];
        return categoryPart;
      }
    }
    
    // Use productCategoryMap for /produto/{id} URLs
    const productMatch = link.url.match(/\/produto\/([a-f0-9-]{36})/);
    if (productMatch && productCategoryMap[productMatch[1]]) {
      return productCategoryMap[productMatch[1]].category;
    }
    
    // Only show link.category if it exists in dynamicCategories
    if (link.category && dynamicCategories.some(cat => cat.value === link.category)) {
      return link.category;
    }
    
    return '—';
  };

  const formatSubcategory = (link: ExternalLinkType) => {
    // Extract from description pattern: "Keyword do produto: ... (Category • Subcategory)"
    if (link.description?.includes('Keyword do produto:')) {
      const categoryMatch = link.description.match(/\(([^)]+)\)$/);
      if (categoryMatch) {
        const categoryInfo = categoryMatch[1];
        const parts = categoryInfo.split(' • ');
        if (parts.length > 1) {
          const subcategory = parts[1];
          // Don't show generic subcategories
          if (subcategory && !['geral', 'outros', 'geral'].includes(subcategory.toLowerCase())) {
            return subcategory;
          }
        }
      }
    }
    
    // Use productCategoryMap for /produto/{id} URLs
    const productMatch = link.url.match(/\/produto\/([a-f0-9-]{36})/);
    if (productMatch && productCategoryMap[productMatch[1]]) {
      const subcategory = productCategoryMap[productMatch[1]].subcategory;
      if (subcategory && !['geral', 'outros'].includes(subcategory.toLowerCase())) {
        return subcategory;
      }
    }
    
    // Only show subcategory if it's valid for the category
    const category = formatCategory(link);
    if (link.subcategory && 
        dynamicSubcategories[category]?.includes(link.subcategory) &&
        !['geral', 'outros'].includes(link.subcategory.toLowerCase())) {
      return link.subcategory;
    }
    
    return '—';
  };

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingKeyword, setEditingKeyword] = useState<KeywordLink | null>(null);
  const [formData, setFormData] = useState({
    keyword: '',
    url: '',
    category: '',
    subcategory: '',
    description: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [subcategoryFilter, setSubcategoryFilter] = useState('all');

  // Helper function to identify keyword links
  const isKeywordLink = (link: ExternalLinkType) => {
    // Check if category exists in registered categories
    if (dynamicCategories.some(cat => cat.value === link.category)) {
      return true;
    }
    
    // Check if description indicates it's a keyword
    if (link.description?.includes('Keyword do produto:') || 
        link.description?.includes('Importado do produto:')) {
      return true;
    }
    
    // Check if URL points to a product (imported)
    if (link.url.match(/\/produto\/[a-f0-9-]{36}/)) {
      return true;
    }
    
    // Legacy compatibility - check if category contains "keyword"
    if (link.category?.includes('keyword')) {
      return true;
    }
    
    return false;
  };

  const filteredLinks = useMemo(() => {
    return externalLinks
      .filter(link => isKeywordLink(link))
      .filter(link => {
        const matchesSearch = link.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             link.url.toLowerCase().includes(searchTerm.toLowerCase());
        
        // Use formatted values for filtering
        const formattedCategory = formatCategory(link);
        const formattedSubcategory = formatSubcategory(link);
        
        const matchesCategory = categoryFilter === 'all' || formattedCategory === categoryFilter;
        const matchesSubcategory = subcategoryFilter === 'all' || formattedSubcategory === subcategoryFilter;
        
        return matchesSearch && matchesCategory && matchesSubcategory;
      });
  }, [externalLinks, searchTerm, categoryFilter, subcategoryFilter, productCategoryMap, dynamicCategories, dynamicSubcategories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.keyword.trim()) {
      toast.error('Palavra-chave é obrigatória');
      return;
    }

    try {
      if (editingKeyword) {
        const linkId = editingKeyword.id;
        await updateExternalLink(linkId, {
          name: formData.keyword.trim(),
          url: formData.url.trim() || '#',
          category: formData.category,
          subcategory: formData.subcategory,
          description: formData.description.trim() || undefined
        });
        setEditingKeyword(null);
        toast.success('Palavra-chave atualizada com sucesso');
      } else {
        await addExternalLink({
          name: formData.keyword.trim(),
          url: formData.url.trim() || '#',
          category: formData.category,
          subcategory: formData.subcategory,
          description: formData.description.trim() || 'Keyword adicionada manualmente',
          approved: true
        });
        setIsAddModalOpen(false);
        toast.success('Palavra-chave adicionada com sucesso');
      }
      
      // Reset form with first available category/subcategory or empty
      const firstCategory = dynamicCategories[0]?.value || '';
      const firstSubcategory = firstCategory ? dynamicSubcategories[firstCategory]?.[0] || '' : '';
      setFormData({ keyword: '', url: '', category: firstCategory, subcategory: firstSubcategory, description: '' });
    } catch (error) {
      toast.error('Erro ao salvar palavra-chave');
    }
  };

  const handleEdit = async (keyword: KeywordLink) => {
    setEditingKeyword(keyword);
    // Find the actual link data to get category and subcategory
    const linkData = externalLinks.find(link => link.id === keyword.id);
    
    // Use actual registered data as fallback instead of hardcoded values
    let category = linkData?.category || dynamicCategories[0]?.value || '';
    let subcategory = linkData?.subcategory || (category ? dynamicSubcategories[category]?.[0] || '' : '');
    
    // Se a keyword foi importada de um produto, extrair categoria/subcategoria do produto original
    if (linkData?.description?.includes('Keyword do produto:')) {
      try {
        // Extrair ID do produto da URL se for um link interno
        const productIdMatch = linkData.url.match(/\/produto\/([a-f0-9-]+)/);
        if (productIdMatch) {
          const productId = productIdMatch[1];
          const { data: product } = await supabase
            .from('products_repository')
            .select('category, subcategory')
            .eq('id', productId)
            .single();
          
          if (product) {
            category = product.category || category;
            subcategory = product.subcategory || subcategory;
          }
        }
      } catch (error) {
        console.error('Erro ao buscar categoria do produto:', error);
      }
    }
    
    setFormData({
      keyword: keyword.keyword,
      url: keyword.url,
      category,
      subcategory,
      description: linkData?.description || ''
    });
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteExternalLink(id);
      toast.success('Palavra-chave removida com sucesso');
    } catch (error) {
      toast.error('Erro ao remover palavra-chave');
    }
  };

  const handleSyncWithProducts = async () => {
    try {
      await syncWithProducts();
    } catch (error) {
      console.error('Erro ao sincronizar:', error);
    }
  };


  const resetFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setSubcategoryFilter('all');
  };

  if (isLoading || categoriesLoading || configsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gerenciador de Links</h2>
          <p className="text-muted-foreground">
            Gerencie palavras-chave e seus links de destino para uso em blogs e conteúdos.
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleSyncWithProducts}
            variant="outline"
            className="flex items-center gap-2"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Sincronizar com Produtos
          </Button>
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={() => {
                  setEditingKeyword(null);
                  // Initialize with first available category/subcategory
                  const firstCategory = dynamicCategories[0]?.value || '';
                  const firstSubcategory = firstCategory ? dynamicSubcategories[firstCategory]?.[0] || '' : '';
                  setFormData({ keyword: '', url: '', category: firstCategory, subcategory: firstSubcategory, description: '' });
                }}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Adicionar Link
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Adicionar Novo Link</DialogTitle>
                <DialogDescription>
                  Adicione uma nova palavra-chave com seu link de destino.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="keyword">Palavra-chave *</Label>
                  <Input
                    id="keyword"
                    value={formData.keyword}
                    onChange={(e) => setFormData(prev => ({ ...prev, keyword: e.target.value }))}
                    placeholder="Ex: implante dentário"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Categoria *</Label>
                    <Select value={formData.category} onValueChange={(value) => {
                      // Set subcategory to first available for selected category
                      const firstSubcategory = dynamicSubcategories[value]?.[0] || '';
                      setFormData(prev => ({ ...prev, category: value, subcategory: firstSubcategory }));
                    }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {dynamicCategories.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="subcategory">Subcategoria</Label>
                    <Select value={formData.subcategory} onValueChange={(value) => 
                      setFormData(prev => ({ ...prev, subcategory: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {dynamicSubcategories[formData.category]?.map(sub => (
                          <SelectItem key={sub} value={sub}>
                            {sub.charAt(0).toUpperCase() + sub.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="url">URL de Destino *</Label>
                  <div className="space-y-2">
                    <Input
                      id="url"
                      value={formData.url}
                      onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                      placeholder="https://exemplo.com/pagina"
                    />
                    <Select value={formData.url} onValueChange={(value) => 
                      setFormData(prev => ({ ...prev, url: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue placeholder="Ou selecione um link existente" />
                      </SelectTrigger>
                      <SelectContent>
                        {allLinks.map(link => (
                          <SelectItem key={`add-${link.id}`} value={link.url}>
                            {link.name} ({link.type === 'internal' ? 'Interno' : 'Externo'})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Descrição (opcional)</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descrição adicional sobre o link"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsAddModalOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">Adicionar</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filtros e Busca
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar palavra-chave ou URL..."
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="categoryFilter">Categoria</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {dynamicCategories.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="subcategoryFilter">Subcategoria</Label>
              <Select value={subcategoryFilter} onValueChange={setSubcategoryFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as subcategorias</SelectItem>
                  {categoryFilter !== 'all' && 
                    dynamicSubcategories[categoryFilter]?.map(sub => (
                      <SelectItem key={sub} value={sub}>
                        {sub.charAt(0).toUpperCase() + sub.slice(1)}
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button variant="outline" onClick={resetFilters} className="w-full">
                Limpar Filtros
              </Button>
            </div>
          </div>
          
          <div className="mt-4 text-sm text-muted-foreground">
            Mostrando {filteredLinks.length} de {externalLinks.filter(link => isKeywordLink(link)).length} links
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Links */}
      <Card>
        <CardHeader>
          <CardTitle>Palavras para Hiperlink</CardTitle>
          <CardDescription>
            Lista de todas as palavras-chave e seus respectivos links de destino.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Palavra-chave</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Subcategoria</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>URL de Destino</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLinks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {searchTerm || categoryFilter !== 'all' || subcategoryFilter !== 'all' 
                        ? 'Nenhum link encontrado com os filtros aplicados.'
                        : 'Nenhum link cadastrado ainda. Adicione o primeiro link ou importe dos produtos.'
                      }
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLinks.map((link) => (
                    <TableRow key={link.id}>
                      <TableCell className="font-medium">{link.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {formatCategory(link)}
                        </Badge>
                      </TableCell>
                       <TableCell>
                         <Badge variant="outline">
                           {formatSubcategory(link) === '—' ? '—' : 
                            formatSubcategory(link)?.charAt(0).toUpperCase() + formatSubcategory(link)?.slice(1)}
                         </Badge>
                       </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatOrigin(link)}
                      </TableCell>
                      <TableCell>
                        {link.url && link.url !== '#' ? (
                          <a 
                            href={link.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline max-w-[200px] truncate block"
                            title={link.url}
                          >
                            {link.url}
                          </a>
                        ) : (
                          <span className="text-muted-foreground italic">Em branco</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit({ 
                              id: link.id, 
                              keyword: link.name, 
                              url: link.url, 
                              source: link.category?.includes('import') ? 'imported' : 'manual',
                              created_at: link.created_at 
                            })}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir a palavra-chave "{link.name}"? 
                                  Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(link.id)}>
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Keyword Modal */}
      <Dialog open={!!editingKeyword} onOpenChange={() => setEditingKeyword(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Palavra-chave</DialogTitle>
            <DialogDescription>
              Edite as informações do link existente.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="edit-keyword">Palavra-chave *</Label>
              <Input
                id="edit-keyword"
                value={formData.keyword}
                onChange={(e) => setFormData(prev => ({ ...prev, keyword: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-category">Categoria *</Label>
                <Select value={formData.category} onValueChange={(value) => {
                  // Set subcategory to first available for selected category
                  const firstSubcategory = dynamicSubcategories[value]?.[0] || '';
                  setFormData(prev => ({ ...prev, category: value, subcategory: firstSubcategory }));
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dynamicCategories.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="edit-subcategory">Subcategoria</Label>
                <Select value={formData.subcategory} onValueChange={(value) => 
                  setFormData(prev => ({ ...prev, subcategory: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dynamicSubcategories[formData.category]?.map(sub => (
                      <SelectItem key={sub} value={sub}>
                        {sub.charAt(0).toUpperCase() + sub.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="edit-url">URL de Destino *</Label>
              <div className="space-y-2">
                <Input
                  id="edit-url"
                  value={formData.url}
                  onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://exemplo.com/pagina"
                />
                <Select value={formData.url} onValueChange={(value) => 
                  setFormData(prev => ({ ...prev, url: value }))
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Ou selecione um link existente" />
                  </SelectTrigger>
                  <SelectContent>
                    {allLinks.map(link => (
                      <SelectItem key={`edit-${link.id}`} value={link.url}>
                        {link.name} ({link.type === 'internal' ? 'Interno' : 'Externo'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="edit-description">Descrição (opcional)</Label>
              <Input
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição adicional sobre o link"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setEditingKeyword(null)}
              >
                Cancelar
              </Button>
              <Button type="submit">Salvar Alterações</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};