import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RestoreFromHTMLButtonProps {
  currentData: any;
  onRestore: (mergedData: any) => void;
}

/**
 * Extrai dados de seções do HTML publicado usando DOMParser.
 * Só retorna campos que conseguiu extrair do HTML.
 */
function extractDataFromHTML(html: string): Record<string, any> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const extracted: Record<string, any> = {};

  // === BANNER ===
  const h1 = doc.querySelector('h1');
  if (h1?.textContent?.trim()) {
    if (!extracted.banner) extracted.banner = {};
    extracted.banner.title = h1.textContent.trim();
    
    // Subtitle: primeiro <p> após o h1, ou dentro da mesma section
    const bannerSection = h1.closest('section') || h1.parentElement;
    const subtitle = bannerSection?.querySelector('p');
    if (subtitle?.textContent?.trim()) {
      extracted.banner.subtitle = subtitle.textContent.trim();
    }
  }

  // === ADVISORY SECTION ===
  // Buscar por seção com texto "Assessoria" ou similar
  const allSections = doc.querySelectorAll('section');
  for (const section of allSections) {
    const sectionText = section.textContent || '';
    const headings = section.querySelectorAll('h2, h3');
    
    for (const heading of headings) {
      const headingText = heading.textContent?.trim() || '';
      
      // Advisory: geralmente tem "Assessoria" ou "Consultoria"
      if (/assessoria|consultoria|advisory/i.test(headingText) || 
          /assessoria|consultoria/i.test(sectionText.substring(0, 200))) {
        if (!extracted.advisory_section) extracted.advisory_section = {};
        extracted.advisory_section.title = headingText;
        
        const paragraphs = section.querySelectorAll('p');
        const texts: string[] = [];
        paragraphs.forEach(p => {
          const t = p.textContent?.trim();
          if (t && t.length > 20) texts.push(t);
        });
        if (texts.length > 0) {
          extracted.advisory_section.paragraph = texts[0];
        }
      }
      
      // CTA Final: geralmente tem "Solicite" ou "Entre em contato" ou "Fale"
      if (/solicite|entre em contato|fale conosco|agende|orçamento/i.test(headingText)) {
        if (!extracted.cta_final_section) extracted.cta_final_section = {};
        extracted.cta_final_section.title = headingText;
        
        const paragraphs = section.querySelectorAll('p');
        paragraphs.forEach(p => {
          const t = p.textContent?.trim();
          if (t && t.length > 20 && !extracted.cta_final_section.paragraph) {
            extracted.cta_final_section.paragraph = t;
          }
        });
      }
    }
  }

  // === DESKTOP INFO ===
  // Buscar seção com tabela ou com classe desktop
  const tables = doc.querySelectorAll('table');
  if (tables.length > 0) {
    const tableSection = tables[0].closest('section');
    if (tableSection) {
      const heading = tableSection.querySelector('h2, h3');
      if (heading?.textContent?.trim()) {
        if (!extracted.desktop_info) extracted.desktop_info = {};
        extracted.desktop_info.title = heading.textContent.trim();
      }
      const introP = tableSection.querySelector('p');
      if (introP?.textContent?.trim()) {
        if (!extracted.desktop_info) extracted.desktop_info = {};
        extracted.desktop_info.text = introP.textContent.trim();
      }
    }
  }

  // === VIDEO SECTION ===
  const iframes = doc.querySelectorAll('iframe[src*="youtube"], iframe[src*="youtu.be"]');
  if (iframes.length > 0) {
    const videoSrc = iframes[0].getAttribute('src') || '';
    if (videoSrc) {
      if (!extracted.explanatory_video) extracted.explanatory_video = {};
      extracted.explanatory_video.enabled = true;
      extracted.explanatory_video.url = videoSrc;
      
      const videoSection = iframes[0].closest('section');
      if (videoSection) {
        const heading = videoSection.querySelector('h2, h3');
        if (heading?.textContent?.trim()) {
          extracted.explanatory_video.title = heading.textContent.trim();
        }
      }
    }
  }

  return extracted;
}

/**
 * Merge: só preenche campos vazios do currentData com dados extraídos do HTML.
 */
function mergeOnlyEmpty(current: any, extracted: any): any {
  const result = { ...current };
  
  for (const key of Object.keys(extracted)) {
    const extractedVal = extracted[key];
    const currentVal = result[key];
    
    if (typeof extractedVal === 'object' && extractedVal !== null && !Array.isArray(extractedVal)) {
      // Recursivo para objetos
      if (!currentVal || typeof currentVal !== 'object') {
        result[key] = extractedVal;
      } else {
        result[key] = { ...currentVal };
        for (const subKey of Object.keys(extractedVal)) {
          const cv = currentVal[subKey];
          // Só preenche se vazio/null/undefined/string vazia
          if (cv === undefined || cv === null || cv === '') {
            result[key][subKey] = extractedVal[subKey];
          }
        }
      }
    } else {
      // Primitivo: só preenche se vazio
      if (currentVal === undefined || currentVal === null || currentVal === '') {
        result[key] = extractedVal;
      }
    }
  }
  
  return result;
}

export const RestoreFromHTMLButton: React.FC<RestoreFromHTMLButtonProps> = ({ currentData, onRestore }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const html = await file.text();
      const extracted = extractDataFromHTML(html);
      const extractedKeys = Object.keys(extracted);
      
      if (extractedKeys.length === 0) {
        toast({
          title: "Nenhum dado encontrado",
          description: "Não foi possível extrair dados do HTML. Verifique se é o arquivo correto.",
          variant: "destructive"
        });
        return;
      }

      const merged = mergeOnlyEmpty(currentData || {}, extracted);
      
      // Log do que foi extraído
      const filledFields: string[] = [];
      for (const key of extractedKeys) {
        const subKeys = typeof extracted[key] === 'object' ? Object.keys(extracted[key]) : [key];
        filledFields.push(`${key}: ${subKeys.join(', ')}`);
      }
      console.log('📥 [Restore HTML] Campos extraídos:', filledFields);
      
      onRestore(merged);
      
      toast({
        title: "✅ Dados restaurados!",
        description: `Campos preenchidos: ${extractedKeys.join(', ')}. Apenas campos vazios foram atualizados.`,
      });
    } catch (err) {
      console.error('❌ Erro ao processar HTML:', err);
      toast({
        title: "Erro ao processar arquivo",
        description: "Falha ao ler o arquivo HTML.",
        variant: "destructive"
      });
    }
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".html,.htm"
        className="hidden"
        onChange={handleFileSelect}
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        title="Restaurar campos vazios a partir de um HTML baixado"
      >
        <Upload className="h-4 w-4 mr-2" />
        Restaurar do HTML
      </Button>
    </>
  );
};
