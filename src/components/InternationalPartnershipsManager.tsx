import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Globe, ExternalLink } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

export interface Partnership {
  label: string;
  url: string;
  description: string;
  partnership_type: 'manufacturer' | 'distributor' | 'certification' | 'media' | 'other';
  country: string;
  since_year?: number;
  relevance_score: number;
  category: 'international_partnership';
}

interface InternationalPartnershipsManagerProps {
  partnerships: Partnership[];
  onChange: (partnerships: Partnership[]) => void;
}

export function InternationalPartnershipsManager({
  partnerships,
  onChange
}: InternationalPartnershipsManagerProps) {
  const [isAdding, setIsAdding] = useState(false);

  const [newPartnership, setNewPartnership] = useState<Partnership>({
    label: '',
    url: '',
    description: '',
    partnership_type: 'manufacturer',
    country: '',
    relevance_score: 5,
    category: 'international_partnership'
  });

  const sortedPartnerships = [...partnerships].sort(
    (a, b) => (b.relevance_score || 0) - (a.relevance_score || 0)
  );

  function handleAdd() {
    if (!newPartnership.label.trim() || !newPartnership.url.trim()) return;

    onChange([...partnerships, { ...newPartnership }]);

    // reset form
    setNewPartnership({
      label: '',
      url: '',
      description: '',
      partnership_type: 'manufacturer',
      country: '',
      relevance_score: 5,
      category: 'international_partnership'
    });
    setIsAdding(false);
  }

  function handleRemove(index: number) {
    onChange(partnerships.filter((_, i) => i !== index));
  }

  function getTypeColor(type: string) {
    const colors: Record<string, string> = {
      manufacturer: 'bg-blue-100 text-blue-800',
      distributor: 'bg-green-100 text-green-800',
      certification: 'bg-yellow-100 text-yellow-800',
      media: 'bg-purple-100 text-purple-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return colors[type] || colors.other;
  }

  function getTypeIcon(type: string) {
    const icons: Record<string, string> = {
      manufacturer: '🏭',
      distributor: '📦',
      certification: '🏆',
      media: '📰',
      other: '🔗'
    };
    return icons[type] || icons.other;
  }

  return (
    <div className="space-y-4">
      {/* Botão "Adicionar" */}
      {!isAdding && (
        <Button onClick={() => setIsAdding(true)} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Parceria Internacional
        </Button>
      )}

      {/* Formulário de criação */}
      {isAdding && (
        <Card className="border-2 border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Nova Parceria Internacional
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Nome */}
              <div className="col-span-2">
                <Label htmlFor="new-label">Nome da Parceria *</Label>
                <Input
                  id="new-label"
                  value={newPartnership.label}
                  onChange={(e) =>
                    setNewPartnership({ ...newPartnership, label: e.target.value })
                  }
                  placeholder="Formlabs Official Partners"
                />
              </div>

              {/* URL */}
              <div className="col-span-2">
                <Label htmlFor="new-url">URL *</Label>
                <Input
                  id="new-url"
                  value={newPartnership.url}
                  onChange={(e) =>
                    setNewPartnership({ ...newPartnership, url: e.target.value })
                  }
                  placeholder="https://formlabs.com/partners/smartdent"
                />
              </div>

              {/* Tipo */}
              <div>
                <Label htmlFor="new-type">Tipo de Parceria</Label>
                <Select
                  value={newPartnership.partnership_type}
                  onValueChange={(value) =>
                    setNewPartnership({
                      ...newPartnership,
                      partnership_type: value as Partnership['partnership_type']
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manufacturer">🏭 Fabricante</SelectItem>
                    <SelectItem value="distributor">📦 Distribuidor</SelectItem>
                    <SelectItem value="certification">🏆 Certificação</SelectItem>
                    <SelectItem value="media">📰 Mídia</SelectItem>
                    <SelectItem value="other">🔗 Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* País */}
              <div>
                <Label htmlFor="new-country">País</Label>
                <Input
                  id="new-country"
                  value={newPartnership.country}
                  onChange={(e) =>
                    setNewPartnership({ ...newPartnership, country: e.target.value })
                  }
                  placeholder="Estados Unidos"
                />
              </div>

              {/* Ano início */}
              <div>
                <Label htmlFor="new-year">Ano de Início</Label>
                <Input
                  id="new-year"
                  type="number"
                  value={newPartnership.since_year || ''}
                  onChange={(e) =>
                    setNewPartnership({
                      ...newPartnership,
                      since_year: e.target.value
                        ? parseInt(e.target.value)
                        : undefined
                    })
                  }
                  placeholder="2020"
                  min="1900"
                  max={new Date().getFullYear()}
                />
              </div>

              {/* Relevância */}
              <div>
                <Label htmlFor="new-relevance">
                  Relevância: {newPartnership.relevance_score}/10
                </Label>
                <Slider
                  id="new-relevance"
                  min={1}
                  max={10}
                  step={1}
                  value={[newPartnership.relevance_score]}
                  onValueChange={(values) =>
                    setNewPartnership({
                      ...newPartnership,
                      relevance_score: values[0]
                    })
                  }
                  className="mt-2"
                />
              </div>

              {/* Descrição */}
              <div className="col-span-2">
                <Label htmlFor="new-description">Descrição</Label>
                <Textarea
                  id="new-description"
                  rows={2}
                  value={newPartnership.description}
                  onChange={(e) =>
                    setNewPartnership({
                      ...newPartnership,
                      description: e.target.value
                    })
                  }
                  placeholder="Parceiro oficial e distribuidor autorizado desde 2020..."
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAdd} className="flex-1">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setIsAdding(false);
                  setNewPartnership({
                    label: '',
                    url: '',
                    description: '',
                    partnership_type: 'manufacturer',
                    country: '',
                    relevance_score: 5,
                    category: 'international_partnership'
                  });
                }}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista existente */}
      {sortedPartnerships.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">
              Parcerias Cadastradas ({sortedPartnerships.length})
            </h4>
          </div>

          {sortedPartnerships.map((partnership, visualIndex) => {
            // map visual para índice real
            const originalIndex = partnerships.findIndex(
              (p) =>
                p.label === partnership.label &&
                p.url === partnership.url &&
                p.partnership_type === partnership.partnership_type
            );

            return (
              <Card
                key={visualIndex}
                className="hover:border-blue-300 transition-colors"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      {/* Linha título + badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg">
                          {getTypeIcon(partnership.partnership_type)}
                        </span>

                        <h5 className="font-semibold">
                          {partnership.label || '(sem nome)'}
                        </h5>

                        <Badge
                          className={getTypeColor(partnership.partnership_type)}
                        >
                          {partnership.partnership_type}
                        </Badge>

                        {partnership.country && (
                          <Badge variant="outline">{partnership.country}</Badge>
                        )}

                        <Badge variant="secondary">
                          ⭐ {partnership.relevance_score}/10
                        </Badge>
                      </div>

                      {/* URL */}
                      {partnership.url && (
                        <a
                          href={partnership.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline flex items-center gap-1 break-all"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {partnership.url}
                        </a>
                      )}

                      {/* Descrição */}
                      {partnership.description && (
                        <p className="text-sm text-muted-foreground whitespace-pre-line">
                          {partnership.description}
                        </p>
                      )}

                      {/* Ano */}
                      {partnership.since_year && (
                        <p className="text-xs text-muted-foreground">
                          Desde {partnership.since_year}
                        </p>
                      )}
                    </div>

                    {/* Ações */}
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemove(originalIndex)}
                        title="Remover"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        !isAdding && (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center text-muted-foreground">
              <Globe className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma parceria internacional cadastrada</p>
              <p className="text-sm">
                Clique no botão acima para adicionar
              </p>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}
