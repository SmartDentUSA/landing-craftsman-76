-- Atualizar dados essenciais do produto Pionext UV-02 para melhorar geração de conteúdo
UPDATE products_repository 
SET 
  benefits = '["Cura uniforme com 3 comprimentos de onda", "Tecnologia de reflexão espelhada", "Alta velocidade e eficiência", "Acabamento profissional", "Compatível com todas as resinas fotopoliméricas", "Redução de tempo de pós-cura em até 70%", "Eliminação de pontos fracos", "Otimização de propriedades mecânicas", "Maior durabilidade das peças", "Biocompatibilidade garantida"]'::jsonb,
  keywords = '["pós-cura", "impressão 3D", "resina 3D", "UV", "odontologia digital", "tecnologia", "laboratório", "prototipagem", "cura UV", "equipamento profissional"]'::jsonb,
  target_audience = '["Dentistas", "Laboratórios de prótese", "Profissionais de impressão 3D", "Clínicas odontológicas", "Técnicos em prótese dentária", "Makers e entusiastas 3D"]'::jsonb,
  bot_trigger_words = '["QUERO", "CURA", "INFORMAÇÕES", "DETALHES", "PREÇO", "COMPRAR"]'::jsonb,
  features = '["3 comprimentos de onda independentes (365/385/405 nm)", "Tecnologia de reflexão espelhada interna", "Interface digital intuitiva", "Câmara de cura ampla", "Sistemas de ventilação integrados", "Timer programável", "Design compacto", "Eficiência energética"]'::jsonb
WHERE id = '5c9ccdb7-3ca1-40d8-afee-171ae2e0d569';