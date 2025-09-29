import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, Copy, Edit, Save, X, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface GoogleAdsCampaign {
  id: string;
  headlines: string[];
  descriptions: string[];
  paths: string[];
  generated_at: string;
  editable?: boolean;
}

interface GoogleAdsHistoryManagerProps {
  productId?: string;
  landingPageId?: string;
  campaignType: 'product' | 'landing_page';
  onCampaignSelect?: (campaign: GoogleAdsCampaign) => void;
}

export const GoogleAdsHistoryManager: React.FC<GoogleAdsHistoryManagerProps> = ({
  productId,
  landingPageId,
  campaignType,
  onCampaignSelect
}) => {
  const [campaigns, setCampaigns] = useState<GoogleAdsCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<GoogleAdsCampaign | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if ((productId || landingPageId)) {
      loadCampaigns();
    }
  }, [productId, landingPageId]);

  const loadCampaigns = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('google_ads_campaigns')
        .select('*')
        .eq('campaign_type', campaignType);

      if (productId) {
        query = query.eq('product_id', productId);
      } else if (landingPageId) {
        query = query.eq('landing_page_id', landingPageId);
      }

      const { data, error } = await query.order('last_exported', { ascending: false });

      if (error) throw error;

      // Extrair histórico de campanhas dos dados
      const campaignHistory: GoogleAdsCampaign[] = [];
      
      data?.forEach(campaign => {
        if (campaign.campaign_history?.campaigns) {
          campaignHistory.push(...campaign.campaign_history.campaigns);
        }
      });

      setCampaigns(campaignHistory);
    } catch (error) {
      console.error('Erro ao carregar campanhas:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o histórico de campanhas.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addToHistory = async (newCampaign: Omit<GoogleAdsCampaign, 'id' | 'generated_at'>) => {
    try {
      const campaignWithId: GoogleAdsCampaign = {
        ...newCampaign,
        id: crypto.randomUUID(),
        generated_at: new Date().toISOString(),
        editable: true
      };

      // Buscar campanha existente ou criar nova
      let query = supabase
        .from('google_ads_campaigns')
        .select('*')
        .eq('campaign_type', campaignType);

      if (productId) {
        query = query.eq('product_id', productId);
      } else if (landingPageId) {
        query = query.eq('landing_page_id', landingPageId);
      }

      const { data: existingCampaigns, error: fetchError } = await query.single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows found
        throw fetchError;
      }

      const currentHistory = existingCampaigns?.campaign_history || { campaigns: [], last_generated: null };
      const updatedHistory = {
        campaigns: [campaignWithId, ...currentHistory.campaigns.slice(0, 9)], // Manter últimas 10
        last_generated: new Date().toISOString()
      };

      if (existingCampaigns) {
        // Atualizar existente
        const { error: updateError } = await supabase
          .from('google_ads_campaigns')
          .update({ campaign_history: updatedHistory })
          .eq('id', existingCampaigns.id);

        if (updateError) throw updateError;
      } else {
        // Criar nova
        const { error: insertError } = await supabase
          .from('google_ads_campaigns')
          .insert({
            product_id: productId,
            landing_page_id: landingPageId,
            campaign_type: campaignType,
            config: {} as any,
            campaign_history: updatedHistory
          });

        if (insertError) throw insertError;
      }

      // Atualizar estado local
      setCampaigns([campaignWithId, ...campaigns.slice(0, 9)]);

      toast({
        title: "Campanha salva",
        description: "Campanha adicionada ao histórico com sucesso.",
      });

      return campaignWithId;
    } catch (error) {
      console.error('Erro ao salvar campanha:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a campanha no histórico.",
        variant: "destructive",
      });
      return null;
    }
  };

  const startEditing = (campaign: GoogleAdsCampaign) => {
    setEditingId(campaign.id);
    setEditingContent({ ...campaign });
  };

  const saveEdit = async () => {
    if (!editingId || !editingContent) return;

    try {
      const updatedCampaigns = campaigns.map(camp => 
        camp.id === editingId ? editingContent : camp
      );
      
      // Atualizar no banco
      const { error } = await supabase
        .from('google_ads_campaigns')
        .update({ 
          campaign_history: { 
            campaigns: updatedCampaigns, 
            last_generated: new Date().toISOString() 
          } as any
        })
        .eq(productId ? 'product_id' : 'landing_page_id', productId || landingPageId);

      if (error) throw error;

      setCampaigns(updatedCampaigns);
      setEditingId(null);
      setEditingContent(null);

      toast({
        title: "Campanha atualizada",
        description: "Campanha editada com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao salvar edição:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingContent(null);
  };

  const deleteCampaign = async (campaignId: string) => {
    try {
      const updatedCampaigns = campaigns.filter(camp => camp.id !== campaignId);
      
      const { error } = await supabase
        .from('google_ads_campaigns')
        .update({ 
          campaign_history: { 
            campaigns: updatedCampaigns, 
            last_generated: new Date().toISOString() 
          } as any
        })
        .eq(productId ? 'product_id' : 'landing_page_id', productId || landingPageId);

      if (error) throw error;

      setCampaigns(updatedCampaigns);

      toast({
        title: "Campanha removida",
        description: "Campanha deletada do histórico.",
      });
    } catch (error) {
      console.error('Erro ao deletar campanha:', error);
      toast({
        title: "Erro",
        description: "Não foi possível deletar a campanha.",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: "Copiado!",
        description: "Conteúdo copiado para a área de transferência.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível copiar o conteúdo.",
        variant: "destructive",
      });
    }
  };

  // Expor função addToHistory para componentes pai
  React.useImperativeHandle(React.forwardRef(() => null), () => ({
    addToHistory
  }));

  if (campaigns.length === 0 && !isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma campanha gerada ainda.</p>
            <p className="text-sm">As campanhas geradas aparecerão aqui para reutilização.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Histórico de Campanhas ({campaigns.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <ScrollArea className="max-h-96">
          <div className="space-y-4">
            {campaigns.map((campaign, index) => (
              <div key={campaign.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      Campanha {index + 1}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(campaign.generated_at).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  
                  <div className="flex gap-1">
                    {editingId === campaign.id ? (
                      <>
                        <Button size="sm" onClick={saveEdit}>
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEdit}>
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onCampaignSelect?.(campaign)}
                        >
                          Usar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEditing(campaign)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteCampaign(campaign.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {editingId === campaign.id && editingContent ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">Headlines:</label>
                      <Textarea
                        value={editingContent.headlines.join('\n')}
                        onChange={(e) => setEditingContent({
                          ...editingContent,
                          headlines: e.target.value.split('\n')
                        })}
                        className="min-h-20 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Descriptions:</label>
                      <Textarea
                        value={editingContent.descriptions.join('\n')}
                        onChange={(e) => setEditingContent({
                          ...editingContent,
                          descriptions: e.target.value.split('\n')
                        })}
                        className="min-h-16 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Paths:</label>
                      <Textarea
                        value={editingContent.paths.join('\n')}
                        onChange={(e) => setEditingContent({
                          ...editingContent,
                          paths: e.target.value.split('\n')
                        })}
                        className="min-h-12 text-sm"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong>Headlines ({campaign.headlines.length}):</strong>
                      <div className="ml-2 space-y-1">
                        {campaign.headlines.map((headline, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-muted-foreground">•</span>
                            <span>{headline}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyToClipboard(headline)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <strong>Descriptions ({campaign.descriptions.length}):</strong>
                      <div className="ml-2 space-y-1">
                        {campaign.descriptions.map((desc, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-muted-foreground">•</span>
                            <span>{desc}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyToClipboard(desc)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <strong>Paths ({campaign.paths.length}):</strong>
                      <div className="ml-2 flex gap-2">
                        {campaign.paths.map((path, i) => (
                          <Badge key={i} variant="secondary">{path}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};