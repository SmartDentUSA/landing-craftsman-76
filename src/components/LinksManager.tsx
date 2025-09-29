import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, ExternalLink, Edit, Trash2, Search, Filter, Download } from 'lucide-react';
import { useLinksRepository, ExternalLink as ExternalLinkType } from '@/hooks/useLinksRepository';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface KeywordLink {
  id: string;
  keyword: string;
  url: string;
  source: 'manual' | 'imported';
  created_at: string;
}

const categoryOptions = [
  { value: 'produto', label: 'Produto' },
  { value: 'servico', label: 'Serviço' },
  { value: 'tecnico', label: 'Técnico' },
  { value: 'comercial', label: 'Comercial' },
  { value: 'institucional', label: 'Institucional' },
  { value: 'outros', label: 'Outros' }
];

const subcategoryOptions = {
  produto: ['geral', 'equipamentos', 'materiais', 'instrumentos'],
  servico: ['geral', 'consultoria', 'treinamento', 'suporte'],
  tecnico: ['geral', 'especificacoes', 'manuais', 'tutoriais'],
  comercial: ['geral', 'vendas', 'promocoes', 'descontos'],
  institucional: ['geral', 'sobre', 'missao', 'valores'],
  outros: ['geral', 'diversos']
};

export const LinksManager = () => {
  const { allLinks, isLoading, addExternalLink, updateExternalLink, deleteExternalLink, externalLinks } = useLinksRepository();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingKeyword, setEditingKeyword] = useState<KeywordLink | null>(null);
  const [formData, setFormData] = useState({
    keyword: '',
    url: '',
    category: 'produto',
    subcategory: 'geral',
    description: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [subcategoryFilter, setSubcategoryFilter] = useState('all');

  const filteredLinks = externalLinks
    .filter(link => link.category?.includes('keyword'))
    .filter(link => {
      const matchesSearch = link.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           link.url.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || link.category === categoryFilter;
      const matchesSubcategory = subcategoryFilter === 'all' || link.subcategory === subcategoryFilter;
      
      return matchesSearch && matchesCategory && matchesSubcategory;
    });

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
      
      setFormData({ keyword: '', url: '', category: 'produto', subcategory: 'geral', description: '' });
    } catch (error) {
      toast.error('Erro ao salvar palavra-chave');
    }
  };

  const handleEdit = async (keyword: KeywordLink) => {
    setEditingKeyword(keyword);
    // Find the actual link data to get category and subcategory
    const linkData = externalLinks.find(link => link.id === keyword.id);
    
    let category = linkData?.category || 'produto';
    let subcategory = linkData?.subcategory || 'geral';
    
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

  const handleImportKeywords = async () => {
    try {
      const { data: products, error } = await supabase
        .from('products_repository')
        .select('id, name, keywords, search_intent_keywords, category, subcategory')
        .eq('approved', true);

      if (error) {
        console.error('Erro ao buscar produtos:', error);
        toast.error('Não foi possível buscar os produtos.');
        return;
      }

      if (!products || products.length === 0) {
        toast.error('Não há produtos aprovados para importar keywords.');
        return;
      }

      const allKeywords = new Set<string>();
      
      products.forEach(product => {
        if (product.keywords && Array.isArray(product.keywords)) {
          product.keywords.forEach((keyword: string) => {
            if (keyword && keyword.trim()) {
              allKeywords.add(keyword.trim().toLowerCase());
            }
          });
        }
        
        if (product.search_intent_keywords && Array.isArray(product.search_intent_keywords)) {
          product.search_intent_keywords.forEach((keyword: string) => {
            if (keyword && keyword.trim()) {
              allKeywords.add(keyword.trim().toLowerCase());
            }
          });
        }
      });

      const existingKeywords = new Set(
        externalLinks
          .filter(link => link.category?.includes('keyword'))
          .map(link => link.name.toLowerCase())
      );
      const newKeywords = Array.from(allKeywords).filter(keyword => !existingKeywords.has(keyword));

      if (newKeywords.length === 0) {
        toast.error('Todas as keywords dos produtos já estão na lista.');
        return;
      }

        const promises = newKeywords.map(keyword => {
          const sourceProduct = products.find(p => {
            const keywords = Array.isArray(p.keywords) ? p.keywords : [];
            const searchIntentKeywords = Array.isArray(p.search_intent_keywords) ? p.search_intent_keywords : [];
            
            return keywords.some((k: string) => k.toLowerCase() === keyword) ||
                   searchIntentKeywords.some((k: string) => k.toLowerCase() === keyword);
          });
          
          return addExternalLink({
            name: keyword,
            url: sourceProduct ? `/produto/${sourceProduct.id}` : '#',
            category: sourceProduct?.category || 'produto',
            subcategory: sourceProduct?.subcategory || 'geral',
            description: `Keyword do produto: ${sourceProduct?.name || 'Produto não identificado'} (${sourceProduct?.category || 'categoria'}${sourceProduct?.subcategory ? ` • ${sourceProduct.subcategory}` : ''})`,
            approved: true
          });
        });

      await Promise.all(promises);
      
      toast.success(`${newKeywords.length} keywords importadas com suas categorias originais. Verifique os links de destino.`);

    } catch (error) {
      console.error('Erro ao importar keywords:', error);
      toast.error('Ocorreu um erro inesperado.');
    }
  };

  const formatOrigin = (link: ExternalLinkType) => {
    if (link.description?.includes('Importado do produto:')) {
      return 'Importação de Keywords';
    }
    return 'Manual';
  };

  const formatCategory = (link: ExternalLinkType) => {
    // Se é uma keyword importada, extrair a categoria real do produto da descrição
    if (link.description?.includes('Importado do produto:')) {
      // Extrair categoria da descrição se disponível
      const match = link.description.match(/categoria: ([^,)]+)/);
      return match ? match[1] : link.category;
    }
    // Se é manual, mostrar a categoria escolhida pelo usuário
    return link.category;
  };

  const resetFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setSubcategoryFilter('all');
  };

  if (isLoading) {
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
            onClick={handleImportKeywords}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Importar dos Produtos
          </Button>
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={() => {
                  setEditingKeyword(null);
                  setFormData({ keyword: '', url: '', category: 'produto', subcategory: 'geral', description: '' });
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
                      setFormData(prev => ({ ...prev, category: value, subcategory: 'geral' }));
                    }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryOptions.map(option => (
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
                        {subcategoryOptions[formData.category as keyof typeof subcategoryOptions]?.map(sub => (
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
                  {categoryOptions.map(option => (
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
                    subcategoryOptions[categoryFilter as keyof typeof subcategoryOptions]?.map(sub => (
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
            Mostrando {filteredLinks.length} de {externalLinks.filter(link => link.category?.includes('keyword')).length} links
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
                        {link.subcategory && !link.description?.includes('Importado do produto:') && (
                          <Badge variant="outline">
                            {link.subcategory?.charAt(0).toUpperCase() + link.subcategory?.slice(1) || 'Geral'}
                          </Badge>
                        )}
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
                  setFormData(prev => ({ ...prev, category: value, subcategory: 'geral' }));
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map(option => (
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
                    {subcategoryOptions[formData.category as keyof typeof subcategoryOptions]?.map(sub => (
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