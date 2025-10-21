import { AlertCircle } from 'lucide-react';

interface ConsolidatedBlogCopyPasteProps {
  approvedLandingPages: any[];
}

export function ConsolidatedBlogCopyPaste({ 
  approvedLandingPages
}: ConsolidatedBlogCopyPasteProps) {
  return (
    <div className="w-full p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-800 mb-2">
            📋 Geração de HTMLs Consolidados
          </p>
          <div className="text-xs text-blue-700 space-y-2">
            <p>
              Os HTMLs consolidados (Dentala + Eodonto) são gerados no <strong>Dashboard</strong> 
              para todas as landing pages aprovadas de uma só vez.
            </p>
            
            <p className="font-medium mt-3">🎯 Como gerar:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Termine de editar o conteúdo da landing page</li>
              <li>Salve e aprove a landing page</li>
              <li>Vá ao <strong>Dashboard</strong></li>
              <li>Clique em <strong>"Gerar/Atualizar HTMLs Consolidados"</strong></li>
            </ol>
            
            <p className="font-medium mt-3">💡 Vantagens:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Geração em lote (1x para todas as LPs)</li>
              <li>Cache persistente (banco de dados + localStorage)</li>
              <li>Melhor performance e organização</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
