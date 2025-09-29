import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Edit, Copy, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface CampaignHistory {
  campaigns: GoogleAdsCampaign[];
  last_generated: string | null;
}

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
  campaignType: string;
  onCampaignSelect?: (campaign: GoogleAdsCampaign) => void;
}

export interface GoogleAdsHistoryManagerRef {
  addToHistory: (newCampaign: Omit<GoogleAdsCampaign, 'generated_at' | 'id'>) => Promise<GoogleAdsCampaign>;
}

const GoogleAdsHistoryManager = forwardRef<GoogleAdsHistoryManagerRef, GoogleAdsHistoryManagerProps>(({
  productId,
  landingPageId,
  campaignType,
  onCampaignSelect,
}, ref) => {
  const [campaigns, setCampaigns] = useState<GoogleAdsCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<{
    headlines: string[];
    descriptions: string[];
    paths: string[];
  }>({ headlines: [], descriptions: [], paths: [] });

  useEffect(() => {
    loadCampaigns();
  }, [productId, landingPageId]);

  const loadCampaigns = async () => {
    try {
      setIsLoading(true);
      
      let query = supabase
        .from('google_ads_campaigns')
        .select('*')
        .eq('campaign_type', campaignType);

      if (productId) {
        query = query.eq('product_id', productId);
      } else if (landingPageId) {
        query = query.eq('landing_page_id', landingPageId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Extrair histórico de campanhas dos dados
      const campaignHistory: GoogleAdsCampaign[] = [];
      
      data?.forEach(campaign => {
        const history = campaign.campaign_history as unknown as CampaignHistory;
        if (history?.campaigns) {
          campaignHistory.push(...history.campaigns);
        }
      });

      setCampaigns(campaignHistory);
    } catch (error) {
      console.error('Erro ao carregar campanhas:', error);
      toast({
        title: "Erro ao carregar histórico",
        description: "Não foi possível carregar o histórico de campanhas.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addToHistory = async (newCampaign: Omit<GoogleAdsCampaign, 'generated_at' | 'id'>): Promise<GoogleAdsCampaign> => {
    try {
      // Criar campanha com ID e timestamp
      const campaignWithId: GoogleAdsCampaign = {
        ...newCampaign,
        id: crypto.randomUUID(),
        generated_at: new Date().toISOString()
      };

      // Buscar campanha existente
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

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      const currentHistory = (existingCampaigns?.campaign_history as unknown as CampaignHistory) || { campaigns: [], last_generated: null };
      const updatedHistory = {
        campaigns: [campaignWithId, ...currentHistory.campaigns.slice(0, 9)], // Manter últimas 10
        last_generated: new Date().toISOString()
      } as unknown as any;

      if (existingCampaigns) {
        // Atualizar existente
        const { error: updateError } = await supabase
          .from('google_ads_campaigns')
          .update({ 
            campaign_history: updatedHistory,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingCampaigns.id);

        if (updateError) throw updateError;
      } else {
        // Criar novo
        const campaignData: any = {
          campaign_type: campaignType,
          config: {},
          campaign_history: updatedHistory
        };

        if (productId) {
          Object.assign(campaignData, { product_id: productId });
        } else if (landingPageId) {
          Object.assign(campaignData, { landing_page_id: landingPageId });
        }

        const { error: insertError } = await supabase
          .from('google_ads_campaigns')
          .insert(campaignData);

        if (insertError) throw insertError;
      }

      // Atualizar estado local
      setCampaigns(prev => [campaignWithId, ...prev.slice(0, 9)]);

      return campaignWithId;
    } catch (error) {
      console.error('Erro ao adicionar ao histórico:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a campanha no histórico.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const startEditing = (campaign: GoogleAdsCampaign) => {
    setEditingId(campaign.id);
    setEditingContent({
      headlines: [...campaign.headlines],
      descriptions: [...campaign.descriptions],
      paths: [...campaign.paths]
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;

    try {
      // Atualizar campanha no histórico
      const updatedCampaigns = campaigns.map(campaign => 
        campaign.id === editingId
          ? { ...campaign, ...editingContent }
          : campaign
      );

      setCampaigns(updatedCampaigns);

      // Buscar e atualizar no banco
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

      if (fetchError) throw fetchError;

      const currentHistory = (existingCampaigns?.campaign_history as unknown as CampaignHistory) || { campaigns: [], last_generated: null };
      const updatedHistory = {
        ...currentHistory,
        campaigns: updatedCampaigns
      } as unknown as any;

      const { error: updateError } = await supabase
        .from('google_ads_campaigns')
        .update({ 
          campaign_history: updatedHistory,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingCampaigns.id);

      if (updateError) throw updateError;

      setEditingId(null);
      toast({
        title: "Campanha atualizada",
        description: "As alterações foram salvas com sucesso."
      });
    } catch (error) {
      console.error('Erro ao salvar edição:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive"
      });
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingContent({ headlines: [], descriptions: [], paths: [] });
  };

  const deleteCampaign = async (campaignId: string) => {
    try {
      const updatedCampaigns = campaigns.filter(campaign => campaign.id !== campaignId);
      setCampaigns(updatedCampaigns);

      // Buscar e atualizar no banco
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

      if (fetchError) throw fetchError;

      const currentHistory = (existingCampaigns?.campaign_history as unknown as CampaignHistory) || { campaigns: [], last_generated: null };
      const updatedHistory = {
        ...currentHistory,
        campaigns: updatedCampaigns
      } as unknown as any;

      const { error: updateError } = await supabase
        .from('google_ads_campaigns')
        .update({ 
          campaign_history: updatedHistory,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingCampaigns.id);

      if (updateError) throw updateError;

      toast({
        title: "Campanha removida",
        description: "A campanha foi removida do histórico."
      });
    } catch (error) {
      console.error('Erro ao deletar campanha:', error);
      toast({
        title: "Erro ao deletar",
        description: "Não foi possível remover a campanha.",
        variant: "destructive"
      });
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copiado!",
        description: "Texto copiado para a área de transferência."
      });
    } catch (error) {
      console.error('Erro ao copiar:', error);
    }
  };

  // Expor função addToHistory para componentes pai
  useImperativeHandle(ref, () => ({
    addToHistory
  }), [addToHistory]);

  if (campaigns.length === 0 && !isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Campanhas</CardTitle>
          <CardDescription>
            Nenhuma campanha foi gerada ainda
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de Campanhas ({campaigns.length})</CardTitle>
        <CardDescription>
          Campanhas geradas anteriormente
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-4">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {new Date(campaign.generated_at).toLocaleString()}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onCampaignSelect?.(campaign)}
                    >
                      Usar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => startEditing(campaign)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteCampaign(campaign.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                {editingId === campaign.id ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">Títulos:</label>
                      <Textarea
                        value={editingContent.headlines.join('\n')}
                        onChange={(e) => setEditingContent(prev => ({
                          ...prev,
                          headlines: e.target.value.split('\n').filter(Boolean)
                        }))}
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Descrições:</label>
                      <Textarea
                        value={editingContent.descriptions.join('\n')}
                        onChange={(e) => setEditingContent(prev => ({
                          ...prev,
                          descriptions: e.target.value.split('\n').filter(Boolean)
                        }))}
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Caminhos:</label>
                      <Textarea
                        value={editingContent.paths.join('\n')}
                        onChange={(e) => setEditingContent(prev => ({
                          ...prev,
                          paths: e.target.value.split('\n').filter(Boolean)
                        }))}
                        rows={2}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveEdit}>
                        <Check className="h-4 w-4 mr-2" />
                        Salvar
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Títulos:</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(campaign.headlines.join('\n'))}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {campaign.headlines.slice(0, 2).map((headline, idx) => (
                          <div key={idx}>• {headline}</div>
                        ))}
                        {campaign.headlines.length > 2 && (
                          <div className="text-xs">+{campaign.headlines.length - 2} mais...</div>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Descrições:</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(campaign.descriptions.join('\n'))}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {campaign.descriptions.slice(0, 2).map((desc, idx) => (
                          <div key={idx}>• {desc}</div>
                        ))}
                        {campaign.descriptions.length > 2 && (
                          <div className="text-xs">+{campaign.descriptions.length - 2} mais...</div>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-sm font-medium">Caminhos:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {campaign.paths.map((path, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {path}
                          </Badge>
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
});

GoogleAdsHistoryManager.displayName = 'GoogleAdsHistoryManager';

export default GoogleAdsHistoryManager;