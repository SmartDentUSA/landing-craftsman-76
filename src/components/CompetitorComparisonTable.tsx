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
                placeholder="Ex: Por que escolher nossa solução?"
              />
            </div>
            <div>
              <Label htmlFor="comparison-subtitle">Subtítulo (opcional)</Label>
              <Input
                id="comparison-subtitle"
                value={localValue.subtitle || ''}
                onChange={(e) => handleChange({ subtitle: e.target.value })}
                placeholder="Ex: Comparação técnica objetiva"
              />
            </div>
          </div>

          {/* Tabela Editável */}
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2 text-left w-8"></th>
                    {localValue.table_headers.map((header, index) => (
                      <th key={index} className="p-2">
                        <div className="flex items-center gap-2">
                          <Input
                            value={header}
                            onChange={(e) => updateHeader(index, e.target.value)}
                            className="h-8 text-sm font-semibold"
                            placeholder={`Coluna ${index + 1}`}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeColumn(index)}
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </th>
                    ))}
                    <th className="p-2 w-24">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addColumn}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {localValue.table_data.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-t">
                      <td className="p-2">
                        <Badge variant="outline">{rowIndex + 1}</Badge>
                      </td>
                      {localValue.table_headers.map((header, colIndex) => (
                        <td key={colIndex} className="p-2">
                          <Input
                            value={row[header] || ''}
                            onChange={(e) => updateCell(rowIndex, header, e.target.value)}
                            className="h-8 text-sm"
                            placeholder="-"
                          />
                        </td>
                      ))}
                      <td className="p-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRow(rowIndex)}
                          className="h-8 w-full"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Botão Adicionar Linha */}
          <Button
            variant="outline"
            onClick={addRow}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Linha
          </Button>

          {/* Preview Badge */}
          {localValue.table_headers.length > 0 && localValue.table_data.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <Badge variant="secondary">
                {localValue.table_headers.length} colunas
              </Badge>
              <Badge variant="secondary">
                {localValue.table_data.length} linhas
              </Badge>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
