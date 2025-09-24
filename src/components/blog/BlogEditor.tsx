import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Save, Eye, Send, X } from 'lucide-react';
import { BlogData } from '@/hooks/useBlogData';
import { useKOLs } from '@/hooks/useKOLs';

interface BlogEditorProps {
  blogData: BlogData | null;
  onSave: (data: Partial<BlogData>) => Promise<void>;
  onPreview: () => void;
  onPublish: (domains: string[]) => Promise<void>;
  saving?: boolean;
  publishing?: boolean;
}

export function BlogEditor({ 
  blogData, 
  onSave, 
  onPreview, 
  onPublish, 
  saving = false, 
  publishing = false 
}: BlogEditorProps) {
  const [formData, setFormData] = useState({
    title: blogData?.title || '',
    content: blogData?.content || '',
    metaDescription: blogData?.metaDescription || '',
    keywords: blogData?.keywords || [],
    authorKolId: blogData?.authorKolId || undefined
  });

  const [newKeyword, setNewKeyword] = useState('');
  const [selectedDomains, setSelectedDomains] = useState<string[]>(['default']);

  const { kols } = useKOLs(true);

  const handleSave = async () => {
    await onSave(formData);
  };

  const handlePublish = async () => {
    await onPublish(selectedDomains);
  };

  const addKeyword = () => {
    if (newKeyword.trim() && !formData.keywords.includes(newKeyword.trim())) {
      setFormData(prev => ({
        ...prev,
        keywords: [...prev.keywords, newKeyword.trim()]
      }));
      setNewKeyword('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setFormData(prev => ({
      ...prev,
      keywords: prev.keywords.filter(k => k !== keyword)
    }));
  };

  const selectedAuthor = kols.find(kol => kol.id === formData.authorKolId);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Editor de Blog
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title">Título do Blog</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Digite o título do blog..."
            className="text-lg font-semibold"
          />
        </div>

        {/* Meta Description */}
        <div className="space-y-2">
          <Label htmlFor="meta-description">Meta Descrição</Label>
          <Textarea
            id="meta-description"
            value={formData.metaDescription}
            onChange={(e) => setFormData(prev => ({ ...prev, metaDescription: e.target.value }))}
            placeholder="Descrição para SEO (150-160 caracteres)..."
            rows={3}
            maxLength={160}
          />
          <div className="text-xs text-muted-foreground">
            {formData.metaDescription.length}/160 caracteres
          </div>
        </div>

        {/* Content */}
        <div className="space-y-2">
          <Label htmlFor="content">Conteúdo do Blog</Label>
          <Textarea
            id="content"
            value={formData.content}
            onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
            placeholder="Conteúdo completo do blog em HTML..."
            rows={15}
            className="font-mono text-sm"
          />
        </div>

        {/* Keywords */}
        <div className="space-y-2">
          <Label>Palavras-chave</Label>
          <div className="flex gap-2">
            <Input
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              placeholder="Adicionar palavra-chave..."
              onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
            />
            <Button onClick={addKeyword} size="sm">
              Adicionar
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.keywords.map((keyword, index) => (
              <Badge key={index} variant="secondary" className="flex items-center gap-1">
                {keyword}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => removeKeyword(keyword)}
                />
              </Badge>
            ))}
          </div>
        </div>

        {/* Author Selection */}
        <div className="space-y-2">
          <Label>Autor (Opcional)</Label>
          <Select 
            value={formData.authorKolId || 'none'} 
            onValueChange={(value) => setFormData(prev => ({ 
              ...prev, 
              authorKolId: value === 'none' ? undefined : value 
            }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecionar autor..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem autor</SelectItem>
              {kols.map((kol) => (
                <SelectItem key={kol.id} value={kol.id}>
                  <div className="flex items-center space-x-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={kol.photo_url} alt={kol.full_name} />
                      <AvatarFallback>{kol.full_name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span>{kol.full_name}</span>
                    {kol.specialty && (
                      <span className="text-muted-foreground">- {kol.specialty}</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedAuthor && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedAuthor.photo_url} alt={selectedAuthor.full_name} />
                  <AvatarFallback>{selectedAuthor.full_name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedAuthor.full_name}</p>
                  {selectedAuthor.specialty && (
                    <p className="text-sm text-muted-foreground">{selectedAuthor.specialty}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Publish Domains */}
        <div className="space-y-2">
          <Label>Domínios para Publicação</Label>
          <div className="space-y-2">
            {['dentala.com.br', 'eodonto.com', 'default'].map((domain) => (
              <label key={domain} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedDomains.includes(domain)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedDomains(prev => [...prev, domain]);
                    } else {
                      setSelectedDomains(prev => prev.filter(d => d !== domain));
                    }
                  }}
                />
                <span className="text-sm">{domain}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving} variant="outline">
            {saving ? <Save className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar Rascunho
          </Button>
          
          <Button onClick={onPreview} variant="outline">
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          
          <Button onClick={handlePublish} disabled={publishing || !formData.title || !formData.content}>
            {publishing ? <Send className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            Publicar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}