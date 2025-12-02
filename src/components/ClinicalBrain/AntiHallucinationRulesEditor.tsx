import { CircleSlash, Ban, OctagonX, CheckCircle2, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { TagInput } from '@/components/ui/tag-input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { AntiHallucinationRules, DEFAULT_ANTI_HALLUCINATION_RULES } from './types';

interface AntiHallucinationRulesEditorProps {
  rules: AntiHallucinationRules;
  onChange: (rules: AntiHallucinationRules) => void;
}

const RULE_SECTIONS = [
  {
    key: 'never_claim' as const,
    icon: CircleSlash,
    label: 'Nunca Afirmar',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    description: 'Frases que a IA nunca deve dizer sobre este produto',
    placeholder: 'Ex: "substitui completamente", "100% eficaz", "sem contraindicações"'
  },
  {
    key: 'never_mix_with' as const,
    icon: Ban,
    label: 'Nunca Misturar Com',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    description: 'Produtos/substâncias que são clinicamente incompatíveis',
    placeholder: 'Ex: "eugenol", "hipoclorito de sódio", "resinas tipo X"'
  },
  {
    key: 'never_use_in_stages' as const,
    icon: OctagonX,
    label: 'Nunca Usar em Etapas',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    description: 'Etapas do workflow onde este produto NÃO deve ser usado',
    placeholder: 'Ex: "pós-cura", "moldagem inicial", "acabamento final"'
  },
  {
    key: 'always_require' as const,
    icon: CheckCircle2,
    label: 'Sempre Mencionar',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    description: 'Informações obrigatórias que sempre devem acompanhar este produto',
    placeholder: 'Ex: "usar EPI", "tempo de presa", "armazenamento refrigerado"'
  },
  {
    key: 'always_explain' as const,
    icon: BookOpen,
    label: 'Sempre Explicar',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    description: 'Conceitos técnicos que sempre devem ser detalhados',
    placeholder: 'Ex: "técnica de aplicação", "protocolo de cura", "compatibilidade"'
  }
];

export default function AntiHallucinationRulesEditor({ 
  rules, 
  onChange 
}: AntiHallucinationRulesEditorProps) {
  const safeRules = rules || DEFAULT_ANTI_HALLUCINATION_RULES;

  const handleChange = (key: keyof AntiHallucinationRules, values: string[]) => {
    onChange({
      ...safeRules,
      [key]: values
    });
  };

  const totalRules = Object.values(safeRules).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <CircleSlash className="h-4 w-4 text-purple-600" />
        <Label className="text-sm font-medium">Regras Anti-Alucinação</Label>
        {totalRules > 0 && (
          <Badge variant="outline" className="text-xs">
            {totalRules} regras
          </Badge>
        )}
      </div>
      
      <p className="text-xs text-muted-foreground">
        Configure restrições e obrigações para garantir que a IA gere conteúdo clinicamente preciso
      </p>

      <Accordion type="multiple" className="w-full">
        {RULE_SECTIONS.map((section) => {
          const Icon = section.icon;
          const count = safeRules[section.key]?.length || 0;
          
          return (
            <AccordionItem key={section.key} value={section.key}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <div className={`p-1 rounded ${section.bgColor}`}>
                    <Icon className={`h-4 w-4 ${section.color}`} />
                  </div>
                  <span className="text-sm font-medium">{section.label}</span>
                  {count > 0 && (
                    <Badge variant="secondary" className="text-xs ml-2">
                      {count}
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 pt-2">
                  <p className="text-xs text-muted-foreground">{section.description}</p>
                  <TagInput
                    value={safeRules[section.key] || []}
                    onChange={(values) => handleChange(section.key, values)}
                    placeholder={section.placeholder}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
