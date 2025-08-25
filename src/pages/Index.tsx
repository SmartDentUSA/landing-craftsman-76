import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, FileText, Code2, Zap, Target, Palette } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden gradient-primary">{/*changed from bg-gradient-primary*/}
        <div className="container mx-auto px-6 py-20">
          <div className="text-center text-white">
            <h1 className="text-5xl font-bold mb-6">
              Landing Page Generator
            </h1>
            <p className="text-xl mb-8 text-white/90 max-w-2xl mx-auto">
              Crie landing pages profissionais em minutos. 
              Sistema completo de geração de páginas e e-mails para suas campanhas.
            </p>
            
            <div className="flex gap-4 justify-center">
              <Button 
                size="lg" 
                variant="secondary"
                onClick={() => navigate('/dashboard')}
                className="bg-white text-primary hover:bg-white/90 shadow-large"
              >
                <FileText className="h-5 w-5 mr-2" />
                Ver Meus Projetos
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => navigate('/editor')}
                className="border-white text-white hover:bg-white hover:text-primary"
              >
                <Plus className="h-5 w-5 mr-2" />
                Criar Nova Landing
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Recursos Principais</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Tudo que você precisa para criar campanhas eficientes
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center shadow-medium hover:shadow-large transition-smooth">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Criação Rápida</CardTitle>
                <CardDescription>
                  Gere landing pages profissionais em questão de minutos
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center shadow-medium hover:shadow-large transition-smooth">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Foco em Conversão</CardTitle>
                <CardDescription>
                  Templates otimizados para máxima taxa de conversão
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center shadow-medium hover:shadow-large transition-smooth">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Palette className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Totalmente Customizável</CardTitle>
                <CardDescription>
                  Edite textos, cores, imagens e CTAs com facilidade
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Pronto para começar?
          </h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
            Comece criando sua primeira landing page agora mesmo
          </p>
          
          <div className="flex gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => navigate('/editor')}
              className="gradient-primary shadow-primary"
            >
              <Plus className="h-5 w-5 mr-2" />
              Criar Primeira Landing
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => navigate('/dashboard')}
            >
              <FileText className="h-5 w-5 mr-2" />
              Ver Projetos Existentes
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-6 text-center">
          <p className="text-muted-foreground">
            © 2024 Landing Page Generator. Criado para maximizar suas conversões.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
