import { VideoExtension } from '@/types/google-ads';
import { supabase } from '@/integrations/supabase/client';

export class VideoCollector {
  static async collectFromBlogPosts(landingPageId: string): Promise<VideoExtension[]> {
    try {
      const { data: blogPosts, error } = await supabase
        .from('blog_posts')
        .select('youtube_video_url, title')
        .eq('landing_page_id', landingPageId)
        .eq('status', 'published')
        .not('youtube_video_url', 'is', null);
      
      if (error) {
        console.error('Error fetching blog posts:', error);
        return [];
      }
      
      return blogPosts
        .map(post => this.extractYouTubeId(post.youtube_video_url!))
        .filter(id => id !== null)
        .map(id => ({
          youtube_id: id!,
          label: 'Blog Video'
        }));
    } catch (error) {
      console.error('Error collecting videos from blog posts:', error);
      return [];
    }
  }
  
  static async collectFromTestimonials(landingPageId: string): Promise<VideoExtension[]> {
    try {
      const { data: testimonials, error } = await supabase
        .from('video_testimonials')
        .select('youtube_url, client_name')
        .eq('landing_page_id', landingPageId)
        .eq('approved', true)
        .not('youtube_url', 'is', null);
      
      if (error) {
        console.error('Error fetching video testimonials:', error);
        return [];
      }
      
      return testimonials
        .map(testimonial => this.extractYouTubeId(testimonial.youtube_url!))
        .filter(id => id !== null)
        .map((id, index) => ({
          youtube_id: id!,
          label: `Depoimento ${index + 1}`
        }));
    } catch (error) {
      console.error('Error collecting videos from testimonials:', error);
      return [];
    }
  }
  
  static collectFromManualUrls(urls: { url: string; label?: string }[]): VideoExtension[] {
    return urls
      .map(({ url, label }) => {
        const youtubeId = this.extractYouTubeId(url);
        return youtubeId ? {
          youtube_id: youtubeId,
          label: label || 'Vídeo Manual'
        } : null;
      })
      .filter((extension): extension is NonNullable<typeof extension> => extension !== null);
  }

  static collectFromProducts(landingPageData: any): VideoExtension[] {
    try {
      if (!landingPageData?.editor_data?.products || !Array.isArray(landingPageData.editor_data.products)) {
        return [];
      }

      const videos: VideoExtension[] = [];
      const seenUrls = new Set<string>();

      landingPageData.editor_data.products.forEach((product: any, index: number) => {
        // Process YouTube URLs
        if (product.youtube_url && !seenUrls.has(product.youtube_url)) {
          const youtubeId = this.extractYouTubeId(product.youtube_url);
          if (youtubeId) {
            videos.push({
              youtube_id: youtubeId,
              label: product.name ? `Produto: ${product.name}` : `Produto ${index + 1}`
            });
            seenUrls.add(product.youtube_url);
          }
        }

        // Instagram URLs are not supported by Google Ads, but we can log them for user awareness
        if (product.instagram_url && console) {
          console.info(`⚠️ Instagram URL encontrada no produto "${product.name || `Produto ${index + 1}`}": ${product.instagram_url}. URLs do Instagram não são suportadas pelo Google Ads.`);
        }
      });

      return videos;
    } catch (error) {
      console.error('Error collecting videos from products:', error);
      return [];
    }
  }
  
  static extractYouTubeId(url: string): string | null {
    if (!url) return null;
    
    // Handle various YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  }
  
  static async collectAll(landingPageId: string, manualVideos: { url: string; label?: string }[], landingPageData?: any): Promise<VideoExtension[]> {
    const [blogVideos, testimonialVideos] = await Promise.all([
      this.collectFromBlogPosts(landingPageId),
      this.collectFromTestimonials(landingPageId)
    ]);
    
    const manualVideoExtensions = this.collectFromManualUrls(manualVideos);
    const productVideos = landingPageData ? this.collectFromProducts(landingPageData) : [];
    
    // Combine all videos and remove duplicates by youtube_id
    const allVideos = [...blogVideos, ...testimonialVideos, ...productVideos, ...manualVideoExtensions];
    const uniqueVideos = allVideos.filter((video, index, arr) => 
      arr.findIndex(v => v.youtube_id === video.youtube_id) === index
    );
    
    // Google Ads limit for video extensions
    return uniqueVideos.slice(0, 20);
  }
  
  static validateYouTubeUrl(url: string): { valid: boolean; warning?: string } {
    if (!url.trim()) {
      return { valid: false, warning: 'URL vazia' };
    }
    
    const youtubeId = this.extractYouTubeId(url);
    if (!youtubeId) {
      return { valid: false, warning: 'URL do YouTube inválida' };
    }
    
    return { valid: true };
  }
}