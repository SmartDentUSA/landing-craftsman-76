import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2, Plus, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Helper para detectar URLs válidas
const isValidUrl = (text: string): boolean => {
  if (!text) return false;
  const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
  return urlPattern.test(text) || text.startsWith('http://') || text.startsWith('https://');
};

interface TechnicalSpec {
  label: string;
  value: string;
}

interface ProductTechnicalSpecsModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  initialSpecs: TechnicalSpec[];
  onSave: (specs: TechnicalSpec[]) => void;
}

export const ProductTechnicalSpecsModal: React.FC<ProductTechnicalSpecsModalProps> = ({
  isOpen,
  onClose,
  productId,
  productName,
  initialSpecs,
  onSave
}) => {
  const [specs, setSpecs] = useState<TechnicalSpec[]>(initialSpecs);
  const [newSpec, setNewSpec] = useState<TechnicalSpec>({ label: '', value: '' });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setSpecs(initialSpecs);
  }, [initialSpecs]);

  const handleAddSpec = () => {
    if (newSpec.label.trim() && newSpec.value.trim()) {
      setSpecs([...specs, { ...newSpec }]);
      setNewSpec({ label: '', value: '' });
    }
  };

  const handleRemoveSpec = (index: number) => {
    setSpecs(specs.filter((_, i) => i !== index));
  };

  const handleUpdateSpec = (index: number, field: 'label' | 'value', value: string) => {
    const updatedSpecs = specs.map((spec, i) => 
      i === index ? { ...spec, [field]: value } : spec
    );
    setSpecs(updatedSpecs);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const validSpecs = specs.filter(spec => spec.label.trim() && spec.value.trim());
      await onSave(validSpecs);
      toast({
        title: "Especificações salvas",
        description: "As especificações técnicas foram atualizadas com sucesso",
      });
      onClose();
    } catch (error) {
      console.error('Error in handleSave:', error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: "Não foi possível salvar as especificações técnicas",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Especificações Técnicas - {productName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tabela de visualização das especificações existentes */}
          {specs.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Especificações Atuais</h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3 font-medium">Especificação</th>
                      <th className="text-left p-3 font-medium">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {specs.map((spec, index) => (
                      <tr key={index} className="border-t">
                        <td className="p-3 font-medium">{spec.label}</td>
                        <td className="p-3">
                          {isValidUrl(spec.value) ? (
                            <a 
                              href={spec.value.startsWith('http') ? spec.value : `https://${spec.value}`}
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline inline-flex items-center gap-1"
                            >
                              {spec.value}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            spec.value
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Lista de especificações para edição */}
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Editar Especificações</h3>
            {specs.map((spec, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div>
                      <Label htmlFor={`label-${index}`}>Especificação</Label>
                      <Input
                        id={`label-${index}`}
                        value={spec.label}
                        onChange={(e) => handleUpdateSpec(index, 'label', e.target.value)}
                        placeholder="Ex: Voltagem"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`value-${index}`}>Valor</Label>
                      <div className="flex gap-2">
                        <Input
                          id={`value-${index}`}
                          value={spec.value}
                          onChange={(e) => handleUpdateSpec(index, 'value', e.target.value)}
                          placeholder="Ex: 110V"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleRemoveSpec(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Adicionar nova especificação */}
          <Card className="border-dashed">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div>
                  <Label htmlFor="new-label">Nova Especificação</Label>
                  <Input
                    id="new-label"
                    value={newSpec.label}
                    onChange={(e) => setNewSpec({ ...newSpec, label: e.target.value })}
                    placeholder="Ex: Potência"
                  />
                </div>
                <div>
                  <Label htmlFor="new-value">Valor</Label>
                  <div className="flex gap-2">
                    <Input
                      id="new-value"
                      value={newSpec.value}
                      onChange={(e) => setNewSpec({ ...newSpec, value: e.target.value })}
                      placeholder="Ex: 1200W"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAddSpec();
                        }
                      }}
                    />
                    <Button
                      onClick={handleAddSpec}
                      disabled={!newSpec.label.trim() || !newSpec.value.trim()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Botões de ação */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? "Salvando..." : "Salvar Especificações"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};