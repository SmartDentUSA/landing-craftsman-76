import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';
import { ValidationWarning } from '@/types/google-ads';

interface WarningsPanelProps {
  warnings: ValidationWarning[];
}

export const WarningsPanel = ({ warnings }: WarningsPanelProps) => {
  const getWarningIcon = (type: ValidationWarning['type']) => {
    switch (type) {
      case 'error':
        return <XCircle className="w-4 h-4 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'info':
        return <Info className="w-4 h-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const getWarningVariant = (type: ValidationWarning['type']) => {
    switch (type) {
      case 'error':
        return 'destructive';
      case 'warning':
        return 'secondary';
      case 'info':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const errorCount = warnings.filter(w => w.type === 'error').length;
  const warningCount = warnings.filter(w => w.type === 'warning').length;
  const infoCount = warnings.filter(w => w.type === 'info').length;

  return (
    <Card className={warnings.length === 0 ? 'border-green-200 bg-green-50' : ''}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {warnings.length === 0 ? (
            <>
              <CheckCircle className="w-5 h-5 text-green-600" />
              Configuração Válida
            </>
          ) : (
            <>
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Avisos e Validações
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {warnings.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-green-700 text-sm">
              ✅ Sua configuração está válida e pronta para export!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex gap-2 flex-wrap">
              {errorCount > 0 && (
                <Badge variant="destructive">
                  {errorCount} erro{errorCount > 1 ? 's' : ''}
                </Badge>
              )}
              {warningCount > 0 && (
                <Badge variant="secondary">
                  {warningCount} aviso{warningCount > 1 ? 's' : ''}
                </Badge>
              )}
              {infoCount > 0 && (
                <Badge variant="outline">
                  {infoCount} info{infoCount > 1 ? 's' : ''}
                </Badge>
              )}
            </div>

            {/* Warning List */}
            <div className="space-y-3">
              {warnings.map((warning, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${
                    warning.type === 'error' 
                      ? 'border-red-200 bg-red-50' 
                      : warning.type === 'warning'
                      ? 'border-amber-200 bg-amber-50'
                      : 'border-blue-200 bg-blue-50'
                  }`}
                >
                  {getWarningIcon(warning.type)}
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {warning.message}
                    </p>
                    {warning.field && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Campo: {warning.field}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Help Text */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>💡 Dica:</strong> Erros bloqueiam o export. Avisos são recomendações para melhorar a performance da campanha.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};