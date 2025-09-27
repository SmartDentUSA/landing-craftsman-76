import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, ExternalLink, Edit, Trash2, Globe } from 'lucide-react';
import { useLinksRepository, type ExternalLink as ExternalLinkType } from '@/hooks/useLinksRepository';

const CATEGORIES = [
  { value: 'produto', label: 'Produto' },
  { value: 'empresa', label: 'Empresa' },
  { value: 'parceiro', label: 'Parceiro' },
  { value: 'recurso', label: 'Recurso' },
  { value: 'documentacao', label: 'Documentação' },
  { value: 'outro', label: 'Outro' }
];

export const LinksManager = () => {
  const { externalLinks, internalLinks, isLoading, addExternalLink, updateExternalLink, deleteExternalLink } = useLinksRepository();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<ExternalLinkType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    description: '',
    category: 'produto'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingLink) {
        await updateExternalLink(editingLink.id, { ...formData, approved: true });
        setEditingLink(null);
      } else {
        await addExternalLink({ ...formData, approved: true });
        setIsAddModalOpen(false);
      }
      setFormData({ name: '', url: '', description: '', category: 'produto' });
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleEdit = (link: ExternalLinkType) => {
    setEditingLink(link);
    setFormData({
      name: link.name,
      url: link.url,
      description: link.description || '',
      category: link.category
    });
  };

  const handleDelete = async (id: string) => {
    await deleteExternalLink(id);
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      produto: 'bg-blue-100 text-blue-800',
      empresa: 'bg-green-100 text-green-800',
      parceiro: 'bg-purple-100 text-purple-800',
      recurso: 'bg-orange-100 text-orange-800',
      documentacao: 'bg-gray-100 text-gray-800',
      outro: 'bg-yellow-100 text-yellow-800'
    };
    return colors[category as keyof typeof colors] || colors.outro;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Carregando links...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gerenciador de Links</h2>
          <p className="text-muted-foreground">
            Gerencie URLs centralizadas para uso em blogs e landing pages
          </p>
        </div>

        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Link
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Adicionar Link Externo</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome do Link</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Site Oficial da Empresa"
                  required
                />
              </div>

              <div>
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://exemplo.com"
                  required
                />
              </div>

              <div>
                <Label htmlFor="category">Categoria</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descrição do link..."
                  rows={3}
                />
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

      <Tabs defaultValue="external" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="external">
            Links Externos ({externalLinks.length})
          </TabsTrigger>
          <TabsTrigger value="internal">
            Links Internos ({internalLinks.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="external" className="space-y-4">
          {externalLinks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ExternalLink className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  Nenhum link externo cadastrado ainda.
                  <br />
                  Adicione links para produtos, parceiros ou recursos.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {externalLinks.map((link) => (
                <Card key={link.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{link.name}</CardTitle>
                        <div className="flex items-center space-x-2">
                          <Badge className={getCategoryColor(link.category)}>
                            {CATEGORIES.find(c => c.value === link.category)?.label || link.category}
                          </Badge>
                          <a 
                            href={link.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-muted-foreground hover:text-primary flex items-center"
                          >
                            {link.url}
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(link)}
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
                              <AlertDialogTitle>Remover Link</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja remover o link "{link.name}"? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(link.id)}>
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardHeader>
                  {link.description && (
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground">{link.description}</p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="internal" className="space-y-4">
          {internalLinks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Globe className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  Nenhuma landing page publicada encontrada.
                  <br />
                  Publique landing pages para que apareçam aqui automaticamente.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {internalLinks.map((link) => (
                <Card key={link.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{link.name}</CardTitle>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">Landing Page</Badge>
                          <span className="text-sm text-muted-foreground">{link.url}</span>
                        </div>
                      </div>
                      <Badge className="bg-green-100 text-green-800">Interno</Badge>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Modal */}
      <Dialog open={!!editingLink} onOpenChange={() => setEditingLink(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Link Externo</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nome do Link</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label htmlFor="edit-url">URL</Label>
              <Input
                id="edit-url"
                type="url"
                value={formData.url}
                onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label htmlFor="edit-category">Categoria</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit-description">Descrição (opcional)</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setEditingLink(null)}>
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