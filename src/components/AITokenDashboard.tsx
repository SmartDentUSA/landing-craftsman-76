import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Coins, Zap, Hash, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// Mapeamento de edge_function_id → descrição legível
const FUNCTION_LABELS: Record<string, string> = {
  'strategic-blog-generator': 'Blog Estratégico (Editor → Blog)',
  'generate-product-blog': 'Blog de Produto (Repositório → Blog)',
  'generate-product-ai-content': 'Conteúdo IA Produto (Repositório → IA)',
  'ai-seo-generator': 'SEO com IA (Editor → SEO)',
  'generate-social-content': 'Conteúdo Social (Repositório → Social)',
  'generate-ad-copies': 'Google Ads (Editor → Ads)',
  'generate-tiktok-content': 'TikTok (Repositório → TikTok)',
  'generate-product-faqs': 'FAQs Produto (Repositório → FAQ)',
  'generate-spin-campaign': 'Campanha SPIN (SPIN → WhatsApp)',
  'generate-spin-faqs': 'FAQs SPIN (SPIN → FAQ)',
  'generate-spin-hero-banner': 'Banner Hero IA (SPIN → Imagem)',
  'generate-ecommerce-html': 'HTML E-commerce (Repositório → HTML)',
  'moderate-reviews': 'Moderação Reviews (Reviews → IA)',
  'generate-spin-landing-page': 'Landing Page SPIN',
  'generate-spin-sales-pitch': 'Pitch SPIN',
  'generate-spin-journey': 'Jornada SPIN',
  'generate-spin-metrics': 'Métricas SPIN',
  'extract-youtube-captions': 'Legendas YouTube',
  'generate-clinical-brain': 'Cérebro Clínico',
  'generate-landing-page-faqs': 'FAQs Landing Page',
  'generate-instagram-carousel': 'Carrossel Instagram',
  'generate-instagram-reels-script': 'Script Reels',
  'generate-carousel-hook': 'Hook Carrossel',
  'generate-carousel-slide': 'Slide Carrossel',
  'generate-youtube-script': 'Script YouTube',
  'generate-display-banners': 'Banners Display',
  'generate-merchant-feed': 'Feed Merchant',
  'ai-content-generator': 'Gerador de Conteúdo IA',
  'generate-content-from-interests': 'Conteúdo por Interesses',
};

interface TokenRecord {
  id: string;
  edge_function_id: string;
  action_name: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number;
  cost_brl: number;
  product_name: string | null;
  created_at: string;
}

export const AITokenDashboard = () => {
  const [records, setRecords] = useState<TokenRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [brlRate, setBrlRate] = useState(5.50);

  // Month filter
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);

  const monthOptions = useMemo(() => {
    const opts: string[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      opts.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return opts;
  }, []);

  useEffect(() => {
    loadData();
  }, [selectedMonth]);

  const loadData = async () => {
    setLoading(true);
    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1).toISOString();
    const endDate = new Date(year, month, 1).toISOString();

    const { data, error } = await supabase
      .from('ai_token_usage' as any)
      .select('*')
      .gte('created_at', startDate)
      .lt('created_at', endDate)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading token usage:', error);
    } else {
      setRecords((data as any[]) || []);
    }
    setLoading(false);
  };

  // Recalculate BRL costs with custom rate
  const recalculatedRecords = useMemo(() => {
    return records.map(r => ({
      ...r,
      cost_brl_display: r.cost_usd * brlRate,
    }));
  }, [records, brlRate]);

  // Summary cards
  const totalTokens = recalculatedRecords.reduce((s, r) => s + r.total_tokens, 0);
  const totalCostBrl = recalculatedRecords.reduce((s, r) => s + r.cost_brl_display, 0);
  const totalCalls = recalculatedRecords.length;
  const avgCostPerCall = totalCalls > 0 ? totalCostBrl / totalCalls : 0;

  // Chart data: daily aggregation
  const chartData = useMemo(() => {
    const byDay: Record<string, Record<string, number>> = {};
    recalculatedRecords.forEach(r => {
      const day = new Date(r.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (!byDay[day]) byDay[day] = {};
      const fn = r.edge_function_id;
      byDay[day][fn] = (byDay[day][fn] || 0) + r.total_tokens;
    });

    return Object.entries(byDay)
      .map(([day, fns]) => ({ day, ...fns }))
      .reverse();
  }, [recalculatedRecords]);

  // Get unique function IDs for chart bars
  const uniqueFunctions = useMemo(() => {
    return [...new Set(recalculatedRecords.map(r => r.edge_function_id))];
  }, [recalculatedRecords]);

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', '#00C49F', '#FFBB28', '#FF8042', '#a855f7', '#ec4899'];

  const formatMonth = (m: string) => {
    const [y, mo] = m.split('-');
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${months[parseInt(mo) - 1]} ${y}`;
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Mês:</span>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(m => (
                <SelectItem key={m} value={m}>{formatMonth(m)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Cotação USD→BRL:</span>
          <Input
            type="number"
            step="0.01"
            value={brlRate}
            onChange={e => setBrlRate(parseFloat(e.target.value) || 5.50)}
            className="w-24"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Hash className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Tokens</p>
              <p className="text-xl font-bold">{totalTokens.toLocaleString('pt-BR')}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Coins className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Custo Total</p>
              <p className="text-xl font-bold">R$ {totalCostBrl.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Zap className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Chamadas</p>
              <p className="text-xl font-bold">{totalCalls.toLocaleString('pt-BR')}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <TrendingUp className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Custo Médio/Chamada</p>
              <p className="text-xl font-bold">R$ {avgCostPerCall.toFixed(4)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Uso Diário de Tokens por Função</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      value.toLocaleString('pt-BR'),
                      FUNCTION_LABELS[name] || name
                    ]}
                  />
                  <Legend
                    formatter={(value: string) => FUNCTION_LABELS[value] || value}
                    wrapperStyle={{ fontSize: 10 }}
                  />
                  {uniqueFunctions.map((fn, i) => (
                    <Bar
                      key={fn}
                      dataKey={fn}
                      stackId="tokens"
                      fill={COLORS[i % COLORS.length]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Detalhamento por Chamada</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : recalculatedRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum registro de uso de tokens neste mês.</p>
              <p className="text-xs mt-1">Os dados serão registrados automaticamente a cada chamada à IA.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Função</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead className="text-right">Prompt</TableHead>
                    <TableHead className="text-right">Completion</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Custo R$</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recalculatedRecords.slice(0, 100).map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">
                        <span title={r.edge_function_id}>
                          {FUNCTION_LABELS[r.edge_function_id] || r.edge_function_id}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">{r.action_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {r.model?.replace('google/', '').replace('openai/', '')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs">{r.prompt_tokens.toLocaleString('pt-BR')}</TableCell>
                      <TableCell className="text-right text-xs">{r.completion_tokens.toLocaleString('pt-BR')}</TableCell>
                      <TableCell className="text-right text-xs font-medium">{r.total_tokens.toLocaleString('pt-BR')}</TableCell>
                      <TableCell className="text-right text-xs font-medium">
                        R$ {r.cost_brl_display.toFixed(4)}
                      </TableCell>
                      <TableCell className="text-xs max-w-[120px] truncate">{r.product_name || '—'}</TableCell>
                      <TableCell className="text-xs">
                        {new Date(r.created_at).toLocaleString('pt-BR', {
                          day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {recalculatedRecords.length > 100 && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Mostrando 100 de {recalculatedRecords.length} registros
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
