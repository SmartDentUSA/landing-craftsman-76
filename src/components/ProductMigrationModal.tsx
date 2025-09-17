import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, AlertTriangle, Database, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProductMigrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MigrationResult {
  success: boolean;
  totalProducts: number;
  migratedProducts: number;
  migrationLog: Array<{
    landing_page_id: string;
    product_name: string;
    action: string;
  }>;
}

export const ProductMigrationModal = ({ open, onOpenChange }: ProductMigrationModalProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [step, setStep] = useState<'preview' | 'confirm' | 'running' | 'complete'>('preview');

  const runPreview = async () => {
    setIsLoading(true);
    setStep('preview');
    
    try {
      const { data, error } = await supabase.functions.invoke('migrate-products-to-repository', {
        body: { dryRun: true }
      });

      if (error) throw error;

      setMigrationResult(data);
      setStep('confirm');
    } catch (error) {
      console.error('Error running migration preview:', error);
      toast({
        title: "Erro na prévia",
        description: "Não foi possível executar a prévia da migração. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const runMigration = async () => {
    setIsLoading(true);
    setStep('running');
    
    try {
      const { data, error } = await supabase.functions.invoke('migrate-products-to-repository', {
        body: { dryRun: false }
      });

      if (error) throw error;

      setMigrationResult(data);
      setStep('complete');
      
      toast({
        title: "Migração concluída!",
        description: `${data.migratedProducts} produtos foram migrados para o repositório.`,
      });
    } catch (error) {
      console.error('Error running migration:', error);
      toast({
        title: "Erro na migração",
        description: "Não foi possível executar a migração. Tente novamente.",
        variant: "destructive",
      });
      setStep('confirm');
    } finally {
      setIsLoading(false);
    }
  };

  const resetModal = () => {
    setStep('preview');
    setMigrationResult(null);
    setIsLoading(false);
  };

  const handleClose = () => {
    resetModal();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Migração para Repositório de Produtos
          </DialogTitle>
          <DialogDescription>
            Migre produtos existentes das landing pages para o repositório centralizado
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step: Preview */}
          {step === 'preview' && (
            <>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Esta migração irá buscar produtos de todas as landing pages e consolidá-los no repositório central. 
                  Clique em "Executar Prévia" para ver quantos produtos serão migrados.
                </AlertDescription>
              </Alert>
              
              <div className="flex justify-center">
                <Button 
                  onClick={runPreview}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? 'Analisando...' : 'Executar Prévia'}
                </Button>
              </div>
            </>
          )}

          {/* Step: Confirm */}
          {step === 'confirm' && migrationResult && (
            <>
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Prévia da migração:</strong>
                  <br />
                  • {migrationResult.totalProducts} produtos encontrados
                  <br />
                  • {migrationResult.migratedProducts} novos produtos serão adicionados
                  <br />
                  • Produtos duplicados serão ignorados automaticamente
                </AlertDescription>
              </Alert>

              {migrationResult.migrationLog.length > 0 && (
                <div className="max-h-40 overflow-y-auto border rounded p-3 bg-muted/30">
                  <h4 className="font-medium mb-2">Produtos a serem migrados:</h4>
                  {migrationResult.migrationLog.slice(0, 10).map((log, index) => (
                    <div key={index} className="text-sm text-muted-foreground">
                      • {log.product_name} ({log.landing_page_id})
                    </div>
                  ))}
                  {migrationResult.migrationLog.length > 10 && (
                    <div className="text-sm text-muted-foreground">
                      ... e mais {migrationResult.migrationLog.length - 10} produtos
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={resetModal} className="flex-1">
                  Cancelar
                </Button>
                <Button onClick={runMigration} disabled={isLoading} className="flex-1">
                  Confirmar Migração
                </Button>
              </div>
            </>
          )}

          {/* Step: Running */}
          {step === 'running' && (
            <>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Migração em andamento... Não feche esta janela.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <Progress value={undefined} className="w-full" />
                <p className="text-sm text-center text-muted-foreground">
                  Migrando produtos para o repositório...
                </p>
              </div>
            </>
          )}

          {/* Step: Complete */}
          {step === 'complete' && migrationResult && (
            <>
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Migração concluída com sucesso!</strong>
                  <br />
                  • {migrationResult.migratedProducts} produtos foram migrados
                  <br />
                  • O repositório está pronto para uso na geração de conteúdo
                </AlertDescription>
              </Alert>

              <div className="flex justify-center">
                <Button onClick={handleClose} className="w-full">
                  Fechar
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};