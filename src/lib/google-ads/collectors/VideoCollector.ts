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
  
  private static extractYouTubeId(url: string): string | null {
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
  
  static async collectAll(landingPageId: string, manualVideos: { url: string; label?: string }[]): Promise<VideoExtension[]> {
    const [blogVideos, testimonialVideos] = await Promise.all([
      this.collectFromBlogPosts(landingPageId),
      this.collectFromTestimonials(landingPageId)
    ]);
    
    const manualVideoExtensions = this.collectFromManualUrls(manualVideos);
    
    // Combine all videos and remove duplicates by youtube_id
    const allVideos = [...blogVideos, ...testimonialVideos, ...manualVideoExtensions];
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