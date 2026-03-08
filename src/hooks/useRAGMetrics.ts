import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RAGMetrics {
  totalChunks: number;
  hallucinationRate: number;
  avgQualityScore: number;
  ragCost24h: number;
  totalConversations: number;
  activeConversations: number;
  qualityOverTime: { date: string; avgQuality: number; count: number }[];
  hallucinatedMessages: {
    id: string;
    content: string;
    quality_score: number | null;
    created_at: string;
    conversation_id: string;
  }[];
  clinicalBrainStatus: { status: string; count: number }[];
}

export function useRAGMetrics() {
  return useQuery({
    queryKey: ["rag-metrics"],
    queryFn: async (): Promise<RAGMetrics> => {
      const [
        chunksRes,
        messagesRes,
        tokenUsageRes,
        conversationsRes,
        activeConvRes,
      ] = await Promise.all([
        // Total knowledge chunks
        supabase.from("knowledge_vectors").select("id", { count: "exact", head: true }),
        // Recent LIA messages with quality data
        supabase
          .from("lia_messages")
          .select("id, content, quality_score, hallucination_flag, created_at, conversation_id")
          .order("created_at", { ascending: false })
          .limit(500),
        // AI token usage for RAG in last 24h
        supabase
          .from("ai_token_usage")
          .select("cost_brl, created_at, edge_function_id")
          .in("edge_function_id", ["rag-chat", "index-knowledge-base"])
          .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
        // Total conversations
        supabase.from("lia_conversations").select("id", { count: "exact", head: true }),
        // Active conversations
        supabase
          .from("lia_conversations")
          .select("id", { count: "exact", head: true })
          .is("ended_at", null),
      ]);

      const messages = messagesRes.data || [];
      const totalMessages = messages.length;
      const hallucinated = messages.filter((m) => m.hallucination_flag === true);
      const hallucinationRate = totalMessages > 0 ? (hallucinated.length / totalMessages) * 100 : 0;

      const qualityScores = messages.filter((m) => m.quality_score != null).map((m) => m.quality_score!);
      const avgQualityScore =
        qualityScores.length > 0
          ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length
          : 0;

      const tokenData = tokenUsageRes.data || [];
      const ragCost24h = tokenData.reduce((sum, t) => sum + (t.cost_brl || 0), 0);

      // Quality over time (group by day)
      const dayMap = new Map<string, { total: number; count: number }>();
      for (const m of messages) {
        if (m.quality_score == null) continue;
        const day = m.created_at.slice(0, 10);
        const entry = dayMap.get(day) || { total: 0, count: 0 };
        entry.total += m.quality_score;
        entry.count += 1;
        dayMap.set(day, entry);
      }
      const qualityOverTime = Array.from(dayMap.entries())
        .map(([date, v]) => ({ date, avgQuality: Math.round((v.total / v.count) * 100) / 100, count: v.count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return {
        totalChunks: chunksRes.count || 0,
        hallucinationRate: Math.round(hallucinationRate * 10) / 10,
        avgQualityScore: Math.round(avgQualityScore * 100) / 100,
        ragCost24h: Math.round(ragCost24h * 100) / 100,
        totalConversations: conversationsRes.count || 0,
        activeConversations: activeConvRes.count || 0,
        qualityOverTime,
        hallucinatedMessages: hallucinated.slice(0, 20).map((m) => ({
          id: m.id,
          content: m.content.slice(0, 200),
          quality_score: m.quality_score,
          created_at: m.created_at,
          conversation_id: m.conversation_id,
        })),
        clinicalBrainStatus: [], // Will be populated if products_repository has clinical_brain_status
      };
    },
    refetchInterval: 30000,
  });
}

export function useContentSubmissions() {
  return useQuery({
    queryKey: ["content-submissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_submissions")
        .select("id, title, source_system, content_type, processing_status, editorial_status, rejection_reason, processed_by, processed_at, created_at, version")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });
}

export function usePipelineAuditLogs(submissionId?: string) {
  return useQuery({
    queryKey: ["pipeline-audit-logs", submissionId],
    queryFn: async () => {
      let query = supabase
        .from("pipeline_audit_logs" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      
      if (submissionId) {
        query = query.eq("submission_id", submissionId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: true,
  });
}

export function useGeneratedPages() {
  return useQuery({
    queryKey: ["generated-pages-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generated_pages")
        .select("id, title, slug, path, page_type, content_status, canonical_url, seo_score, published, created_at, updated_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });
}
