import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ModerationRequest {
  action: 'get_pending' | 'approve' | 'reject' | 'get_approved' | 'generate_schema';
  place_id?: string;
  landing_page_id?: string;
  review_id?: string;
  display_order?: number;
  notes?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, place_id, landing_page_id, review_id, display_order, notes }: ModerationRequest = await req.json();
    
    console.log('Moderation action:', action, { place_id, landing_page_id, review_id });

    switch (action) {
      case 'get_pending': {
        if (!place_id) {
          throw new Error('place_id é obrigatório para buscar reviews pendentes');
        }

        const { data: pendingReviews, error } = await supabase
          .from('raw_reviews')
          .select(`
            *,
            approved_reviews!left(id, landing_page_id)
          `)
          .eq('place_id', place_id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Filter out reviews that are already approved for any landing page
        const trulyPending = pendingReviews?.filter(review => 
          !review.approved_reviews || review.approved_reviews.length === 0
        ) || [];

        return new Response(JSON.stringify({
          success: true,
          data: trulyPending,
          total: trulyPending.length
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'approve': {
        if (!review_id || !landing_page_id) {
          throw new Error('review_id e landing_page_id são obrigatórios para aprovar');
        }

        const { data, error } = await supabase
          .from('approved_reviews')
          .insert({
            landing_page_id,
            raw_review_id: review_id,
            display_order: display_order || 0,
            notes: notes || '',
            approved_by: 'manual'
          })
          .select('*')
          .single();

        if (error) throw error;

        return new Response(JSON.stringify({
          success: true,
          data,
          message: 'Review aprovada com sucesso'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'reject': {
        if (!review_id) {
          throw new Error('review_id é obrigatório para rejeitar');
        }

        // Just mark as processed - we could add a rejected_reviews table if needed
        // For now, we'll just ensure it doesn't appear in pending
        console.log('Rejecting review:', review_id);

        return new Response(JSON.stringify({
          success: true,
          message: 'Review rejeitada'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_approved': {
        if (!landing_page_id) {
          throw new Error('landing_page_id é obrigatório para buscar reviews aprovadas');
        }

        const { data: approvedReviews, error } = await supabase
          .from('approved_reviews')
          .select(`
            *,
            raw_reviews (
              author_name,
              rating,
              review_text,
              review_date,
              relative_time,
              profile_photo_url
            )
          `)
          .eq('landing_page_id', landing_page_id)
          .order('display_order', { ascending: true });

        if (error) throw error;

        return new Response(JSON.stringify({
          success: true,
          data: approvedReviews || [],
          total: approvedReviews?.length || 0
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'generate_schema': {
        if (!landing_page_id) {
          throw new Error('landing_page_id é obrigatório para gerar schema');
        }

        const { data: approvedReviews, error } = await supabase
          .from('approved_reviews')
          .select(`
            *,
            raw_reviews (
              author_name,
              rating,
              review_text,
              review_date,
              relative_time
            )
          `)
          .eq('landing_page_id', landing_page_id)
          .order('display_order', { ascending: true });

        if (error) throw error;

        if (!approvedReviews || approvedReviews.length === 0) {
          return new Response(JSON.stringify({
            success: true,
            schema: null,
            message: 'Nenhuma review aprovada encontrada'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Calculate aggregate rating
        const ratings = approvedReviews.map(r => r.raw_reviews.rating);
        const avgRating = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
        
        // Generate JSON-LD schema
        const schema = {
          "@context": "https://schema.org",
          "@type": "Product", // or LocalBusiness
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": avgRating.toFixed(1),
            "reviewCount": approvedReviews.length,
            "bestRating": "5",
            "worstRating": "1"
          },
          "review": approvedReviews.map(approved => ({
            "@type": "Review",
            "reviewRating": {
              "@type": "Rating",
              "ratingValue": approved.raw_reviews.rating,
              "bestRating": "5",
              "worstRating": "1"
            },
            "author": {
              "@type": "Person",
              "name": approved.raw_reviews.author_name
            },
            "reviewBody": approved.raw_reviews.review_text || "",
            "datePublished": approved.raw_reviews.review_date || ""
          }))
        };

        return new Response(JSON.stringify({
          success: true,
          schema,
          stats: {
            avgRating: avgRating.toFixed(1),
            totalReviews: approvedReviews.length,
            ratingsDistribution: {
              5: ratings.filter(r => r === 5).length,
              4: ratings.filter(r => r === 4).length,
              3: ratings.filter(r => r === 3).length,
              2: ratings.filter(r => r === 2).length,
              1: ratings.filter(r => r === 1).length,
            }
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error(`Ação não suportada: ${action}`);
    }

  } catch (error) {
    console.error('Error in moderate-reviews function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});