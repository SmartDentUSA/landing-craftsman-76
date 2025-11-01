import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Table } from 'lucide-react';
import { CompetitorComparison } from '@/hooks/useSpinSellingSolutions';
import { Badge } from '@/components/ui/badge';

interface CompetitorComparisonTableProps {
  value: CompetitorComparison;
  onChange: (value: CompetitorComparison) => void;
}

export function CompetitorComparisonTable({ value, onChange }: CompetitorComparisonTableProps) {
  const [localValue, setLocalValue] = useState<CompetitorComparison>(value);

  const handleChange = (updates: Partial<CompetitorComparison>) => {
    const newValue = { ...localValue, ...updates };
    setLocalValue(newValue);
    onChange(newValue);
  };

  const addColumn = () => {
    const newHeaders = [...localValue.table_headers, `Coluna ${localValue.table_headers.length + 1}`];
    const newData = localValue.table_data.map(row => ({
      ...row,
      [`Coluna ${localValue.table_headers.length + 1}`]: ''
    }));
    handleChange({ table_headers: newHeaders, table_data: newData });
  };

  const removeColumn = (index: number) => {
    const headerToRemove = localValue.table_headers[index];
    const newHeaders = localValue.table_headers.filter((_, i) => i !== index);
    const newData = localValue.table_data.map(row => {
      const { [headerToRemove]: _, ...rest } = row;
      return rest;
    });
    handleChange({ table_headers: newHeaders, table_data: newData });
  };

  const addRow = () => {
    const newRow: {[key: string]: string} = {};
    localValue.table_headers.forEach(header => {
      newRow[header] = '';
    });
    handleChange({ table_data: [...localValue.table_data, newRow] });
  };

  const removeRow = (index: number) => {
    const newData = localValue.table_data.filter((_, i) => i !== index);
    handleChange({ table_data: newData });
  };

  const updateHeader = (index: number, newValue: string) => {
    const oldHeader = localValue.table_headers[index];
    const newHeaders = [...localValue.table_headers];
    newHeaders[index] = newValue;
    
    const newData = localValue.table_data.map(row => {
      const { [oldHeader]: oldValue, ...rest } = row;
      return { ...rest, [newValue]: oldValue || '' };
    });
    
    handleChange({ table_headers: newHeaders, table_data: newData });
  };

  const updateCell = (rowIndex: number, header: string, cellValue: string) => {
    const newData = [...localValue.table_data];
    newData[rowIndex] = { ...newData[rowIndex], [header]: cellValue };
    handleChange({ table_data: newData });
  };

  const preventEnterSubmit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') e.preventDefault();
  };

   return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Table className="h-5 w-5" />
              Tabela de Comparação com Concorrentes
            </CardTitle>
            <CardDescription>
              Compare sua solução com concorrentes de forma visual
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="comparison-enabled">Ativar</Label>
            <Switch
              id="comparison-enabled"
              checked={localValue.enabled}
              onCheckedChange={(enabled) => handleChange({ enabled })}
            />
          </div>
        </div>
      </CardHeader>

      {localValue.enabled && (
        <CardContent className="space-y-4">
          {/* Títulos */}
          <div className="space-y-3">
            <div>
              <Label htmlFor="comparison-title">Título da Tabela</Label>
              <Input
                id="comparison-title"
                value={localValue.title}
                onChange={(e) => handleChange({ title: e.target.value })}
                onKeyDown={preventEnterSubmit}
                placeholder="Ex: Por que escolher nossa solução?"
              />
            </div>
            <div>
              <Label htmlFor="comparison-subtitle">Subtítulo (opcional)</Label>
              <Input
                id="comparison-subtitle"
                value={localValue.subtitle || ''}
                onChange={(e) => handleChange({ subtitle: e.target.value })}
                onKeyDown={preventEnterSubmit}
                placeholder="Ex: Comparação técnica objetiva"
              />
            </div>
          </div>

          {/* Cabeçalhos da Tabela */}
          <div>
            <Label className="font-medium">Cabeçalhos da Tabela</Label>
            <div className="space-y-2 mt-2">
              {localValue.table_headers.map((header, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={header}
                    onChange={(e) => updateHeader(index, e.target.value)}
                    onKeyDown={preventEnterSubmit}
                    placeholder={`Cabeçalho ${index + 1}`}
                  />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeColumn(index);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                </div>
              ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onPointerDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation();
                addColumn();
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Coluna
            </Button>
            </div>
          </div>

          {/* Dados da Tabela */}
          <div>
            <Label className="font-medium">Dados da Tabela</Label>
            <div className="space-y-3 mt-2">
              {localValue.table_data.map((row, rowIndex) => (
                <Card key={rowIndex}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Linha {rowIndex + 1}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onPointerDown={(e) => e.preventDefault()}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeRow(rowIndex);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {localValue.table_headers.map((header, colIndex) => (
                        <div key={colIndex}>
                          <Label className="text-xs">{header}</Label>
                          <Input
                            value={row[header] || ''}
                            onChange={(e) => updateCell(rowIndex, header, e.target.value)}
                            onKeyDown={preventEnterSubmit}
                            placeholder={`Valor para ${header}`}
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onPointerDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation();
                addRow();
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Linha
            </Button>
            </div>
          </div>

          {/* Preview da Tabela */}
          {localValue.table_headers.length > 0 && localValue.table_data.length > 0 && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <Label className="font-medium text-sm mb-2 block">Preview da Tabela</Label>
              <div className="overflow-x-auto">
                <table className="w-full border border-border rounded-md">
                  <thead className="bg-muted">
                    <tr>
                      {localValue.table_headers.map((header, index) => (
                        <th key={index} className="border border-border px-3 py-2 text-left text-sm font-medium">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {localValue.table_data.map((row, rowIndex) => (
                      <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                        {localValue.table_headers.map((header, colIndex) => (
                          <td key={colIndex} className="border border-border px-3 py-2 text-sm">
                            {row[header] || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
