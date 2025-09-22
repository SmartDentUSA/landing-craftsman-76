-- ========================================
-- RESET COMPLETO PARA TESTES - EXECUÇÃO
-- ========================================

-- 1. LIMPAR DADOS DE REVIEWS
DELETE FROM approved_reviews;
DELETE FROM video_testimonials;
DELETE FROM manual_reviews;
DELETE FROM raw_reviews;

-- 2. LIMPAR JOBS E CAMPANHAS
DELETE FROM extraction_jobs;
DELETE FROM google_ads_campaigns;

-- 3. LIMPAR PRODUTOS E BLOGS
DELETE FROM products_repository;
DELETE FROM blog_posts;