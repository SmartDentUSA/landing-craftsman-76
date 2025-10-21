import { Button } from "@/components/ui/button";
import { AlertCircle, ExternalLink } from "lucide-react";

interface BlogData {
  title?: string;
  content?: string;
  meta_description?: string;
  keywords?: string[] | string;
  [key: string]: any;
}

interface StrategicBlogPreviewProps {
  dentalaData: BlogData | null;
  eodontoData: BlogData | null;
  approvedLandingPages: any[];
  selectedProductIds?: string[];
  refreshKey?: number;
  landingPageId: string;
}

export function StrategicBlogPreview({
  dentalaData,
  eodontoData,
  approvedLandingPages,
  selectedProductIds = [],
  refreshKey = 0,
  landingPageId,
}: StrategicBlogPreviewProps) {
  return (
    <div className="w-full">
      {/* Mensagem direciona ao Dashboard para geração */}
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-800 mb-1">
              📋 Geração de HTML Consolidado
            </p>
            <p className="text-xs text-blue-700 mb-3">
              Os HTMLs consolidados são gerados no <strong>Dashboard</strong> para todas as landing pages aprovadas de uma só vez.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.location.href = '/dashboard'}
              className="bg-white hover:bg-blue-50"
            >
              <ExternalLink className="h-3 w-3 mr-2" />
              Ir para o Dashboard
            </Button>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        💡 Após gerar, você pode visualizar e copiar os HTMLs consolidados (Dentala + Eodonto) diretamente no Dashboard.
      </p>
    </div>
  );
}
