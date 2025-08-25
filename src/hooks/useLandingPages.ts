import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface LandingPage {
  id: string;
  name: string;
  status: 'draft' | 'approved';
  lastModified: Date;
  version: number;
  template: string;
  data?: any;
}

interface LandingPagesStore {
  landingPages: LandingPage[];
  addLandingPage: (landingPage: Omit<LandingPage, 'id' | 'lastModified' | 'version'>) => string;
  updateLandingPage: (id: string, updates: Partial<LandingPage>) => void;
  getLandingPage: (id: string) => LandingPage | undefined;
  deleteLandingPage: (id: string) => void;
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
          template: 'Smart Dent Base v1'
        },
        {
          id: '2',
          name: 'Promoção Implantes Março',
          status: 'draft',
          lastModified: new Date('2024-01-14'),
          version: 1,
          template: 'Smart Dent Base v1'
        },
        {
          id: '3',
          name: 'Landing Ortodontia Premium',
          status: 'approved',
          lastModified: new Date('2024-01-10'),
          version: 2,
          template: 'Smart Dent Base v1'
        }
      ],
      addLandingPage: (landingPage) => {
        const id = `lp_${Date.now()}`;
        const newLandingPage: LandingPage = {
          ...landingPage,
          id,
          lastModified: new Date(),
          version: 1,
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