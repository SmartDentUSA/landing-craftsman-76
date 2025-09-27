import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, ExternalLink, Edit, Trash2, Package, Link } from 'lucide-react';
import { useLinksRepository } from '@/hooks/useLinksRepository';
import { ProductKeywordsImportModal } from '@/components/ProductKeywordsImportModal';
import { toast } from 'sonner';

interface KeywordLink {
  id: string;
  keyword: string;
  url: string;
  source: 'manual' | 'imported';
  created_at: string;
}

export const LinksManager = () => {
  const { allLinks, isLoading } = useLinksRepository();
  const [keywordLinks, setKeywordLinks] = useState<KeywordLink[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingKeyword, setEditingKeyword] = useState<KeywordLink | null>(null);
  const [formData, setFormData] = useState({
    keyword: '',
    url: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.keyword.trim()) {
      toast.error('Palavra-chave é obrigatória');
      return;
    }

    try {
      const newKeyword: KeywordLink = {
        id: crypto.randomUUID(),
        keyword: formData.keyword.trim(),
        url: formData.url.trim(),
        source: 'manual',
        created_at: new Date().toISOString()
      };

      if (editingKeyword) {
        setKeywordLinks(prev => prev.map(kw => 
          kw.id === editingKeyword.id 
            ? { ...editingKeyword, keyword: formData.keyword.trim(), url: formData.url.trim() }
            : kw
        ));
        setEditingKeyword(null);
        toast.success('Palavra-chave atualizada com sucesso');
      } else {
        setKeywordLinks(prev => [...prev, newKeyword]);
        setIsAddModalOpen(false);
        toast.success('Palavra-chave adicionada com sucesso');
      }
      
      setFormData({ keyword: '', url: '' });
    } catch (error) {
      toast.error('Erro ao salvar palavra-chave');
    }
  };

  const handleEdit = (keyword: KeywordLink) => {
    setEditingKeyword(keyword);
    setFormData({
      keyword: keyword.keyword,
      url: keyword.url
    });
  };

  const handleDelete = (id: string) => {
    setKeywordLinks(prev => prev.filter(kw => kw.id !== id));
    toast.success('Palavra-chave removida com sucesso');
  };

  const handleImportKeywords = (keywordUrlPairs: Record<string, string>) => {
    const importedKeywords: KeywordLink[] = Object.entries(keywordUrlPairs).map(([keyword, url]) => ({
      id: crypto.randomUUID(),
      keyword,
      url,
      source: 'imported',
      created_at: new Date().toISOString()
    }));

    setKeywordLinks(prev => {
      const existingKeywords = new Set(prev.map(kw => kw.keyword.toLowerCase()));
      const newKeywords = importedKeywords.filter(kw => !existingKeywords.has(kw.keyword.toLowerCase()));
      return [...prev, ...newKeywords];
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Carregando dados...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gerenciador de Links</h2>
          <p className="text-muted-foreground">
            Gerencie palavras-chave e seus links de destino para auto-linkagem
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => setIsImportModalOpen(true)} variant="outline">
            <Package className="h-4 w-4 mr-2" />
            Importar Keywords dos Produtos
          </Button>

          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Palavra
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Adicionar Palavra-chave</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="keyword">Palavra-chave</Label>
                  <Input
                    id="keyword"
                    value={formData.keyword}
                    onChange={(e) => setFormData(prev => ({ ...prev, keyword: e.target.value }))}
                    placeholder="Ex: implante dental"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="url">URL de Destino</Label>
                  <div className="space-y-2">
                    <Input
                      id="url"
                      type="url"
                      value={formData.url}
                      onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                      placeholder="https://exemplo.com ou deixe em branco"
                    />
                    {allLinks.length > 0 && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Ou selecione de um link existente:</Label>
                        <Select onValueChange={(value) => setFormData(prev => ({ ...prev, url: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar link..." />
                          </SelectTrigger>
                          <SelectContent>
                            {allLinks.map((link) => (
                              <SelectItem key={link.id} value={link.url}>
                                <div className="flex items-center gap-2">
                                  {link.type === 'internal' ? (
                                    <Link className="h-3 w-3 text-blue-500" />
                                  ) : (
                                    <ExternalLink className="h-3 w-3 text-green-500" />
                                  )}
                                  <span className="truncate">{link.name}</span>
                                  <Badge variant="secondary" className="text-xs">
                                    {link.category}
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">Salvar</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Palavras para Hiperlink
          </CardTitle>
        </CardHeader>
        <CardContent>
          {keywordLinks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Link className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                Nenhuma palavra-chave cadastrada ainda.
                <br />
                Adicione palavras-chave manualmente ou importe dos produtos.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Palavra-chave</TableHead>
                  <TableHead>URL de Destino</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keywordLinks.map((keyword) => (
                  <TableRow key={keyword.id}>
                    <TableCell className="font-medium">{keyword.keyword}</TableCell>
                    <TableCell>
                      {keyword.url ? (
                        <a 
                          href={keyword.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1 truncate max-w-[300px]"
                        >
                          {keyword.url}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground italic">Em branco</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={keyword.source === 'imported' ? 'default' : 'secondary'}>
                        {keyword.source === 'imported' ? 'Importada' : 'Manual'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(keyword)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover Palavra-chave</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja remover a palavra-chave "{keyword.keyword}"? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(keyword.id)}>
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Keyword Modal */}
      <Dialog open={!!editingKeyword} onOpenChange={() => setEditingKeyword(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Palavra-chave</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="edit-keyword">Palavra-chave</Label>
              <Input
                id="edit-keyword"
                value={formData.keyword}
                onChange={(e) => setFormData(prev => ({ ...prev, keyword: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label htmlFor="edit-url">URL de Destino</Label>
              <div className="space-y-2">
                <Input
                  id="edit-url"
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://exemplo.com ou deixe em branco"
                />
                {allLinks.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Ou selecione de um link existente:</Label>
                    <Select onValueChange={(value) => setFormData(prev => ({ ...prev, url: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar link..." />
                      </SelectTrigger>
                      <SelectContent>
                        {allLinks.map((link) => (
                          <SelectItem key={link.id} value={link.url}>
                            <div className="flex items-center gap-2">
                              {link.type === 'internal' ? (
                                <Link className="h-3 w-3 text-blue-500" />
                              ) : (
                                <ExternalLink className="h-3 w-3 text-green-500" />
                              )}
                              <span className="truncate">{link.name}</span>
                              <Badge variant="secondary" className="text-xs">
                                {link.category}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setEditingKeyword(null)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar Alterações</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import Keywords Modal */}
      <ProductKeywordsImportModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        blogContent=""
        onImportKeywords={handleImportKeywords}
        showAllKeywords={true}
      />
    </div>
  );
};