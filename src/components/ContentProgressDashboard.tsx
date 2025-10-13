import { LandingPageProgressManager } from './LandingPageProgressManager';
import { ProductProgressManager } from './ProductProgressManager';

export function ContentProgressDashboard() {
  return (
    <div className="space-y-12">
      {/* SEÇÃO 1: LANDING PAGES */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-1 bg-blue-500 rounded-full" />
          <div>
            <h2 className="text-2xl font-bold">📄 Landing Pages</h2>
            <p className="text-sm text-muted-foreground">
              Monitore o progresso de preenchimento das suas landing pages
            </p>
          </div>
        </div>
        
        <LandingPageProgressManager />
      </section>

      {/* SEPARADOR VISUAL */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t-2 border-dashed" />
        </div>
      </div>

      {/* SEÇÃO 2: PRODUTOS */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-1 bg-amber-500 rounded-full" />
          <div>
            <h2 className="text-2xl font-bold">📦 Produtos</h2>
            <p className="text-sm text-muted-foreground">
              Acompanhe a completude dos produtos do repositório
            </p>
          </div>
        </div>
        
        <ProductProgressManager />
      </section>
    </div>
  );
}
