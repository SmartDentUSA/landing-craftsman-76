import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Info, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface FieldInfo {
  name: string;
  isUsedInPrompt: boolean;
  isRequired: boolean;
  hasData: boolean;
  description?: string;
}

interface DataSource {
  id: string;
  label: string;
  fields: FieldInfo[];
  isSelected: boolean;
}

interface FieldSelectionInterfaceProps {
  dataSources: DataSource[];
  selectedFields: Record<string, string[]>;
  onFieldToggle: (sourceId: string, fieldName: string) => void;
  onSourceToggle: (sourceId: string) => void;
  edgeFunctionId: string;
}

// Campos obrigatórios por função
const REQUIRED_FIELDS_BY_FUNCTION: Record<string, Record<string, string[]>> = {
  "generate-social-content": {
    "products_repository": ["name", "description"],
    "company_profile": ["company_name"]
  },
  "generate-instagram-copy": {
    "products_repository": ["name", "description"],
    "company_profile": ["company_name"]
  }
};

// Campos utilizados nos prompts padrão
const FIELDS_USED_IN_PROMPTS: Record<string, Record<string, string[]>> = {
  "generate-social-content": {
    "products_repository": [
      "name", "description", "category", "price", "keywords", 
      "target_audience", "benefits", "bot_trigger_words"
    ],
    "company_profile": ["company_name", "instagram_profile"]
  },
  "generate-instagram-copy": {
    "products_repository": [
      "name", "description", "category", "price", "keywords", 
      "target_audience", "benefits", "bot_trigger_words"
    ],
    "company_profile": ["company_name", "instagram_profile"]
  }
};

export const FieldSelectionInterface: React.FC<FieldSelectionInterfaceProps> = ({
  dataSources,
  selectedFields,
  onFieldToggle,
  onSourceToggle,
  edgeFunctionId
}) => {
  const getFieldStatus = (sourceId: string, fieldName: string) => {
    const requiredFields = REQUIRED_FIELDS_BY_FUNCTION[edgeFunctionId]?.[sourceId] || [];
    const usedInPrompts = FIELDS_USED_IN_PROMPTS[edgeFunctionId]?.[sourceId] || [];
    
    return {
      isRequired: requiredFields.includes(fieldName),
      isUsedInPrompt: usedInPrompts.includes(fieldName),
      isSelected: selectedFields[sourceId]?.includes(fieldName) || false
    };
  };

  const getSourceStats = (source: DataSource) => {
    const totalFields = source.fields.length;
    const selectedCount = selectedFields[source.id]?.length || 0;
    const requiredFields = REQUIRED_FIELDS_BY_FUNCTION[edgeFunctionId]?.[source.id] || [];
    const requiredCount = requiredFields.length;
    
    return { totalFields, selectedCount, requiredCount };
  };

  const getRecommendedFields = (sourceId: string) => {
    const usedInPrompts = FIELDS_USED_IN_PROMPTS[edgeFunctionId]?.[sourceId] || [];
    const requiredFields = REQUIRED_FIELDS_BY_FUNCTION[edgeFunctionId]?.[sourceId] || [];
    
    return Array.from(new Set([...requiredFields, ...usedInPrompts]));
  };

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Selecione quais campos de dados serão utilizados na geração de conteúdo para esta função.
          Campos marcados com <Badge variant="destructive" className="text-xs">Obrigatório</Badge> são 
          essenciais para o funcionamento. Campos com <Badge variant="secondary" className="text-xs">Usado no Prompt</Badge> são 
          utilizados nos prompts padrão.
        </AlertDescription>
      </Alert>

      <ScrollArea className="h-[400px]">
        <div className="space-y-4">
          {dataSources.map((source) => {
            const stats = getSourceStats(source);
            const recommendedFields = getRecommendedFields(source.id);
            
            return (
              <Card key={source.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`source-${source.id}`}
                        checked={source.isSelected}
                        onCheckedChange={() => onSourceToggle(source.id)}
                      />
                      <Label htmlFor={`source-${source.id}`} className="font-medium">
                        {source.label}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        {stats.selectedCount}/{stats.totalFields} selecionados
                      </Badge>
                      {stats.requiredCount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {stats.requiredCount} obrigatórios
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {recommendedFields.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Campos recomendados: {recommendedFields.join(', ')}
                    </div>
                  )}
                </CardHeader>
                
                {source.isSelected && (
                  <CardContent className="pt-0">
                    <Separator className="mb-3" />
                    <div className="grid grid-cols-1 gap-2">
                      {source.fields.map((field) => {
                        const status = getFieldStatus(source.id, field.name);
                        
                        return (
                          <div key={field.name} className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`field-${source.id}-${field.name}`}
                                checked={status.isSelected}
                                onCheckedChange={() => onFieldToggle(source.id, field.name)}
                              />
                              <Label 
                                htmlFor={`field-${source.id}-${field.name}`}
                                className="text-sm"
                              >
                                {field.name}
                              </Label>
                            </div>
                            
                            <div className="flex items-center space-x-1">
                              {status.isRequired && (
                                <Badge variant="destructive" className="text-xs">
                                  Obrigatório
                                </Badge>
                              )}
                              {status.isUsedInPrompt && !status.isRequired && (
                                <Badge variant="secondary" className="text-xs">
                                  Usado no Prompt
                                </Badge>
                              )}
                              {field.hasData ? (
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                              ) : (
                                <AlertCircle className="h-3 w-3 text-amber-500" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};