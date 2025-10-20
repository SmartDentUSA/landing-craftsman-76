import { useState, useRef, useImperativeHandle, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Plus, Trash2 } from "lucide-react";

interface FAQ {
  question: string;
  answer: string;
}

interface FAQEditorProps {
  faqs: FAQ[];
  onChange: (faqs: FAQ[]) => void;
  onInsertProductLink?: (faqIndex: number) => void;
  placeholder?: {
    question?: string;
    answer?: string;
  };
}

export const FAQEditor = forwardRef<
  { blurAllEditors: () => void },
  FAQEditorProps
>(({ 
  faqs, 
  onChange, 
  onInsertProductLink,
  placeholder = {
    question: "Pergunta",
    answer: "Digite a resposta com formatação rica..."
  }
}, ref) => {
  const [activeFaqIndex, setActiveFaqIndex] = useState<number | null>(null);
  const editorRefs = useRef<Map<number, { blur: () => void }>>(new Map());

  // Expor método para forçar blur de todos os editores
  useImperativeHandle(ref, () => ({
    blurAllEditors: () => {
      editorRefs.current.forEach(editorRef => editorRef?.blur());
    }
  }), []);

  const addFaq = () => {
    onChange([...faqs, { question: '', answer: '' }]);
  };

  const removeFaq = (index: number) => {
    const newFaqs = faqs.filter((_, i) => i !== index);
    onChange(newFaqs);
  };

  const updateFaq = (index: number, field: keyof FAQ, value: string) => {
    const newFaqs = [...faqs];
    newFaqs[index][field] = value;
    onChange(newFaqs);
  };

  const handleInsertProductLink = (faqIndex: number) => {
    setActiveFaqIndex(faqIndex);
    onInsertProductLink?.(faqIndex);
  };

  return (
    <div className="space-y-4">
      {faqs.map((faqItem, index) => (
        <div key={index} className="p-4 border rounded-lg space-y-4">
          <div className="flex justify-between items-center">
            <Label>FAQ {index + 1}</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeFaq(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          
          <div>
            <Label>Pergunta</Label>
            <Input
              value={faqItem.question}
              onChange={(e) => updateFaq(index, 'question', e.target.value)}
              placeholder={placeholder.question}
            />
          </div>
          
          <div>
            <Label>Resposta</Label>
            <RichTextEditor
              ref={(el) => {
                if (el) editorRefs.current.set(index, el);
                else editorRefs.current.delete(index);
              }}
              content={faqItem.answer}
              onChange={(content) => updateFaq(index, 'answer', content)}
              placeholder={placeholder.answer}
              onInsertProductLink={onInsertProductLink ? () => handleInsertProductLink(index) : undefined}
            />
          </div>
        </div>
      ))}
      
      <Button
        variant="outline"
        size="sm"
        onClick={addFaq}
      >
        <Plus className="h-4 w-4 mr-2" />
        Adicionar FAQ
      </Button>
    </div>
  );
});