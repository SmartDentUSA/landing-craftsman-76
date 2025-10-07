import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to extract YouTube video ID from URL
function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

// Helper function to get YouTube thumbnail URL
function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

// Helper function to sanitize XML content
function sanitizeXML(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting video sitemap generation...');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get domain from request
    const url = new URL(req.url);
    const hostHeader = req.headers.get('host');
    const domain = hostHeader || url.hostname;
    
    console.log(`Generating video sitemap for domain: ${domain}`);

    const videos: any[] = [];

    // 1. Collect videos from products_repository
    const { data: products, error: productsError } = await supabase
      .from('products_repository')
      .select('id, name, description, youtube_videos, instagram_videos, testimonial_videos, technical_videos, tiktok_videos, product_url, created_at')
      .eq('approved', true);

    if (productsError) {
      console.error('Error fetching products:', productsError);
    } else if (products) {
      for (const product of products) {
        const productUrl = product.product_url || `https://${domain}/produto/${product.id}`;
        
        // YouTube videos
        if (product.youtube_videos && Array.isArray(product.youtube_videos)) {
          product.youtube_videos.forEach((video: any) => {
            const videoId = extractYouTubeId(video.url);
            if (videoId) {
              videos.push({
                pageUrl: productUrl,
                videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
                title: video.description || product.name,
                description: product.description || video.description || product.name,
                thumbnailUrl: getYouTubeThumbnail(videoId),
                publicationDate: product.created_at,
                type: 'youtube'
              });
            }
          });
        }

        // Instagram videos
        if (product.instagram_videos && Array.isArray(product.instagram_videos)) {
          product.instagram_videos.forEach((video: any) => {
            if (video.url) {
              videos.push({
                pageUrl: productUrl,
                videoUrl: video.url,
                title: video.description || product.name,
                description: product.description || video.description || product.name,
                thumbnailUrl: video.thumbnail || '',
                publicationDate: product.created_at,
                type: 'instagram'
              });
            }
          });
        }

        // TikTok videos
        if (product.tiktok_videos && Array.isArray(product.tiktok_videos)) {
          product.tiktok_videos.forEach((video: any) => {
            if (video.url) {
              videos.push({
                pageUrl: productUrl,
                videoUrl: video.url,
                title: video.description || product.name,
                description: product.description || video.description || product.name,
                thumbnailUrl: video.thumbnail || '',
                publicationDate: product.created_at,
                type: 'tiktok'
              });
            }
          });
        }

        // Technical and testimonial videos
        ['technical_videos', 'testimonial_videos'].forEach(videoType => {
          if (product[videoType] && Array.isArray(product[videoType])) {
            product[videoType].forEach((video: any) => {
              const videoId = extractYouTubeId(video.url);
              if (videoId) {
                videos.push({
                  pageUrl: productUrl,
                  videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
                  title: video.description || product.name,
                  description: product.description || video.description || product.name,
                  thumbnailUrl: getYouTubeThumbnail(videoId),
                  publicationDate: product.created_at,
                  type: 'youtube'
                });
              }
            });
          }
        });
      }
    }

    // 2. Collect videos from blog_posts
    const { data: blogs, error: blogsError } = await supabase
      .from('blog_posts')
      .select('id, title, meta_description, youtube_video_url, landing_page_id, published_at, created_at')
      .eq('status', 'published')
      .not('youtube_video_url', 'is', null);

    if (blogsError) {
      console.error('Error fetching blogs:', blogsError);
    } else if (blogs) {
      for (const blog of blogs) {
        const videoId = extractYouTubeId(blog.youtube_video_url);
        if (videoId) {
          const blogUrl = `https://${domain}/blog/${blog.landing_page_id}`;
          videos.push({
            pageUrl: blogUrl,
            videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
            title: blog.title,
            description: blog.meta_description || blog.title,
            thumbnailUrl: getYouTubeThumbnail(videoId),
            publicationDate: blog.published_at || blog.created_at,
            type: 'youtube'
          });
        }
      }
    }

    // 3. Collect videos from video_testimonials
    const { data: testimonials, error: testimonialsError } = await supabase
      .from('video_testimonials')
      .select('id, client_name, testimonial_text, youtube_url, instagram_url, landing_page_id, created_at')
      .eq('approved', true);

    if (testimonialsError) {
      console.error('Error fetching testimonials:', testimonialsError);
    } else if (testimonials) {
      for (const testimonial of testimonials) {
        const pageUrl = `https://${domain}/${testimonial.landing_page_id}`;
        
        if (testimonial.youtube_url) {
          const videoId = extractYouTubeId(testimonial.youtube_url);
          if (videoId) {
            videos.push({
              pageUrl,
              videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
              title: `Depoimento - ${testimonial.client_name}`,
              description: testimonial.testimonial_text,
              thumbnailUrl: getYouTubeThumbnail(videoId),
              publicationDate: testimonial.created_at,
              type: 'youtube'
            });
          }
        }

        if (testimonial.instagram_url) {
          videos.push({
            pageUrl,
            videoUrl: testimonial.instagram_url,
            title: `Depoimento - ${testimonial.client_name}`,
            description: testimonial.testimonial_text,
            thumbnailUrl: '',
            publicationDate: testimonial.created_at,
            type: 'instagram'
          });
        }
      }
    }

    // 4. Collect videos from company_profile
    const { data: companyProfile, error: companyError } = await supabase
      .from('company_profile')
      .select('company_videos, created_at')
      .single();

    if (companyError) {
      console.log('No company profile found or error:', companyError);
    } else if (companyProfile?.company_videos) {
      const companyVideos = companyProfile.company_videos;
      const companyUrl = `https://${domain}/sobre`;

      ['youtube_videos', 'instagram_videos', 'technical_videos', 'testimonial_videos'].forEach(videoType => {
        if (companyVideos[videoType] && Array.isArray(companyVideos[videoType])) {
          companyVideos[videoType].forEach((video: any) => {
            const videoId = extractYouTubeId(video.url);
            if (videoId) {
              videos.push({
                pageUrl: companyUrl,
                videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
                title: video.description || 'Vídeo Institucional',
                description: video.description || 'Vídeo da empresa',
                thumbnailUrl: getYouTubeThumbnail(videoId),
                publicationDate: companyProfile.created_at,
                type: 'youtube'
              });
            } else if (video.url && video.url.includes('instagram')) {
              videos.push({
                pageUrl: companyUrl,
                videoUrl: video.url,
                title: video.description || 'Vídeo Institucional',
                description: video.description || 'Vídeo da empresa',
                thumbnailUrl: '',
                publicationDate: companyProfile.created_at,
                type: 'instagram'
              });
            }
          });
        }
      });
    }

    console.log(`Total videos collected: ${videos.length}`);

    // Generate video sitemap XML
    let sitemapXML = '<?xml version="1.0" encoding="UTF-8"?>\n';
    sitemapXML += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
    sitemapXML += '        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n';

    for (const video of videos) {
      sitemapXML += '  <url>\n';
      sitemapXML += `    <loc>${sanitizeXML(video.pageUrl)}</loc>\n`;
      sitemapXML += '    <video:video>\n';
      sitemapXML += `      <video:content_loc>${sanitizeXML(video.videoUrl)}</video:content_loc>\n`;
      sitemapXML += `      <video:title>${sanitizeXML(video.title)}</video:title>\n`;
      sitemapXML += `      <video:description>${sanitizeXML(video.description)}</video:description>\n`;
      
      if (video.thumbnailUrl) {
        sitemapXML += `      <video:thumbnail_loc>${sanitizeXML(video.thumbnailUrl)}</video:thumbnail_loc>\n`;
      }
      
      if (video.publicationDate) {
        const pubDate = new Date(video.publicationDate).toISOString();
        sitemapXML += `      <video:publication_date>${pubDate}</video:publication_date>\n`;
      }
      
      sitemapXML += '    </video:video>\n';
      sitemapXML += '  </url>\n';
    }

    sitemapXML += '</urlset>';

    // Log video sitemap generation
    const { error: logError } = await supabase
      .from('system_monitoring')
      .insert({
        event_type: 'video_sitemap_generation',
        component_name: 'generate-video-sitemap',
        event_data: {
          domain,
          total_videos: videos.length,
          video_types: {
            youtube: videos.filter(v => v.type === 'youtube').length,
            instagram: videos.filter(v => v.type === 'instagram').length,
            tiktok: videos.filter(v => v.type === 'tiktok').length
          },
          timestamp: new Date().toISOString()
        },
        severity: 'info',
        tags: ['seo', 'video-sitemap', 'automation']
      });

    if (logError) {
      console.error('Error logging video sitemap generation:', logError);
    }

    return new Response(sitemapXML, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=21600', // Cache for 6 hours
      },
    });

  } catch (error) {
    console.error('Error generating video sitemap:', error);
    
    // Return minimal fallback sitemap
    const fallbackSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
</urlset>`;

    return new Response(fallbackSitemap, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    });
  }
});
