import { supabase } from '@/integrations/supabase/client';

export class CompanyDataCollector {
  /**
   * Collect sitelinks from company social media and profile
   */
  static async collectCompanySitelinks(): Promise<{ label: string; url: string }[]> {
    try {
      const { data: companyProfile } = await supabase
        .from('company_profile')
        .select('social_media_links, website_url, instagram_profile, youtube_channel')
        .single();

      if (!companyProfile) return [];

      const sitelinks = [];

      // Add website
      if (companyProfile.website_url) {
        sitelinks.push({
          label: 'Site Oficial',
          url: companyProfile.website_url
        });
      }

      // Add social media from social_media_links (JSON)
      if (companyProfile.social_media_links && Array.isArray(companyProfile.social_media_links)) {
        companyProfile.social_media_links.forEach((link: any) => {
          if (link.url && link.label) {
            sitelinks.push({
              label: link.label,
              url: link.url
            });
          }
        });
      }

      // Add individual social profiles
      if (companyProfile.instagram_profile) {
        sitelinks.push({
          label: 'Instagram',
          url: companyProfile.instagram_profile
        });
      }

      if (companyProfile.youtube_channel) {
        sitelinks.push({
          label: 'YouTube',
          url: companyProfile.youtube_channel
        });
      }

      return sitelinks.slice(0, 6); // Google Ads limit
    } catch (error) {
      console.error('Error collecting company sitelinks:', error);
      return [];
    }
  }

  /**
   * Collect company videos for video extensions
   */
  static async collectCompanyVideos(): Promise<{ youtube_id: string; label?: string }[]> {
    try {
      const { data: companyProfile } = await supabase
        .from('company_profile')
        .select('company_videos')
        .single();

      if (!companyProfile?.company_videos) return [];

      const videos = [];
      const companyVideos = companyProfile.company_videos;

      // Extract from different video categories
      ['youtube_videos', 'technical_videos', 'testimonial_videos', 'instagram_videos'].forEach(category => {
        if (companyVideos[category] && Array.isArray(companyVideos[category])) {
          companyVideos[category].forEach((video: any) => {
            if (video.url) {
              const youtubeId = this.extractYouTubeId(video.url);
              if (youtubeId) {
                videos.push({
                  youtube_id: youtubeId,
                  label: video.title || video.label || `Vídeo da Empresa`
                });
              }
            }
          });
        }
      });

      return videos.slice(0, 20); // Google Ads limit
    } catch (error) {
      console.error('Error collecting company videos:', error);
      return [];
    }
  }

  /**
   * Extract YouTube ID from various URL formats
   */
  private static extractYouTubeId(url: string): string | null {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  /**
   * Get target audience from company profile and categories
   */
  static async collectTargetAudience(): Promise<string[]> {
    try {
      const { data: companyProfile } = await supabase
        .from('company_profile')
        .select('target_audience')
        .single();

      if (!companyProfile?.target_audience) return [];

      // Parse target audience if it's a string
      if (typeof companyProfile.target_audience === 'string') {
        return companyProfile.target_audience
          .split(',')
          .map(audience => audience.trim())
          .filter(audience => audience.length > 0);
      }

      return [];
    } catch (error) {
      console.error('Error collecting target audience:', error);
      return [];
    }
  }
}