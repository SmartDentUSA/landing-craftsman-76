import { useState, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { FileText, Image, BookOpen, Globe, Database } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = [
  { id: 'basic', title: 'Informações Básicas', icon: FileText, fields: ['name', 'status'] },
  { id: 'banner', title: 'Banner Principal', icon: Image, fields: ['banner'] },
  { id: 'content', title: 'Conteúdo', icon: BookOpen, fields: ['solutions', 'desktop_info'] },
  { id: 'seo', title: 'SEO & Social', icon: Globe, fields: ['seo'] },
  { id: 'schema', title: 'Schema.org', icon: Database, fields: ['schema'] }
];

interface EditorWizardProps {
  children: ReactNode;
  data: any;
  onComplete: () => void;
}

export function EditorWizard({ children, data, onComplete }: EditorWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const currentStepConfig = STEPS[currentStep];
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const validateStep = () => {
    // Basic validation - pode ser expandido
    return true;
  };

  const handleNext = () => {
    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps([...completedSteps, currentStep]);
    }
    
    if (currentStep === STEPS.length - 1) {
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  return (
    <div className="wizard-container space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <Progress value={progress} className="h-2" />
        <div className="flex items-center justify-between px-1">
          {STEPS.map((step, idx) => (
            <div
              key={step.id}
              className={cn(
                "flex flex-col items-center gap-2 cursor-pointer transition-all",
                idx <= currentStep && "opacity-100",
                idx > currentStep && "opacity-40"
              )}
              onClick={() => idx <= currentStep && setCurrentStep(idx)}
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all",
                  idx < currentStep && "bg-primary border-primary text-primary-foreground",
                  idx === currentStep && "border-primary text-primary",
                  idx > currentStep && "border-muted text-muted-foreground"
                )}
              >
                <step.icon className="h-5 w-5" />
              </div>
              <span className={cn(
                "text-xs font-medium hidden sm:block",
                idx === currentStep && "text-primary"
              )}>
                {step.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Current Step Content */}
      <div className="wizard-content min-h-[400px]">
        {children}
      </div>

      {/* Navigation */}
      <div className="wizard-nav flex justify-between pt-4 border-t">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 0}
        >
          Anterior
        </Button>

        <div className="text-sm text-muted-foreground">
          Passo {currentStep + 1} de {STEPS.length}
        </div>

        <Button
          onClick={handleNext}
          disabled={!validateStep()}
        >
          {currentStep === STEPS.length - 1 ? 'Concluir' : 'Próximo'}
        </Button>
      </div>
    </div>
  );
}
