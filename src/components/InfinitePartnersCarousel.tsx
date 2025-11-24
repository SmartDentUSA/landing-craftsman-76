import { ImageData } from '@/pages/Editor';

interface Partner {
  id: string;
  name: string;
  seo_description: string;
  logo: ImageData;
}

interface Props {
  title?: string;
  partners: Partner[];
  visibleDesktop: boolean;
  visibleMobile: boolean;
}

export function InfinitePartnersCarousel({ 
  title, 
  partners,
  visibleDesktop,
  visibleMobile 
}: Props) {
  console.log('🎬 [CAROUSEL-DEBUG]', {
    partners_count: partners?.length ?? 0,
    partners_data: partners?.map((p, i) => ({
      index: i,
      id: p.id,
      name: p.name,
      seo_description: p.seo_description,
      logo_src: p.logo?.src,
      logo_mode: p.logo?.mode
    })),
    visibleDesktop,
    visibleMobile
  });

  if (!partners || partners.length === 0) return null;
  
  // Duplicar array para efeito seamless
  const duplicatedPartners = [...partners, ...partners];
  
  const getImageUrl = (logo: ImageData) => {
    // Usa diretamente logo.src que já contém a URL completa correta
    return logo.src || '/placeholder.svg';
  };
  
  return (
    <section 
      className={`py-6 bg-transparent ${!visibleDesktop ? 'md:hidden' : ''} ${!visibleMobile ? 'hidden md:block' : ''}`}
      aria-label="Empresas Parceiras"
    >
      <div className="container mx-auto px-4">
        <div className="overflow-hidden">
          <div className="animate-infinite-scroll flex gap-16 items-center">
            {duplicatedPartners.map((partner, index) => (
              <img 
                key={`${partner.id}-${index}`}
                src={getImageUrl(partner.logo)}
                alt={partner.name || partner.seo_description || `Parceiro ${index + 1}`}
                title={partner.seo_description || partner.name}
                loading="lazy"
                className="h-12 md:h-16 object-contain grayscale hover:grayscale-0 transition-all duration-300 flex-shrink-0"
                onLoad={(e) => console.log('✅ [IMG-LOAD]', { 
                  index, 
                  src: (e.target as HTMLImageElement).src,
                  naturalWidth: (e.target as HTMLImageElement).naturalWidth 
                })}
                onError={(e) => console.error('❌ [IMG-ERROR]', { 
                  index,
                  attempted_src: (e.target as HTMLImageElement).src,
                  logo_data: partner.logo 
                })}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
