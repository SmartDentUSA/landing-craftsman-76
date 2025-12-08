import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2, Plus, Download, Upload, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isValidURL = (text: string): boolean => {
    try {
      const url = new URL(text);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

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

  const handleCSVImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione um arquivo CSV",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const csvText = e.target?.result as string;
      const parsed = Papa.parse<Record<string, string>>(csvText, {
        header: true,
        skipEmptyLines: true,
      });

      if (parsed.data && parsed.data.length > 0) {
        const importedSpecs: TechnicalSpec[] = [];
        const labelFields = ['Especificação', 'especificacao', 'Especificacao', 'label', 'Label', 'spec', 'Spec', 'Specification'];
        const valueFields = ['Valor', 'valor', 'value', 'Value'];

        parsed.data.forEach((row) => {
          let label = '';
          let value = '';

          // Buscar label
          for (const field of labelFields) {
            if (row[field]?.trim()) {
              label = row[field].trim();
              break;
            }
          }

          // Se não encontrou, tentar primeira coluna
          if (!label) {
            const keys = Object.keys(row);
            if (keys.length > 0 && row[keys[0]]?.trim()) {
              label = row[keys[0]].trim();
            }
          }

          // Buscar value
          for (const field of valueFields) {
            if (row[field]?.trim()) {
              value = row[field].trim();
              break;
            }
          }

          // Se não encontrou, tentar segunda coluna
          if (!value) {
            const keys = Object.keys(row);
            if (keys.length > 1 && row[keys[1]]?.trim()) {
              value = row[keys[1]].trim();
            }
          }

          if (label && value) {
            importedSpecs.push({ label, value });
          }
        });

        if (importedSpecs.length > 0) {
          const allSpecs = [...specs, ...importedSpecs];
          setSpecs(allSpecs);
          
          // Auto-salvar no banco de dados
          try {
            setIsLoading(true);
            await onSave(allSpecs);
            toast({
              title: "CSV importado e salvo",
              description: `${importedSpecs.length} especificação(ões) adicionadas e salvas automaticamente`,
            });
          } catch (error) {
            console.error('Erro ao salvar specs importadas:', error);
            toast({
              title: "CSV importado (não salvo)",
              description: "Especificações importadas, mas houve erro ao salvar. Clique em 'Salvar Especificações'.",
              variant: "destructive",
            });
          } finally {
            setIsLoading(false);
          }
        } else {
          toast({
            title: "Nenhuma especificação encontrada",
            description: "Verifique se o CSV possui colunas 'Especificação' e 'Valor'",
            variant: "destructive",
          });
        }
      }
    };

    reader.readAsText(file, 'UTF-8');
    event.target.value = '';
  };

  const downloadTemplate = () => {
    const csvContent = 'Especificação,Valor\nVoltagem,110V/220V\nPotência,1200W\nDimensões,30x20x15cm\nPeso,2.5kg\nGarantia,1 ano';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'template-especificacoes-tecnicas.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    <Dialog open={isOpen} onOpenChange={onClose}>
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
                        {isValidURL(spec.value) ? (
                          <a href={spec.value} target="_blank" rel="noopener noreferrer" className="inline-block">
                            <Button variant="outline" size="sm" className="h-7 gap-1">
                              <Download className="h-4 w-4" />
                              Download
                            </Button>
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

          {/* Importar CSV */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <h4 className="font-medium flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    Importar de CSV
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Importe especificações em massa usando um arquivo CSV
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadTemplate}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Template
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    Importar CSV
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleCSVImport}
                    className="hidden"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

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
