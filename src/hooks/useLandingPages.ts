import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';

export interface LandingPage {
  id: string;
  name: string;
  status: 'draft' | 'approved';
  lastModified: Date;
  version: number;
  template: string;
  data?: any;
  embed?: {
    mode: 'default' | 'selflux';
    namespace: string;
  };
}

interface LandingPagesStore {
  landingPages: LandingPage[];
  addLandingPage: (landingPage: Omit<LandingPage, 'id' | 'lastModified' | 'version'>) => string;
  updateLandingPage: (id: string, updates: Partial<LandingPage>) => void;
  getLandingPage: (id: string) => LandingPage | undefined;
  deleteLandingPage: (id: string) => void;
  saveManualReviews: (landingPageId: string, reviews: any[]) => Promise<void>;
  loadManualReviews: (landingPageId: string) => Promise<any[]>;
}

const useLandingPages = create<LandingPagesStore>()(
  persist(
    (set, get) => ({
      landingPages: [
        {
          id: '1',
          name: 'Smart Dent Campanha Q1',
          status: 'approved',
          lastModified: new Date('2024-01-15'),
          version: 3,
          template: 'Smart Dent Base v1',
          embed: {
            mode: 'default',
            namespace: 'sd'
          }
        },
        {
          id: '2',
          name: 'Promoção Implantes Março',
          status: 'draft',
          lastModified: new Date('2024-01-14'),
          version: 1,
          template: 'Smart Dent Base v1',
          embed: {
            mode: 'default',
            namespace: 'sd'
          }
        },
        {
          id: '3',
          name: 'Landing Ortodontia Premium',
          status: 'approved',
          lastModified: new Date('2024-01-10'),
          version: 2,
          template: 'Smart Dent Base v1',
          embed: {
            mode: 'default',
            namespace: 'sd'
          }
        }
      ],
      addLandingPage: (landingPage) => {
        const id = `lp_${Date.now()}`;
        const newLandingPage: LandingPage = {
          ...landingPage,
          id,
          lastModified: new Date(),
          version: 1,
          embed: landingPage.embed || {
            mode: 'default',
            namespace: 'sd'
          }
        };
        
        set((state) => ({
          landingPages: [...state.landingPages, newLandingPage]
        }));
        
        return id;
      },
      updateLandingPage: (id, updates) => {
        set((state) => ({
          landingPages: state.landingPages.map((lp) =>
            lp.id === id
              ? { 
                  ...lp, 
                  ...updates, 
                  lastModified: new Date(),
                  version: updates.status === 'approved' && lp.status === 'draft' ? lp.version + 1 : lp.version
                }
              : lp
          )
        }));
      },
      getLandingPage: (id) => {
        return get().landingPages.find((lp) => lp.id === id);
      },
      deleteLandingPage: (id) => {
        set((state) => ({
          landingPages: state.landingPages.filter((lp) => lp.id !== id)
        }));
      },
      saveManualReviews: async (landingPageId: string, reviews: any[]) => {
        try {
          // Delete existing manual reviews for this landing page
          await supabase
            .from('manual_reviews')
            .delete()
            .eq('landing_page_id', landingPageId);

          // Insert new reviews
          if (reviews.length > 0) {
            const reviewsToInsert = reviews.map(review => ({
              landing_page_id: landingPageId,
              author_name: review.author_name,
              rating: review.rating,
              review_text: review.review_text,
              approved: review.approved
            }));

            const { error } = await supabase
              .from('manual_reviews')
              .insert(reviewsToInsert);

            if (error) throw error;
          }
        } catch (error) {
          console.error('Error saving manual reviews:', error);
          throw error;
        }
      },
      loadManualReviews: async (landingPageId: string) => {
        try {
          const { data, error } = await supabase
            .from('manual_reviews')
            .select('*')
            .eq('landing_page_id', landingPageId)
            .order('created_at', { ascending: false });

          if (error) throw error;

          return data?.map(review => ({
            id: review.id,
            author_name: review.author_name,
            rating: review.rating,
            review_text: review.review_text,
            approved: review.approved
          })) || [];
        } catch (error) {
          console.error('Error loading manual reviews:', error);
          return [];
        }
      }
    }),
    {
      name: 'landing-pages-storage',
      partialize: (state) => ({
        landingPages: state.landingPages.map(lp => ({
          ...lp,
          lastModified: lp.lastModified.toISOString()
        }))
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.landingPages = state.landingPages.map(lp => ({
            ...lp,
            lastModified: new Date(lp.lastModified)
          }));
        }
      }
    }
  )
);

export default useLandingPages;