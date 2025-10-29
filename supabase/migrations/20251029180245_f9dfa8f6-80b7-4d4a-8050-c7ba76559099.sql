-- Adicionar campos para personalização de textos WhatsApp e labels SPIN
ALTER TABLE spin_selling_solutions 
ADD COLUMN IF NOT EXISTS whatsapp_section_titles JSONB DEFAULT '{
  "journey_title": "💬 Jornada do Cliente:",
  "journey_subtitle": null,
  "metrics_title": "📊 Métricas de Impacto:",
  "metrics_subtitle": null
}'::jsonb,
ADD COLUMN IF NOT EXISTS spin_journey_labels JSONB DEFAULT '{
  "desire_label": "🎯 *Desejo:*",
  "pain_label": "⚠️ *Dor:*",
  "result_label": "✅ *Resultado Esperado:*"
}'::jsonb;