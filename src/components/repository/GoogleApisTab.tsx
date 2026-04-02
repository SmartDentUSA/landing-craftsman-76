import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Star, Send, MessageSquare, Youtube, MapPin, Plus, Eye, Check, X, RefreshCw } from 'lucide-react';

const SUPABASE_URL = "https://pgfgripuanuwwolmtknn.supabase.co";

async function callEdgeFunction(fnName: string, body: any) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`,
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnZmdyaXB1YW51d3dvbG10a25uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxNDkxNzMsImV4cCI6MjA3MTcyNTE3M30.ibYoIlzxAFoXjFCAy7WrKKixiDcG318dxEm8gqGKOjk',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText);
  }
  return res.json();
}

// ─── Status Badge Helper ───
function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    posted: 'bg-green-100 text-green-800',
    published: 'bg-green-100 text-green-800',
    done: 'bg-green-100 text-green-800',
    approved: 'bg-blue-100 text-blue-800',
    failed: 'bg-red-100 text-red-800',
    scheduled: 'bg-purple-100 text-purple-800',
    skipped: 'bg-gray-100 text-gray-800',
    draft: 'bg-gray-100 text-gray-800',
    paused: 'bg-orange-100 text-orange-800',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${variants[status] || 'bg-muted text-muted-foreground'}`}>
      {status}
    </span>
  );
}

// ═══════════════════════════════════════════
// CARD 1: Review Responses
// ═══════════════════════════════════════════
function ReviewResponsesCard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const { data: reviews, isLoading } = useQuery({
    queryKey: ['review-responses'],
    queryFn: async () => {
      const { data: rawReviews } = await supabase
        .from('raw_reviews')
        .select('id, author_name, rating, review_text, created_at')
        .order('created_at', { ascending: false })
        .limit(20);

      const { data: responses } = await supabase
        .from('review_responses')
        .select('*')
        .order('created_at', { ascending: false });

      const responseMap = new Map((responses || []).map((r: any) => [r.raw_review_id, r]));
      return (rawReviews || []).map((rr: any) => ({
        ...rr,
        response: responseMap.get(rr.id) || null,
      }));
    },
  });

  const pendingCount = reviews?.filter((r: any) => r.response?.status === 'pending').length || 0;

  const generateMutation = useMutation({
    mutationFn: () => callEdgeFunction('respond-review-ai', { mode: 'generate', limit: 10 }),
    onSuccess: (data) => {
      toast({ title: 'Respostas geradas', description: `${data.generated} respostas criadas` });
      queryClient.invalidateQueries({ queryKey: ['review-responses'] });
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const postMutation = useMutation({
    mutationFn: () => callEdgeFunction('respond-review-ai', { mode: 'post', limit: 5 }),
    onSuccess: (data) => {
      toast({ title: 'Respostas postadas', description: `${data.posted} postadas, ${data.failed} falhas` });
      queryClient.invalidateQueries({ queryKey: ['review-responses'] });
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const saveEdit = async (id: string) => {
    await supabase.from('review_responses').update({ response_text: editText }).eq('id', id);
    setEditingId(null);
    queryClient.invalidateQueries({ queryKey: ['review-responses'] });
    toast({ title: 'Resposta atualizada' });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-5 w-5" />
          <CardTitle className="text-lg">Respostas de Reviews Google</CardTitle>
          {pendingCount > 0 && <Badge variant="secondary">{pendingCount} pendentes</Badge>}
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
            {generateMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Gerar Respostas
          </Button>
          <Button size="sm" variant="outline" onClick={() => postMutation.mutate()} disabled={postMutation.isPending}>
            {postMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Postar Pendentes
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">Autor</th>
                  <th className="text-left py-2 px-2">Nota</th>
                  <th className="text-left py-2 px-2">Texto</th>
                  <th className="text-left py-2 px-2">Resposta</th>
                  <th className="text-left py-2 px-2">Status</th>
                  <th className="text-left py-2 px-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {(reviews || []).map((r: any) => (
                  <tr key={r.id} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-2 font-medium">{r.author_name}</td>
                    <td className="py-2 px-2">
                      <span className="flex items-center gap-1">
                        {r.rating}<Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      </span>
                    </td>
                    <td className="py-2 px-2 max-w-[200px] truncate">{r.review_text || '—'}</td>
                    <td className="py-2 px-2 max-w-[250px]">
                      {editingId === r.response?.id ? (
                        <div className="flex gap-1">
                          <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} className="text-xs min-h-[60px]" />
                          <Button size="sm" variant="ghost" onClick={() => saveEdit(r.response.id)}>
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <span className="truncate block">{r.response?.response_text || '—'}</span>
                      )}
                    </td>
                    <td className="py-2 px-2">{r.response ? <StatusBadge status={r.response.status} /> : '—'}</td>
                    <td className="py-2 px-2">
                      {r.response?.status === 'pending' && (
                        <Button size="sm" variant="ghost" onClick={() => {
                          setEditingId(r.response.id);
                          setEditText(r.response.response_text);
                        }}>
                          Editar
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════
// CARD 2: GBP Posts
// ═══════════════════════════════════════════
function GBPPostsCard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [summary, setSummary] = useState('');
  const [postType, setPostType] = useState('STANDARD');
  const [ctaType, setCtaType] = useState('LEARN_MORE');
  const [ctaUrl, setCtaUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const { data: posts, isLoading } = useQuery({
    queryKey: ['gbp-posts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('gbp_posts_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  const publishMutation = useMutation({
    mutationFn: () => callEdgeFunction('publish-gbp-post', {
      source_type: 'manual',
      summary,
      post_type: postType,
      cta_type: ctaUrl ? ctaType : undefined,
      cta_url: ctaUrl || undefined,
      image_url: imageUrl || undefined,
    }),
    onSuccess: (data) => {
      toast({ title: data.success ? 'Post publicado!' : 'Falha', description: data.error || `Post ID: ${data.post_id}` });
      setSummary('');
      setCtaUrl('');
      setImageUrl('');
      queryClient.invalidateQueries({ queryKey: ['gbp-posts'] });
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Send className="h-5 w-5" />
          <CardTitle className="text-lg">Google Business Profile Posts</CardTitle>
          <Badge variant="secondary">{posts?.filter((p: any) => p.status === 'published').length || 0} publicados</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border rounded-lg p-4 space-y-3">
          <h4 className="font-medium text-sm">Novo Post</h4>
          <Textarea
            placeholder="Texto do post (máx 1500 chars)"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            maxLength={1500}
          />
          <p className="text-xs text-muted-foreground">{summary.length}/1500</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Select value={postType} onValueChange={setPostType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="STANDARD">Standard</SelectItem>
                <SelectItem value="OFFER">Offer</SelectItem>
                <SelectItem value="EVENT">Event</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="URL de destino (CTA)" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} />
            <Select value={ctaType} onValueChange={setCtaType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="LEARN_MORE">Learn More</SelectItem>
                <SelectItem value="CALL">Call</SelectItem>
                <SelectItem value="BOOK">Book</SelectItem>
                <SelectItem value="BUY">Buy</SelectItem>
                <SelectItem value="SIGN_UP">Sign Up</SelectItem>
                <SelectItem value="ORDER">Order</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="URL da imagem (opcional)" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
          </div>
          <Button onClick={() => publishMutation.mutate()} disabled={!summary || publishMutation.isPending}>
            {publishMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Publicar agora
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">Data</th>
                  <th className="text-left py-2 px-2">Tipo</th>
                  <th className="text-left py-2 px-2">Texto</th>
                  <th className="text-left py-2 px-2">Status</th>
                  <th className="text-left py-2 px-2">Post ID</th>
                </tr>
              </thead>
              <tbody>
                {(posts || []).map((p: any) => (
                  <tr key={p.id} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-2">{new Date(p.created_at).toLocaleDateString('pt-BR')}</td>
                    <td className="py-2 px-2">{p.post_type}</td>
                    <td className="py-2 px-2 max-w-[300px] truncate">{p.summary}</td>
                    <td className="py-2 px-2"><StatusBadge status={p.status} /></td>
                    <td className="py-2 px-2 text-xs font-mono">{p.google_post_id || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════
// CARD 3: YouTube Queue
// ═══════════════════════════════════════════
function YouTubeQueueCard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newVideoId, setNewVideoId] = useState('');
  const [newProductName, setNewProductName] = useState('');
  const [diffItem, setDiffItem] = useState<any>(null);

  const { data: items, isLoading } = useQuery({
    queryKey: ['youtube-queue'],
    queryFn: async () => {
      const { data } = await supabase
        .from('youtube_metadata_queue')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const generateMutation = useMutation({
    mutationFn: () => callEdgeFunction('update-youtube-metadata', { mode: 'generate', limit: 5 }),
    onSuccess: (data) => {
      toast({ title: 'Metadados gerados', description: `${data.generate?.processed || 0} processados` });
      queryClient.invalidateQueries({ queryKey: ['youtube-queue'] });
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: () => callEdgeFunction('update-youtube-metadata', { mode: 'update', limit: 3 }),
    onSuccess: (data) => {
      toast({ title: 'Metadados aplicados', description: `${data.update?.updated || 0} atualizados` });
      queryClient.invalidateQueries({ queryKey: ['youtube-queue'] });
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const addToQueue = async () => {
    if (!newVideoId) return;
    const { error } = await supabase.from('youtube_metadata_queue').insert({
      video_id: newVideoId,
      video_url: `https://youtube.com/watch?v=${newVideoId}`,
      product_name: newProductName || null,
      status: 'pending',
    });
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Vídeo adicionado à fila' });
      setNewVideoId('');
      setNewProductName('');
      queryClient.invalidateQueries({ queryKey: ['youtube-queue'] });
    }
  };

  const approveItem = async (id: string) => {
    await supabase.from('youtube_metadata_queue').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['youtube-queue'] });
    toast({ title: 'Aprovado' });
  };

  const skipItem = async (id: string) => {
    await supabase.from('youtube_metadata_queue').update({ status: 'skipped' }).eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['youtube-queue'] });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <Youtube className="h-5 w-5" />
          <CardTitle className="text-lg">Atualização de Metadados YouTube</CardTitle>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
            {generateMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Gerar Metadados (IA)
          </Button>
          <Button size="sm" variant="outline" onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
            {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Aplicar Aprovados
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 items-end">
          <Input placeholder="YouTube Video ID" value={newVideoId} onChange={(e) => setNewVideoId(e.target.value)} className="max-w-[200px]" />
          <Input placeholder="Produto vinculado" value={newProductName} onChange={(e) => setNewProductName(e.target.value)} className="max-w-[200px]" />
          <Button size="sm" onClick={addToQueue} disabled={!newVideoId}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">Vídeo ID</th>
                  <th className="text-left py-2 px-2">Produto</th>
                  <th className="text-left py-2 px-2">Título Atual → Sugerido</th>
                  <th className="text-left py-2 px-2">Status</th>
                  <th className="text-left py-2 px-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {(items || []).map((item: any) => (
                  <tr key={item.id} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-2 font-mono text-xs">{item.video_id}</td>
                    <td className="py-2 px-2">{item.product_name || '—'}</td>
                    <td className="py-2 px-2 max-w-[300px]">
                      <span className="text-muted-foreground">{item.current_title || '—'}</span>
                      {item.suggested_title && (
                        <span className="block text-primary font-medium">→ {item.suggested_title}</span>
                      )}
                    </td>
                    <td className="py-2 px-2"><StatusBadge status={item.status} /></td>
                    <td className="py-2 px-2">
                      <div className="flex gap-1">
                        {item.suggested_title && (
                          <Button size="sm" variant="ghost" onClick={() => setDiffItem(item)}>
                            <Eye className="h-3 w-3" />
                          </Button>
                        )}
                        {item.status === 'pending' && item.suggested_title && (
                          <>
                            <Button size="sm" variant="ghost" className="text-green-600" onClick={() => approveItem(item.id)}>
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-red-600" onClick={() => skipItem(item.id)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Diff Modal */}
        <Dialog open={!!diffItem} onOpenChange={() => setDiffItem(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Comparação de Metadados — {diffItem?.video_id}</DialogTitle>
            </DialogHeader>
            {diffItem && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-bold mb-2">Atual</h4>
                  <p className="font-medium">Título:</p>
                  <p className="text-muted-foreground mb-2">{diffItem.current_title || '—'}</p>
                  <p className="font-medium">Descrição:</p>
                  <p className="text-muted-foreground mb-2 whitespace-pre-wrap">{diffItem.current_description || '—'}</p>
                  <p className="font-medium">Tags:</p>
                  <p className="text-muted-foreground">{(diffItem.current_tags || []).join(', ') || '—'}</p>
                </div>
                <div>
                  <h4 className="font-bold mb-2 text-primary">Sugerido (IA)</h4>
                  <p className="font-medium">Título:</p>
                  <p className="text-primary mb-2">{diffItem.suggested_title || '—'}</p>
                  <p className="font-medium">Descrição:</p>
                  <p className="text-primary mb-2 whitespace-pre-wrap">{diffItem.suggested_description || '—'}</p>
                  <p className="font-medium">Tags:</p>
                  <p className="text-primary mb-2">{(diffItem.suggested_tags || []).join(', ') || '—'}</p>
                  <p className="font-medium">Capítulos:</p>
                  <p className="text-primary whitespace-pre-wrap">{diffItem.suggested_chapters || '—'}</p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════
// CARD 4: Local SEO Targets
// ═══════════════════════════════════════════
function LocalSEOCard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filterUF, setFilterUF] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTarget, setNewTarget] = useState({
    state_uf: '', city: '', specialty: '', focus_keyword: '', category_name: '', priority: 3,
  });

  const { data: targets, isLoading } = useQuery({
    queryKey: ['local-seo-targets', filterUF, filterStatus],
    queryFn: async () => {
      let query = supabase
        .from('local_seo_targets')
        .select('*')
        .order('priority', { ascending: false });

      if (filterUF && filterUF !== 'all') query = query.eq('state_uf', filterUF);
      if (filterStatus && filterStatus !== 'all') query = query.eq('status', filterStatus);

      const { data } = await query.limit(50);
      return data || [];
    },
  });

  const generateMutation = useMutation({
    mutationFn: (params: any) => callEdgeFunction('generate-local-seo-page', params),
    onSuccess: (data) => {
      toast({ title: 'Páginas geradas', description: `${data.generated} páginas criadas` });
      queryClient.invalidateQueries({ queryKey: ['local-seo-targets'] });
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const approveTarget = async (id: string) => {
    await supabase.from('local_seo_targets').update({ status: 'approved' }).eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['local-seo-targets'] });
    toast({ title: 'Target aprovado' });
  };

  const addTarget = async () => {
    const { error } = await supabase.from('local_seo_targets').insert({
      ...newTarget,
      status: 'draft',
      html_generated: false,
      search_volume_est: 0,
    });
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Target adicionado' });
      setShowAddModal(false);
      setNewTarget({ state_uf: '', city: '', specialty: '', focus_keyword: '', category_name: '', priority: 3 });
      queryClient.invalidateQueries({ queryKey: ['local-seo-targets'] });
    }
  };

  const statusCounts = {
    draft: targets?.filter((t: any) => t.status === 'draft').length || 0,
    approved: targets?.filter((t: any) => t.status === 'approved').length || 0,
    published: targets?.filter((t: any) => t.status === 'published').length || 0,
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <MapPin className="h-5 w-5" />
          <CardTitle className="text-lg">SEO Local por Cidade/Especialidade</CardTitle>
          <Badge variant="secondary">{statusCounts.approved} aprovados</Badge>
          <Badge variant="outline">{statusCounts.published} publicados</Badge>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => generateMutation.mutate({ batch: true, limit: 3 })} disabled={generateMutation.isPending}>
            {generateMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Gerar Próximas 3
          </Button>
          <Button size="sm" variant="outline" onClick={() => generateMutation.mutate({ batch: true, limit: 50 })} disabled={generateMutation.isPending}>
            Gerar Todas Aprovadas
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Select value={filterUF} onValueChange={setFilterUF}>
            <SelectTrigger className="w-[120px]"><SelectValue placeholder="UF" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {['SP','RJ','MG','RS','PR','SC','BA','PE','CE','DF','GO','PA','MA','MT','MS','ES','PB','RN','AL','PI','SE','RO','TO','AC','AP','AM','RR'].map(uf => (
                <SelectItem key={uf} value={uf}>{uf}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">UF</th>
                  <th className="text-left py-2 px-2">Cidade</th>
                  <th className="text-left py-2 px-2">Especialidade</th>
                  <th className="text-left py-2 px-2">Keyword</th>
                  <th className="text-left py-2 px-2">Prior.</th>
                  <th className="text-left py-2 px-2">Status</th>
                  <th className="text-left py-2 px-2">HTML</th>
                  <th className="text-left py-2 px-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {(targets || []).map((t: any) => (
                  <tr key={t.id} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-2 font-medium">{t.state_uf}</td>
                    <td className="py-2 px-2">{t.city || '—'}</td>
                    <td className="py-2 px-2">{t.specialty}</td>
                    <td className="py-2 px-2">{t.focus_keyword || '—'}</td>
                    <td className="py-2 px-2">{'●'.repeat(t.priority || 1)}{'○'.repeat(5 - (t.priority || 1))}</td>
                    <td className="py-2 px-2"><StatusBadge status={t.status} /></td>
                    <td className="py-2 px-2">{t.html_generated ? '✅' : '—'}</td>
                    <td className="py-2 px-2">
                      <div className="flex gap-1">
                        {t.html_generated && (
                          <Button size="sm" variant="ghost" onClick={() => setPreviewHtml(t.html_content)}>
                            <Eye className="h-3 w-3" />
                          </Button>
                        )}
                        {t.status === 'draft' && (
                          <Button size="sm" variant="ghost" className="text-green-600" onClick={() => approveTarget(t.id)}>
                            <Check className="h-3 w-3" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => generateMutation.mutate({ target_id: t.id })}>
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* HTML Preview Modal */}
        <Dialog open={!!previewHtml} onOpenChange={() => setPreviewHtml(null)}>
          <DialogContent className="max-w-5xl h-[80vh]">
            <DialogHeader>
              <DialogTitle>Preview HTML</DialogTitle>
            </DialogHeader>
            <iframe srcDoc={previewHtml || ''} className="w-full h-full border rounded" />
          </DialogContent>
        </Dialog>

        {/* Add Target Modal */}
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Target SEO Local</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input placeholder="UF (ex: SP)" value={newTarget.state_uf} onChange={(e) => setNewTarget({ ...newTarget, state_uf: e.target.value.toUpperCase() })} maxLength={2} />
              <Input placeholder="Cidade" value={newTarget.city} onChange={(e) => setNewTarget({ ...newTarget, city: e.target.value })} />
              <Input placeholder="Especialidade (ex: Implantodontia)" value={newTarget.specialty} onChange={(e) => setNewTarget({ ...newTarget, specialty: e.target.value })} />
              <Input placeholder="Keyword principal" value={newTarget.focus_keyword} onChange={(e) => setNewTarget({ ...newTarget, focus_keyword: e.target.value })} />
              <Input placeholder="Categoria" value={newTarget.category_name} onChange={(e) => setNewTarget({ ...newTarget, category_name: e.target.value })} />
              <Select value={String(newTarget.priority)} onValueChange={(v) => setNewTarget({ ...newTarget, priority: Number(v) })}>
                <SelectTrigger><SelectValue placeholder="Prioridade" /></SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5].map(p => <SelectItem key={p} value={String(p)}>Prioridade {p}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={addTarget} disabled={!newTarget.state_uf || !newTarget.specialty}>Adicionar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════
// Main Export
// ═══════════════════════════════════════════
export function GoogleApisTab() {
  return (
    <div className="space-y-6">
      <ReviewResponsesCard />
      <GBPPostsCard />
      <YouTubeQueueCard />
      <LocalSEOCard />
    </div>
  );
}
