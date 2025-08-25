import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Copy, Download, ExternalLink, ArrowLeft, Code2 } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { generateHTML } from "@/lib/template-engine";

const CodeView = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Get data from route state or use default data
  const { data, landingName = "Landing Page", html } = location.state || {};
  
  const [generatedHTML, setGeneratedHTML] = useState(() => {
    // If HTML is passed directly, use it
    if (html) {
      return html;
    }
    
    // If data is passed, generate HTML from it
    if (data) {
      return generateHTML(data);
    }
    
    // Default example HTML if no data
    return `<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Smart Dent - Sistema de Gestão Odontológica</title>
    <meta name="description" content="Odontologia digital simples, eficiente e lucrativa. Resinas 3D, scanners intraorais, impressoras 3D e consultoria especializada.">
</head>
<body>
    <h1>Smart Dent - Odontologia Digital</h1>
    <p>Para visualizar o código HTML completo, acesse através do Editor.</p>
    <a href="/editor">Ir para o Editor</a>
</body>
</html>`;
  });

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(generatedHTML);
      toast({
        title: "Código copiado!",
        description: "O HTML da landing page foi copiado para a área de transferência.",
      });
    } catch (err) {
      // Fallback for older browsers
      if (textareaRef.current) {
        textareaRef.current.select();
        document.execCommand('copy');
        toast({
          title: "Código copiado!",
          description: "O HTML da landing page foi copiado para a área de transferência.",
        });
      }
    }
  };

  const handleDownloadHTML = () => {
    const blob = new Blob([generatedHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${landingName.toLowerCase().replace(/\s+/g, '-')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Download iniciado",
      description: "O arquivo HTML está sendo baixado.",
    });
  };

  const handlePreviewInNewTab = () => {
    const blob = new Blob([generatedHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    
    // Clean up the blob URL after a delay
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const lineCount = generatedHTML.split('\n').length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-soft sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <div>
                <h1 className="text-xl font-semibold flex items-center gap-2">
                  <Code2 className="h-5 w-5" />
                  Código Gerado
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="success">HTML Pronto</Badge>
                  <span className="text-sm text-muted-foreground">
                    {lineCount} linhas • Template: Smart Dent Base v1
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handlePreviewInNewTab}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir Preview
              </Button>
              <Button variant="outline" onClick={handleDownloadHTML}>
                <Download className="h-4 w-4 mr-2" />
                Baixar HTML
              </Button>
              <Button onClick={handleCopyCode} className="gradient-primary shadow-primary">
                <Copy className="h-4 w-4 mr-2" />
                Copiar Código
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Code Section */}
          <div className="lg:col-span-2">
            <Card className="shadow-large h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code2 className="h-5 w-5" />
                  HTML Completo
                </CardTitle>
                <CardDescription>
                  Código HTML pronto para ser copiado e colado em seu site
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <Textarea
                    ref={textareaRef}
                    value={generatedHTML}
                    readOnly
                    className="font-mono text-sm min-h-[600px] resize-none"
                    placeholder="O código HTML gerado aparecerá aqui..."
                  />
                  <div className="absolute top-2 right-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCopyCode}
                      className="bg-background/80 backdrop-blur-sm"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Info Section */}
          <div className="space-y-6">
            {/* Instructions */}
            <Card className="shadow-medium">
              <CardHeader>
                <CardTitle className="text-lg">Como usar este código</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <Badge variant="outline" className="w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs">
                      1
                    </Badge>
                    <p className="text-sm">
                      <strong>Copie o código</strong> clicando no botão "Copiar Código"
                    </p>
                  </div>
                  
                  <div className="flex gap-3">
                    <Badge variant="outline" className="w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs">
                      2
                    </Badge>
                    <p className="text-sm">
                      <strong>Cole em um arquivo</strong> com extensão .html
                    </p>
                  </div>
                  
                  <div className="flex gap-3">
                    <Badge variant="outline" className="w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs">
                      3
                    </Badge>
                    <p className="text-sm">
                      <strong>Publique</strong> em seu servidor web ou hospedagem
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Features */}
            <Card className="shadow-medium">
              <CardHeader>
                <CardTitle className="text-lg">Recursos incluídos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-success rounded-full"></div>
                    <span>Design responsivo (mobile-first)</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-success rounded-full"></div>
                    <span>FAQ com JavaScript interativo</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-success rounded-full"></div>
                    <span>Google Fonts (Poppins) integrada</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-success rounded-full"></div>
                    <span>SEO otimizado (meta tags)</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-success rounded-full"></div>
                    <span>CSS inline (sem dependências)</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <Card className="gradient-soft border-0 shadow-medium">
              <CardHeader>
                <CardTitle className="text-lg">Estatísticas do código</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Linhas de código:</span>
                    <span className="font-semibold">{lineCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tamanho estimado:</span>
                    <span className="font-semibold">{Math.round(generatedHTML.length / 1024)} KB</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Compatibilidade:</span>
                    <span className="font-semibold">IE11+</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="space-y-3">
              <Button 
                onClick={handlePreviewInNewTab} 
                className="w-full" 
                variant="outline"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Testar em Nova Aba
              </Button>
              
              <Button 
                onClick={handleDownloadHTML} 
                className="w-full" 
                variant="secondary"
              >
                <Download className="h-4 w-4 mr-2" />
                Baixar Arquivo .html
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CodeView;