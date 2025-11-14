import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { TagInput } from "@/components/ui/tag-input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Scan, PenTool, Printer, Settings, Sparkles, Home, ArrowRight } from "lucide-react";

const WORKFLOW_STAGES = [
  { 
    key: 'scan', 
    label: 'Scanear', 
    icon: Scan,
    color: 'text-blue-500',
    description: 'Captura digital da anatomia bucal'
  },
  { 
    key: 'design', 
    label: 'Desenhar', 
    icon: PenTool,
    color: 'text-purple-500',
    description: 'Planejamento CAD da restauração'
  },
  { 
    key: 'print', 
    label: 'Imprimir', 
    icon: Printer,
    color: 'text-green-500',
    description: 'Fabricação via impressão 3D'
  },
  { 
    key: 'process', 
    label: 'Processar', 
    icon: Settings,
    color: 'text-orange-500',
    description: 'Pós-processamento (lavagem, cura)'
  },
  { 
    key: 'finish', 
    label: 'Finalizar', 
    icon: Sparkles,
    color: 'text-pink-500',
    description: 'Acabamento e polimento'
  },
  { 
    key: 'install', 
    label: 'Instalar', 
    icon: Home,
    color: 'text-indigo-500',
    description: 'Cimentação e instalação'
  }
];

const ROLE_OPTIONS = [
  { value: 'principal', label: 'Principal', description: 'Produto essencial nesta etapa' },
  { value: 'acessorio', label: 'Acessório', description: 'Produto complementar' },
  { value: 'consumivel', label: 'Consumível', description: 'Material de uso único' }
];

interface WorkflowStage {
  applicable: boolean;
  role: 'principal' | 'acessorio' | 'consumivel' | null;
  description: string | null;
  pain_points_addressed: string[];
  competitive_advantages: string[];
  related_materials: string[];
}

interface WorkflowStages {
  scan?: WorkflowStage;
  design?: WorkflowStage;
  print?: WorkflowStage;
  process?: WorkflowStage;
  finish?: WorkflowStage;
  install?: WorkflowStage;
}

interface WorkflowStagesSectionProps {
  workflowStages: WorkflowStages | null;
  onChange: (stages: WorkflowStages) => void;
}

export function WorkflowStagesSection({ workflowStages, onChange }: WorkflowStagesSectionProps) {
  const stages = workflowStages || getDefaultStages();
  
  const handleStageChange = (stageKey: string, field: string, value: any) => {
    const updatedStages = {
      ...stages,
      [stageKey]: {
        ...(stages[stageKey as keyof WorkflowStages] || getDefaultStageData()),
        [field]: value
      }
    };
    onChange(updatedStages);
  };

  const applicableStages = WORKFLOW_STAGES.filter(
    stage => stages[stage.key as keyof WorkflowStages]?.applicable
  );

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5 text-primary" />
              Workflow Odontológico Digital
            </CardTitle>
            <CardDescription>
              Defina em quais etapas do processo este produto é utilizado
            </CardDescription>
          </div>
          {applicableStages.length > 0 && (
            <div className="flex gap-1">
              {applicableStages.map(stage => {
                const Icon = stage.icon;
                return (
                  <Badge key={stage.key} variant="secondary" className="gap-1">
                    <Icon className={`h-3 w-3 ${stage.color}`} />
                    {stage.label}
                  </Badge>
                );
              })}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="space-y-4">
          {WORKFLOW_STAGES.map((stage) => {
            const stageData = stages[stage.key as keyof WorkflowStages];
            const Icon = stage.icon;
            
            return (
              <AccordionItem 
                key={stage.key} 
                value={stage.key}
                className={`border rounded-lg ${stageData.applicable ? 'border-primary/50 bg-primary/5' : ''}`}
              >
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center gap-3 flex-1">
                    <Icon className={`h-5 w-5 ${stage.color}`} />
                    <div className="text-left flex-1">
                      <div className="font-semibold">{stage.label}</div>
                      <div className="text-sm text-muted-foreground">{stage.description}</div>
                    </div>
                    <Switch
                      checked={stageData.applicable}
                      onClick={(e) => e.stopPropagation()}
                      onCheckedChange={(checked) => {
                        handleStageChange(stage.key, 'applicable', checked);
                        if (!checked) {
                          handleStageChange(stage.key, 'role', null);
                          handleStageChange(stage.key, 'description', null);
                        }
                      }}
                    />
                  </div>
                </AccordionTrigger>
                
                {stageData.applicable && (
                  <AccordionContent className="px-4 pb-4 space-y-4">
                    {/* Role Selection */}
                    <div className="space-y-2">
                      <Label>Tipo de Participação</Label>
                      <RadioGroup
                        value={stageData.role || ''}
                        onValueChange={(value) => handleStageChange(stage.key, 'role', value)}
                      >
                        {ROLE_OPTIONS.map(option => (
                          <div key={option.value} className="flex items-center space-x-2">
                            <RadioGroupItem value={option.value} id={`${stage.key}-${option.value}`} />
                            <Label htmlFor={`${stage.key}-${option.value}`} className="flex-1 cursor-pointer">
                              <div className="font-medium">{option.label}</div>
                              <div className="text-sm text-muted-foreground">{option.description}</div>
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <Label>Descrição de Uso</Label>
                      <Textarea
                        value={stageData.description || ''}
                        onChange={(e) => handleStageChange(stage.key, 'description', e.target.value)}
                        placeholder={`Como o produto é utilizado na etapa de ${stage.label.toLowerCase()}?`}
                        rows={3}
                      />
                    </div>

                    {/* Pain Points */}
                    <div className="space-y-2">
                      <Label>Dores Resolvidas Nesta Etapa</Label>
                      <TagInput
                        value={stageData.pain_points_addressed || []}
                        onChange={(tags) => handleStageChange(stage.key, 'pain_points_addressed', tags)}
                        placeholder="Ex: Tempo de processamento, Precisão dimensional..."
                      />
                    </div>

                    {/* Competitive Advantages */}
                    <div className="space-y-2">
                      <Label>Vantagens Competitivas</Label>
                      <TagInput
                        value={stageData.competitive_advantages || []}
                        onChange={(tags) => handleStageChange(stage.key, 'competitive_advantages', tags)}
                        placeholder="Ex: 147 MPa resistência, Protocolo simplificado..."
                      />
                    </div>
                  </AccordionContent>
                )}
              </AccordionItem>
            );
          })}
        </Accordion>

        {applicableStages.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <ArrowRight className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Ative as etapas onde este produto é utilizado</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getDefaultStages(): WorkflowStages {
  return {
    scan: getDefaultStageData(),
    design: getDefaultStageData(),
    print: getDefaultStageData(),
    process: getDefaultStageData(),
    finish: getDefaultStageData(),
    install: getDefaultStageData()
  };
}

function getDefaultStageData(): WorkflowStage {
  return {
    applicable: false,
    role: null,
    description: null,
    pain_points_addressed: [],
    competitive_advantages: [],
    related_materials: []
  };
}
