import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import type { QualityReport } from '@/types/google-ads';

interface QualityReportPanelProps {
  report: QualityReport | null | undefined;
}

function getTone(score: number) {
  if (score >= 85) return { label: 'Excelente', variant: 'default' as const, className: 'bg-primary text-primary-foreground' };
  if (score >= 70) return { label: 'Bom — revise antes de subir', variant: 'secondary' as const, className: 'bg-secondary text-secondary-foreground' };
  if (score >= 50) return { label: 'Regular — recomendado regenerar', variant: 'outline' as const, className: 'border-warning text-warning' };
  return { label: 'Crítico — não suba sem revisar', variant: 'destructive' as const, className: '' };
}

export const QualityReportPanel = ({ report }: QualityReportPanelProps) => {
  if (!report) return null;

  const tone = getTone(report.score);
  const Icon = report.score >= 70 ? CheckCircle2 : AlertTriangle;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-accent transition-colors"
          aria-label="Ver detalhes do quality score"
        >
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Score: {report.score}</span>
          <Badge variant={tone.variant} className={tone.className}>
            {tone.label}
          </Badge>
          <Info className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-96 bg-popover text-popover-foreground" align="start">
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-semibold">Quality Report</h4>
            <p className="text-xs text-muted-foreground">
              Análise programática dos anúncios gerados (v3).
            </p>
          </div>

          <div className="space-y-1.5">
            {Object.entries(report.breakdown).map(([key, item]) => (
              <div key={key} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {key.replace(/_/g, ' ')}
                </span>
                <span className={item.penalty < 0 ? 'text-destructive font-medium' : 'text-foreground'}>
                  {item.count} ({item.penalty})
                </span>
              </div>
            ))}
          </div>

          {report.warnings.length > 0 && (
            <div className="border-t border-border pt-2">
              <p className="text-xs font-medium mb-1">Avisos:</p>
              <ul className="space-y-1">
                {report.warnings.map((w, i) => (
                  <li key={i} className="text-xs text-muted-foreground">• {w}</li>
                ))}
              </ul>
            </div>
          )}

          {report.requires_prompt_revision && (
            <div className="rounded-md bg-destructive/10 border border-destructive/30 p-2">
              <p className="text-xs text-destructive font-medium">
                ⚠ Recomenda-se revisão do prompt gerador (mais de 5 headlines truncados).
              </p>
            </div>
          )}

          {report.validation_errors.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                {report.validation_errors.length} erro(s) de validação
              </summary>
              <ul className="mt-1 space-y-0.5 pl-3">
                {report.validation_errors.slice(0, 5).map((err, i) => (
                  <li key={i} className="text-muted-foreground">• {err}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
