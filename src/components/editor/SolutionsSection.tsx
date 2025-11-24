import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploader } from "@/components/ImageUploader";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Plus, Trash2 } from "lucide-react";

interface ImageData {
  mode: 'url' | 'supabase' | 'company';
  src: string;
  supabase_path?: string;
  alt: string;
  scale: number;
  href?: string;
}

interface Solution {
  text: string;
  image: ImageData;
  containerScale?: number;
}

interface SolutionsSectionProps {
  title: string;
  solutions: Solution[];
  onTitleChange: (title: string) => void;
  onSolutionsChange: (solutions: Solution[]) => void;
}

const createImageData = (src: string = '', alt: string = ''): ImageData => ({
  mode: 'url',
  src,
  supabase_path: undefined,
  alt,
  scale: 1.0
});

export function SolutionsSection({ title, solutions, onTitleChange, onSolutionsChange }: SolutionsSectionProps) {
  const getProportionInfo = (idx: number) => {
    if (idx <= 2) {
      return "480x720px ou 768x1152px ou 1200x1800px - Proporção vertical 2:3 (mais altas que largas)";
    } else {
      return "480x320px ou 768x512px ou 1200x800px - Proporção horizontal 3:2 (mais largas que altas)";
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Título da Seção</Label>
        <Input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Título da seção de soluções"
        />
      </div>

      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">
          {solutions.length}/5 soluções
        </span>
      </div>

      {solutions.map((solution, index) => (
        <div key={index} className="p-4 border rounded-lg space-y-4">
          <div className="flex justify-between items-center">
            <Label>Solução {index + 1}</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const newSolutions = solutions.filter((_, i) => i !== index);
                onSolutionsChange(newSolutions);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <div>
            <Label>Texto</Label>
            <Textarea
              value={solution.text}
              onChange={(e) => {
                const newSolutions = [...solutions];
                newSolutions[index].text = e.target.value;
                onSolutionsChange(newSolutions);
              }}
              placeholder="Descrição da solução"
              rows={3}
            />
          </div>

          <div>
            <Label>Imagem da Solução {index + 1}</Label>
            <ImageUploader
              value={solution.image}
              onChange={(imageData) => {
                const newSolutions = [...solutions];
                newSolutions[index].image = imageData;
                onSolutionsChange(newSolutions);
              }}
              placeholder={`URL da imagem da solução ${index + 1}`}
              proportionInfo={getProportionInfo(index)}
            />
          </div>

          <div>
            <Label>Proporção do Container (Desktop)</Label>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Mínimo (0.3)</span>
                <span>Normal (1.0)</span>
                <span>Destaque (2.0)</span>
              </div>
              <Slider
                value={[solution.containerScale || 1.0]}
                onValueChange={(value) => {
                  console.log(`🎚️ [SLIDER] Alterando containerScale da solução ${index} para:`, value[0]);
                  const newSolutions = [...solutions];
                  newSolutions[index].containerScale = value[0];
                  onSolutionsChange(newSolutions);
                  
                  // Forçar re-render
                  setTimeout(() => {
                    console.log('✅ [SLIDER] Mudança aplicada, preview deve regenerar');
                  }, 100);
                }}
                min={0.3}
                max={2.0}
                step={0.1}
                className="w-full"
              />
              <div className="text-sm text-muted-foreground">
                Atual: {(solution.containerScale || 1.0).toFixed(1)}x
                {!solution.image?.src && solution.containerScale && solution.containerScale > 0.6 && (
                  <span className="text-orange-600 ml-2">
                    ⚠️ Sugestão: Use escala menor (≤0.5) para containers sem imagem
                  </span>
                )}
                {solution.image?.src && solution.containerScale && solution.containerScale < 0.7 && (
                  <span className="text-blue-600 ml-2">
                    💡 Sugestão: Use escala maior (≥0.8) para destacar conteúdo com imagem
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}

      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          onSolutionsChange([...solutions, { text: '', image: createImageData(), containerScale: 1.0 }]);
        }}
        disabled={solutions.length >= 5}
      >
        <Plus className="h-4 w-4 mr-2" />
        {solutions.length >= 5 ? "Máximo de 5 soluções atingido" : "Adicionar Solução"}
      </Button>
    </div>
  );
}
