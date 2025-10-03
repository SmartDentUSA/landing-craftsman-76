-- Adicionar campo whatsapp_sequences na tabela products_repository
ALTER TABLE products_repository 
ADD COLUMN IF NOT EXISTS whatsapp_sequences JSONB 
DEFAULT '{"sequences": [], "last_generated": null}'::jsonb;

-- Adicionar comentário descritivo
COMMENT ON COLUMN products_repository.whatsapp_sequences IS 
'Histórico de sequências de 7 mensagens WhatsApp para campanhas agendadas.
Formato: {
  "sequences": [
    {
      "id": "uuid",
      "generated_at": "ISO Date",
      "messages": [
        {"id": "uuid", "number": 1, "content": "...", "editable": true, "approach": "beneficio"},
        {"id": "uuid", "number": 2, "content": "...", "editable": true, "approach": "prova_social"},
        ...
        {"id": "uuid", "number": 7, "content": "...", "editable": true, "approach": "ultima_chamada"}
      ]
    }
  ],
  "last_generated": "ISO Date"
}';