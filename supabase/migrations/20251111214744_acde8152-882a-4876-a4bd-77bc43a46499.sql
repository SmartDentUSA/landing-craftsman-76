-- Add nps_metrics column to company_profile
ALTER TABLE company_profile 
ADD COLUMN IF NOT EXISTS nps_metrics JSONB DEFAULT NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_company_profile_nps_metrics 
ON company_profile USING gin (nps_metrics);

COMMENT ON COLUMN company_profile.nps_metrics IS 'NPS metrics and customer interest themes analysis: aggregate_rating, total_responses, unique_respondents, satisfaction_score, recommendation_score, training_quality_score, nps_score, promoters_percentage, passives_percentage, detractors_percentage, interest_themes (with count and percentage), insights (common_themes, top_keywords, content_opportunities, product_correlations), last_updated';
