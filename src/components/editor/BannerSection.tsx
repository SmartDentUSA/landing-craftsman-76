import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploader } from "@/components/ImageUploader";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2 } from "lucide-react";

interface ImageData {
  mode: 'url' | 'supabase' | 'company';
  src: string;
  supabase_path?: string;
  alt: string;
  scale: number;
  href?: string;
}

interface BannerData {
  badge_text: string;
  title: string;
  subtitle: string;
  cta_primary: { label: string; href: string; visible?: boolean };
  cta_secondary: { label: string; href: string; visible?: boolean };
  images: Array<ImageData>;
}

interface BannerSectionProps {
  data: BannerData;
  onChange: (data: BannerData) => void;
}

const createImageData = (src: string = '', alt: string = ''): ImageData => ({
  mode: 'url',
  src,
  supabase_path: undefined,
  alt,
  scale: 1.0
});

export function BannerSection({ data, onChange }: BannerSectionProps) {
  const updateField = <K extends keyof BannerData>(field: K, value: BannerData[K]) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Badge (Selo acima do título)</Label>
        <Input
          value={data.badge_text}
          onChange={(e) => updateField('badge_text', e.target.value)}
          placeholder="Ex: Lançamento 2024"
        />
      </div>

      <div>
        <Label>Título Principal (H1)</Label>
        <Input
          value={data.title}
          onChange={(e) => updateField('title', e.target.value)}
          placeholder="Título principal da página"
        />
      </div>

      <div>
        <Label>Subtítulo</Label>
        <Textarea
          value={data.subtitle}
          onChange={(e) => updateField('subtitle', e.target.value)}
          placeholder="Subtítulo descritivo"
          rows={3}
        />
      </div>

      {/* CTA Primary */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Switch
            checked={data.cta_primary.visible !== false}
            onCheckedChange={(checked) => 
              updateField('cta_primary', { ...data.cta_primary, visible: checked })
            }
          />
          <Label>CTA Primário Visível</Label>
        </div>
        {data.cta_primary.visible !== false && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Texto</Label>
              <Input
                value={data.cta_primary.label}
                onChange={(e) => 
                  updateField('cta_primary', { ...data.cta_primary, label: e.target.value })
                }
                placeholder="Ex: Saiba mais"
              />
            </div>
            <div>
              <Label>Link</Label>
              <Input
                value={data.cta_primary.href}
                onChange={(e) => 
                  updateField('cta_primary', { ...data.cta_primary, href: e.target.value })
                }
                placeholder="https://..."
              />
            </div>
          </div>
        )}
      </div>

      {/* CTA Secondary */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Switch
            checked={data.cta_secondary.visible === true}
            onCheckedChange={(checked) => 
              updateField('cta_secondary', { ...data.cta_secondary, visible: checked })
            }
          />
          <Label>CTA Secundário Visível</Label>
        </div>
        {data.cta_secondary.visible === true && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Texto</Label>
              <Input
                value={data.cta_secondary.label}
                onChange={(e) => 
                  updateField('cta_secondary', { ...data.cta_secondary, label: e.target.value })
                }
                placeholder="Ex: Fale conosco"
              />
            </div>
            <div>
              <Label>Link</Label>
              <Input
                value={data.cta_secondary.href}
                onChange={(e) => 
                  updateField('cta_secondary', { ...data.cta_secondary, href: e.target.value })
                }
                placeholder="https://..."
              />
            </div>
          </div>
        )}
      </div>

      {/* Imagens do Banner */}
      <div className="space-y-4">
        <Label>Imagens do Banner (Máx: 4)</Label>
        {(data.images || []).map((image, index) => (
          <div key={index} className="p-4 border rounded-lg space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Imagem {index + 1}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const newImages = data.images.filter((_, i) => i !== index);
                  updateField('images', newImages);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <ImageUploader
              value={image}
              onChange={(imageData) => {
                const newImages = [...data.images];
                newImages[index] = imageData;
                updateField('images', newImages);
              }}
              placeholder={`URL da imagem ${index + 1}`}
            />
          </div>
        ))}

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            updateField('images', [...data.images, createImageData()]);
          }}
          disabled={(data.images?.length || 0) >= 4}
        >
          <Plus className="h-4 w-4 mr-2" />
          {(data.images?.length || 0) >= 4 ? "Máximo de 4 imagens" : "Adicionar Imagem"}
        </Button>
      </div>
    </div>
  );
}
