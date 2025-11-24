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
                alt={`${partner.name} - ${partner.seo_description}`}
                title={partner.seo_description}
                loading="lazy"
                className="h-12 md:h-16 object-contain grayscale hover:grayscale-0 transition-all duration-300 flex-shrink-0"
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
