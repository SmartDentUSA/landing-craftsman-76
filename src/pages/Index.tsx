import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, FileText, Code2, Zap, Target, Palette } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      {/* CTA Section */}
      <section className="py-20 text-center">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold mb-4">
            Pronto para começar?
          </h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
            Comece criando sua primeira landing page agora mesmo
          </p>
          
          <div className="flex gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => navigate('/auth')}
              className="gradient-primary shadow-primary text-white"
            >
              <Plus className="h-5 w-5 mr-2" />
              Entrar / Criar Conta
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => navigate('/dashboard')}
              className="border-muted-foreground/30 text-muted-foreground hover:bg-muted"
            >
              <FileText className="h-5 w-5 mr-2" />
              Ver Dashboard
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
