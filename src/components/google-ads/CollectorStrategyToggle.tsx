import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Target, Users } from 'lucide-react';
import type { CollectorStrategy } from '@/types/google-ads';

interface CollectorStrategyToggleProps {
  /** Override local (não persiste no DB) — usado para experimentação por campanha */
  value?: CollectorStrategy;
  onChange?: (strategy: CollectorStrategy) => void;
  /** Se true, persiste em company_profile.default_collector_strategy */
  persistGlobal?: boolean;
}

export const CollectorStrategyToggle = ({
  value,
  onChange,
  persistGlobal = false,
}: CollectorStrategyToggleProps) => {
  const { toast } = useToast();
  const [strategy, setStrategy] = useState<CollectorStrategy>(value ?? 'niche');
  const [loading, setLoading] = useState(persistGlobal);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!persistGlobal) {
      if (value) setStrategy(value);
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from('company_profile')
        .select('default_collector_strategy')
        .limit(1)
        .maybeSingle();
      if (!error && data?.default_collector_strategy) {
        setStrategy(data.default_collector_strategy as CollectorStrategy);
      }
      setLoading(false);
    })();
  }, [persistGlobal, value]);

  const handleChange = async (next: CollectorStrategy) => {
    setStrategy(next);
    onChange?.(next);

    if (!persistGlobal) return;
    setSaving(true);
    const { data: profile } = await supabase
      .from('company_profile')
      .select('id')
      .limit(1)
      .maybeSingle();
    if (profile?.id) {
      const { error } = await supabase
        .from('company_profile')
        .update({ default_collector_strategy: next })
        .eq('id', profile.id);
      if (error) {
        toast({
          title: 'Erro ao salvar estratégia',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Estratégia atualizada',
          description: `Padrão alterado para "${next === 'niche' ? 'Nicho' : 'Massa'}".`,
        });
      }
    }
    setSaving(false);
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Estratégia do Coletor de Keywords</CardTitle>
          {saving && <Badge variant="secondary">Salvando…</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={strategy}
          onValueChange={(v) => handleChange(v as CollectorStrategy)}
          className="grid grid-cols-1 md:grid-cols-2 gap-3"
        >
          <label
            htmlFor="strategy-niche"
            className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors ${
              strategy === 'niche'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:bg-accent'
            }`}
          >
            <RadioGroupItem value="niche" id="strategy-niche" className="mt-1" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Nicho (B2B / técnico)</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Match types restritos (PHRASE/EXACT), thresholds altos, foco em intenção comercial.
                Recomendado para SmartDent e produtos especializados.
              </p>
            </div>
          </label>

          <label
            htmlFor="strategy-mass"
            className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors ${
              strategy === 'mass'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:bg-accent'
            }`}
          >
            <RadioGroupItem value="mass" id="strategy-mass" className="mt-1" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Massa (B2C / volume)</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Mais BROAD, thresholds permissivos, captura de cauda longa.
                Recomendado para produtos com alto volume de busca.
              </p>
            </div>
          </label>
        </RadioGroup>
      </CardContent>
    </Card>
  );
};
