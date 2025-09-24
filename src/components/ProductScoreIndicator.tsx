import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScoreBreakdown, getScoreColor, getScoreLabel } from './ProductScoreCalculator';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface ProductScoreIndicatorProps {
  score: ScoreBreakdown;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}

export function ProductScoreIndicator({ score, size = 'md', showDetails = false }: ProductScoreIndicatorProps) {
  const colorVariant = getScoreColor(score.percentage);
  const label = getScoreLabel(score.percentage);
  
  const getIcon = () => {
    if (score.percentage >= 90) return <CheckCircle className="h-4 w-4" />;
    if (score.percentage >= 50) return <AlertTriangle className="h-4 w-4" />;
    return <XCircle className="h-4 w-4" />;
  };

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const ScoreDisplay = () => (
    <div className={`flex items-center gap-2 ${sizeClasses[size]}`}>
      <div className="flex items-center gap-1">
        {getIcon()}
        <span className="font-bold">{score.percentage}%</span>
      </div>
      <Badge variant={colorVariant as any} className="text-xs">
        {label}
      </Badge>
    </div>
  );

  const ScoreDetails = () => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>Básico: {score.details.basicInfo}/25</div>
        <div>Conteúdo: {score.details.content}/30</div>
        <div>Mídia: {score.details.multimedia}/20</div>
        <div>SEO: {score.details.seo}/15</div>
        <div>Comercial: {score.details.commercial}/10</div>
      </div>
      
      <Progress value={score.percentage} className="h-2" />
      
      {score.missingFields.length > 0 && (
        <div className="mt-2">
          <p className="text-xs font-medium text-muted-foreground mb-1">
            Campos em falta:
          </p>
          <div className="flex flex-wrap gap-1">
            {score.missingFields.slice(0, 6).map((field, index) => (
              <Badge key={index} variant="outline" className="text-xs py-0 px-1">
                {field}
              </Badge>
            ))}
            {score.missingFields.length > 6 && (
              <Badge variant="outline" className="text-xs py-0 px-1">
                +{score.missingFields.length - 6} mais
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );

  if (!showDetails) {
    return <ScoreDisplay />;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-pointer">
            <ScoreDisplay />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="w-80 p-4">
          <ScoreDetails />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}