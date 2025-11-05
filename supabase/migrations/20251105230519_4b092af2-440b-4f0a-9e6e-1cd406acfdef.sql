-- Adicionar novos campos de hashtags e handles das redes sociais
ALTER TABLE company_profile
ADD COLUMN IF NOT EXISTS social_media_hashtags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS social_media_handles TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS youtube_tags TEXT[] DEFAULT '{}';

-- Comentários descritivos
COMMENT ON COLUMN company_profile.social_media_hashtags IS 'Hashtags gerais usadas nas redes sociais da empresa (sem o símbolo #)';
COMMENT ON COLUMN company_profile.social_media_handles IS 'Handles/usernames das redes sociais mencionados (sem o símbolo @)';
COMMENT ON COLUMN company_profile.youtube_tags IS 'Tags específicas para vídeos do YouTube (sem o símbolo #)';