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

  static async collectFromCompanyProfile(userId?: string): Promise<VideoExtension[]> {
    try {
      if (!userId) return [];

      const { data: profile, error } = await supabase
        .from('company_profile')
        .select('company_videos')
        .eq('user_id', userId)
        .single();
      
      if (error || !profile?.company_videos) {
        return [];
      }

      const videos: VideoExtension[] = [];
      const seenUrls = new Set<string>();
      const companyVideos = profile.company_videos as any;

      // Process company video collections
      this.processVideoCollection(companyVideos.youtube_videos, 'Empresa', 'YouTube', videos, seenUrls);
      this.processVideoCollection(companyVideos.testimonial_videos, 'Empresa', 'Depoimento', videos, seenUrls);
      this.processVideoCollection(companyVideos.technical_videos, 'Empresa', 'Técnico', videos, seenUrls);

      // Log Instagram videos as not supported
      if (companyVideos.instagram_videos && companyVideos.instagram_videos.length > 0) {
        console.info(`⚠️ ${companyVideos.instagram_videos.length} vídeos do Instagram da empresa encontrados mas não são suportados pelo Google Ads.`);
      }

      console.log(`VideoCollector: Collected ${videos.length} YouTube videos from company profile`);
      return videos;
    } catch (error) {
      console.error('Error collecting videos from company profile:', error);
      return [];
    }
  }
  
  /**
   * Process a collection of video objects and add YouTube videos to the collection
   */
  private static processVideoCollection(videos: any[], productName: string, type: string, collection: VideoExtension[], seenUrls: Set<string>): void {
    if (!videos || !Array.isArray(videos)) return;
    
    videos.forEach((video: any, index: number) => {
      if (video.url && VideoCollector.validateYouTubeUrl(video.url).valid && !seenUrls.has(video.url)) {
        const id = VideoCollector.extractYouTubeId(video.url);
        if (id) {
          collection.push({
            youtube_id: id,
            label: `${productName} - ${type} ${index + 1}${video.description ? ` (${video.description.substring(0, 20)}...)` : ''}`
          });
          seenUrls.add(video.url);
          console.log(`VideoCollector: Added ${type} video for "${productName}": ${id}`);
        }
      }
    });
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
  
  static async collectAll(landingPageId: string, manualVideos: { url: string; label?: string }[], userId?: string): Promise<VideoExtension[]> {
    const [blogVideos, testimonialVideos, companyVideos] = await Promise.all([
      this.collectFromBlogPosts(landingPageId),
      this.collectFromTestimonials(landingPageId),
      this.collectFromCompanyProfile(userId)
    ]);
    
    const manualVideoExtensions = this.collectFromManualUrls(manualVideos);
    
    // Combine all videos and remove duplicates by youtube_id
    const allVideos = [...blogVideos, ...testimonialVideos, ...companyVideos, ...manualVideoExtensions];
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