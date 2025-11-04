-- Adicionar campos de verificação para redes sociais
ALTER TABLE company_profile
ADD COLUMN IF NOT EXISTS instagram_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS youtube_verified BOOLEAN DEFAULT false;

COMMENT ON COLUMN company_profile.instagram_verified IS 'Indica se o perfil do Instagram é verificado oficialmente';
COMMENT ON COLUMN company_profile.youtube_verified IS 'Indica se o canal do YouTube é verificado oficialmente';