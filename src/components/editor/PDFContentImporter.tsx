import React, { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Upload, Check, X, Wand2, Loader2, Eye, TableIcon, MessageSquareQuote } from "lucide-react";

interface ExtractedTable {
  title: string;
  headers: string[];
  rows: Array<Record<string, string>>;
}

interface Suggestions {
  seo_title: string;
  seo_description: string;
  banner_title: string;
  banner_subtitle: string;
  banner_badge_text?: string;
  solutions_title: string;
  advisory_title: string;
  advisory_paragraph: string;
  cta_final_title: string;
  cta_final_paragraph: string;
  desktop_info_title: string;
  desktop_info_text: string;
}

type FlowState = 'idle' | 'uploading' | 'preview' | 'suggestions_ready' | 'applied';

interface PDFContentImporterProps {
  data: any;
  landingPageName: string;
  onApplySuggestions: (suggestions: Partial<Suggestions>) => void;
  onApplyTable: (tableTitle: string, tableHeaders: string[], tableData: Array<Record<string, string>>) => void;
  onFAQsGenerated: (faqs: Array<{ question: string; answer: string }>) => void;
  onTranscriptionSaved: (text: string) => void;
  pdfTranscription: string | null;
}

const FIELD_LABELS: Record<string, string> = {
  seo_title: "Título SEO",
  seo_description: "Descrição SEO",
  banner_title: "Título do Banner",
  banner_subtitle: "Subtítulo do Banner",
  banner_badge_text: "Badge do Banner",
  solutions_title: "Título das Soluções",
  advisory_title: "Título da Consultoria",
  advisory_paragraph: "Parágrafo da Consultoria",
  cta_final_title: "Título do CTA Final",
  cta_final_paragraph: "Parágrafo do CTA Final",
  desktop_info_title: "Título Info Desktop",
  desktop_info_text: "Texto Info Desktop",
};

export function PDFContentImporter({
  data,
  landingPageName,
  onApplySuggestions,
  onApplyTable,
  onFAQsGenerated,
  onTranscriptionSaved,
  pdfTranscription,
}: PDFContentImporterProps) {
  const [state, setState] = useState<FlowState>(pdfTranscription ? 'applied' : 'idle');
  const [transcription, setTranscription] = useState<string>(pdfTranscription || '');
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);
  const [extractedTables, setExtractedTables] = useState<ExtractedTable[]>([]);
  const [selectedTableIndex, setSelectedTableIndex] = useState(0);
  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>({});
  const [uploadProgress, setUploadProgress] = useState(0);
  const [generatingFAQs, setGeneratingFAQs] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf') {
      toast({ title: "Formato inválido", description: "Apenas arquivos PDF são aceitos.", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "O limite é 10MB.", variant: "destructive" });
      return;
    }

    setState('uploading');
    setUploadProgress(10);

    try {
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('landing_page_name', landingPageName);

      setUploadProgress(30);

      const response = await fetch(
        `https://pgfgripuanuwwolmtknn.supabase.co/functions/v1/transcribe-landing-page-pdf`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${(supabase as any).supabaseKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnZmdyaXB1YW51d3dvbG10a25uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxNDkxNzMsImV4cCI6MjA3MTcyNTE3M30.ibYoIlzxAFoXjFCAy7WrKKixiDcG318dxEm8gqGKOjk'}`,
          },
          body: formData,
        }
      );

      setUploadProgress(80);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Erro ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Erro na transcrição');

      const { transcribed_text, suggestions: sug, extracted_tables } = result.data;

      setTranscription(transcribed_text || '');
      setSuggestions(sug || null);
      setExtractedTables(extracted_tables || []);
      setSelectedTableIndex(0);

      // Pre-select all suggestion fields
      if (sug) {
        const preSelected: Record<string, boolean> = {};
        Object.keys(sug).forEach(k => { if (sug[k]) preSelected[k] = true; });
        setSelectedFields(preSelected);
      }

      setUploadProgress(100);
      setState('preview');

      toast({ title: "✅ PDF processado!", description: `Texto transcrito com ${extracted_tables?.length || 0} tabela(s) encontrada(s).` });
    } catch (err: any) {
      console.error('PDF transcription error:', err);
      toast({ title: "Erro na transcrição", description: err.message, variant: "destructive" });
      setState('idle');
      setUploadProgress(0);
    }
  }, [landingPageName, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleApprove = () => {
    onTranscriptionSaved(transcription);
    setState('suggestions_ready');
  };

  const handleDiscard = () => {
    setState('idle');
    setTranscription('');
    setSuggestions(null);
    setExtractedTables([]);
    setUploadProgress(0);
  };

  const handleApplySuggestions = () => {
    if (!suggestions) return;

    // Apply selected text suggestions
    const toApply: Partial<Suggestions> = {};
    Object.entries(selectedFields).forEach(([key, checked]) => {
      if (checked && suggestions[key as keyof Suggestions]) {
        (toApply as any)[key] = suggestions[key as keyof Suggestions];
      }
    });
    onApplySuggestions(toApply);

    // Apply selected table
    if (extractedTables.length > 0) {
      const table = extractedTables[selectedTableIndex];
      if (table) {
        onApplyTable(table.title, table.headers, table.rows);
      }
    }

    setState('applied');
    toast({ title: "✅ Sugestões aplicadas!", description: "Os campos foram preenchidos. Revise e salve." });
  };

  const handleGenerateFAQs = async () => {
    if (!transcription) return;
    setGeneratingFAQs(true);

    try {
      const { data: result, error } = await supabase.functions.invoke('generate-landing-page-faqs', {
        body: { transcribed_text: transcription, landing_page_name: landingPageName }
      });

      if (error) throw error;
      if (!result?.success) throw new Error(result?.error || 'Erro na geração');

      onFAQsGenerated(result.faqs);
      toast({ title: "✅ FAQs geradas!", description: `${result.faqs.length} perguntas frequentes criadas.` });
    } catch (err: any) {
      console.error('FAQ generation error:', err);
      toast({ title: "Erro ao gerar FAQs", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingFAQs(false);
    }
  };

  // STATE: IDLE - Upload zone
  if (state === 'idle') {
    return (
      <Card className="border-dashed border-2 border-muted-foreground/25">
        <CardContent className="p-6">
          <div
            className="flex flex-col items-center justify-center gap-4 py-8 cursor-pointer rounded-lg hover:bg-muted/50 transition-colors"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-10 w-10 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">Arraste um PDF ou clique para selecionar</p>
              <p className="text-sm text-muted-foreground mt-1">O conteúdo será transcrito por IA e usado para preencher a landing page</p>
              <p className="text-xs text-muted-foreground mt-1">Máximo 10MB · Apenas PDF</p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
              e.target.value = '';
            }}
          />
        </CardContent>
      </Card>
    );
  }

  // STATE: UPLOADING
  if (state === 'uploading') {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="font-medium">Processando PDF com IA...</p>
            <p className="text-sm text-muted-foreground">Extraindo texto, tabelas e gerando sugestões</p>
            <Progress value={uploadProgress} className="w-64" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // STATE: PREVIEW - Show transcription + tables for approval
  if (state === 'preview') {
    return (
      <div className="space-y-4">
        {/* Transcription Preview */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Preview da Transcrição</CardTitle>
              </div>
              <Badge variant="secondary">{transcription.length.toLocaleString()} caracteres</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64 w-full rounded-md border p-4">
              <pre className="text-sm whitespace-pre-wrap font-sans">{transcription}</pre>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Tables Preview */}
        {extractedTables.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <TableIcon className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Tabelas Extraídas ({extractedTables.length})</CardTitle>
              </div>
              <CardDescription>
                Estas tabelas serão inseridas em "Informações Desktop → Mostrar Tabela"
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {extractedTables.length > 1 && (
                <Select
                  value={String(selectedTableIndex)}
                  onValueChange={(v) => setSelectedTableIndex(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a tabela" />
                  </SelectTrigger>
                  <SelectContent>
                    {extractedTables.map((t, i) => (
                      <SelectItem key={i} value={String(i)}>{t.title || `Tabela ${i + 1}`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {extractedTables[selectedTableIndex] && (
                <div>
                  <p className="text-sm font-medium mb-2">{extractedTables[selectedTableIndex].title}</p>
                  <div className="rounded-md border overflow-auto max-h-72">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {extractedTables[selectedTableIndex].headers.map((h, i) => (
                            <TableHead key={i}>{h}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {extractedTables[selectedTableIndex].rows.map((row, ri) => (
                          <TableRow key={ri}>
                            {extractedTables[selectedTableIndex].headers.map((h, ci) => (
                              <TableCell key={ci}>{row[h] || ''}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button onClick={handleApprove} className="gap-2">
            <Check className="h-4 w-4" />
            Aprovar Transcrição
          </Button>
          <Button variant="destructive" onClick={handleDiscard} className="gap-2">
            <X className="h-4 w-4" />
            Descartar
          </Button>
        </div>
      </div>
    );
  }

  // STATE: SUGGESTIONS_READY - Show field suggestions with checkboxes
  if (state === 'suggestions_ready' && suggestions) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Sugestões da IA</CardTitle>
            </div>
            <CardDescription>Selecione quais campos deseja preencher automaticamente</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-96">
              <div className="space-y-3">
                {Object.entries(suggestions).map(([key, value]) => {
                  if (!value) return null;
                  return (
                    <div key={key} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                      <Checkbox
                        checked={selectedFields[key] || false}
                        onCheckedChange={(checked) =>
                          setSelectedFields(prev => ({ ...prev, [key]: !!checked }))
                        }
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{FIELD_LABELS[key] || key}</p>
                        <p className="text-sm text-muted-foreground mt-1 break-words">{value}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {extractedTables.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm">
                <TableIcon className="h-4 w-4 text-primary" />
                <span className="font-medium">Tabela "{extractedTables[selectedTableIndex]?.title}"</span>
                <span className="text-muted-foreground">será aplicada em Informações Desktop</span>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3">
          <Button onClick={handleApplySuggestions} className="gap-2">
            <Check className="h-4 w-4" />
            Aplicar Selecionados
          </Button>
          <Button variant="outline" onClick={() => setState('preview')}>
            Voltar ao Preview
          </Button>
        </div>
      </div>
    );
  }

  // STATE: APPLIED - Show FAQ generation button
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Conteúdo do PDF importado</p>
              <p className="text-sm text-muted-foreground">
                {transcription ? `${transcription.length.toLocaleString()} caracteres transcritos` : 'Transcrição salva'}
              </p>
            </div>
          </div>

          <div className="flex gap-3 flex-wrap">
            <Button
              onClick={handleGenerateFAQs}
              disabled={generatingFAQs || !transcription}
              variant="secondary"
              className="gap-2"
            >
              {generatingFAQs ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MessageSquareQuote className="h-4 w-4" />
              )}
              {generatingFAQs ? 'Gerando FAQs...' : 'Gerar FAQ por IA'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setState('idle');
                setTranscription('');
                setSuggestions(null);
                setExtractedTables([]);
                onTranscriptionSaved('');
              }}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Novo PDF
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
