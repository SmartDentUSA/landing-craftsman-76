import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Save, Eye, Database, FileText, RotateCcw, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePromptsConfiguration } from '@/hooks/usePromptsConfiguration';

interface EdgeFunction {
  id: string;
  name: string;
  description: string;
  prompts: string[];
  dataSources: string[];
  status: string;
}

interface PromptEditModalProps {
  edgeFunction: EdgeFunction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Mapeamento de nomes amigáveis para campos
const FIELD_FRIENDLY_NAMES = {
  // === DADOS BÁSICOS ===
  "name": "Nome do Produto",
  "description": "Descrição",
  "price": "Preço",
  "category": "Categoria",
  "subcategory": "Subcategoria", 
  "currency": "Moeda",
  
  // === MARKETING E VENDAS ===
  "benefits": "Benefícios",
  "features": "Características",
  "keywords": "Palavras-chave",
  "target_audience": "Público-alvo",
  "sales_pitch": "Pitch de Vendas",
  "faq": "Perguntas Frequentes (FAQ)",
  
  // === URLs E IMAGENS ===
  "product_url": "URL do Produto",
  "image_url": "URL da Imagem",
  "url": "URL",
  
  // === ESPECIFICAÇÕES ===
  "technical_specifications": "Especificações Técnicas",
  
  // === VÍDEOS E MULTIMÍDIA ===
  "youtube_videos": "Vídeos YouTube",
  "instagram_videos": "Vídeos Instagram", 
  "technical_videos": "Vídeos Técnicos",
  "testimonial_videos": "Vídeos de Depoimentos",
  "tiktok_videos": "Vídeos TikTok",
  "video_captions": "Legendas de Vídeos",
  
  // === CONTEÚDO GERADO POR IA ===
  "whatsapp_messages": "Mensagens WhatsApp",
  "youtube_descriptions": "Descrições YouTube",
  "instagram_copies": "Copies Instagram",
  "tiktok_content": "Conteúdo TikTok",
  
  // === INTERAÇÃO E BOT ===
  "bot_trigger_words": "Palavras-gatilho do Bot",
  
  // === RECURSOS E CTAs ===
  "resource_descriptions": "Descrições de Recursos",
  "resource_cta1": "CTA Recurso 1",
  "resource_cta2": "CTA Recurso 2", 
  "resource_cta3": "CTA Recurso 3",
  "offer_discount_cta": "CTA de Desconto",
  
  // === GOOGLE MERCHANT E SEO ===
  "brand": "Marca",
  "google_product_category": "Categoria Google",
  "condition": "Condição",
  "availability": "Disponibilidade",
  "color": "Cor",
  "size": "Tamanho",
  "material": "Material",
  "age_group": "Faixa Etária",
  "gender": "Gênero",
  "gtin": "GTIN/EAN",
  "mpn": "Código do Fabricante",
  "seo_title_override": "Título SEO Personalizado",
  "seo_description_override": "Descrição SEO Personalizada",
  "canonical_url": "URL Canônica",
  
  // === CATEGORIZAÇÃO AVANÇADA ===
  "market_keywords": "Palavras-chave de Mercado",
  "search_intent_keywords": "Palavras-chave de Intenção",
  
  // === CONTROLES INTERNOS ===
  "tags": "Tags",
  "source_type": "Tipo de Origem",
  "source_landing_page_id": "ID da Landing Page",
  "approved": "Aprovado",
  "display_order": "Ordem de Exibição",
  "use_in_ai_generation": "Usar na Geração IA",
  "show_in_resources": "Mostrar em Recursos",
  "selected": "Selecionado",
  "ai_generated_category": "Categoria Gerada por IA",
  "ai_generated_keywords": "Keywords Geradas por IA",
  "ai_generated_benefits": "Benefícios Gerados por IA",
  "seo_enhanced": "SEO Aprimorado",
  "individual_blog_content": "Conteúdo de Blog Individual",
  "original_data": "Especificações técnicas",
  
  // === EMPRESA ===
  "company_name": "Nome da Empresa",
  "company_description": "Descrição da Empresa",
  "business_sector": "Setor de Negócio",
  "mission_statement": "Missão",
  "vision_statement": "Visão",
  "brand_values": "Valores da Marca",
  "differentiators": "Diferenciais",
  "seo_technical_expertise": "Expertise Técnica SEO",
  "working_methodology": "Metodologia de Trabalho",
  "seo_competitive_advantages": "Vantagens Competitivas SEO",
  "seo_market_positioning": "Posicionamento de Mercado",
  "youtube_company_footer": "Rodapé YouTube da Empresa",
  "contact_email": "Email de Contato",
  "contact_phone": "Telefone de Contato",
  "location": "Localização da Empresa",
  "website_url": "URL do Website",
  "founded_year": "Ano de Fundação",
  "team_size": "Tamanho da Equipe",
  "company_logo_url": "URL do Logo",
  "company_culture": "Cultura da Empresa",
  "delivery_approach": "Abordagem de Entrega",
  "seo_service_areas": "Áreas de Serviço SEO",
  "instagram_profile": "Perfil Instagram",
  "youtube_channel": "Canal YouTube",
  "social_media_links": "Links Redes Sociais",
  "institutional_links": "Links Institucionais",
  "company_videos": "Vídeos da Empresa",
  "seo_context_keywords": "Keywords de Contexto SEO",
  
  // === DEPOIMENTOS E AVALIAÇÕES ===
  "client_name": "Nome do Cliente",
  "profession": "Profissão",
  "testimonial_text": "Texto do Depoimento",
  "youtube_url": "URL YouTube",
  "instagram_url": "URL Instagram",
  "ai_keywords": "Palavras-chave IA",
  "sentiment_score": "Score de Sentimento",
  "ai_extracted_benefits": "Benefícios Extraídos por IA",
  "state": "Estado",
  "specialty": "Especialidade",
  "author_name": "Nome do Autor",
  "rating": "Avaliação",
  "review_text": "Texto da Avaliação",
  "contextual_seo_info": "Informação SEO Contextual",
  "notes": "Observações",
  "landing_page_id": "ID da Landing Page",
  "approved_at": "Aprovado em",
  "approved_by": "Aprovado por",
  
  // === KOLs (KEY OPINION LEADERS) ===
  "full_name": "Nome Completo",
  "mini_cv": "Mini CV",
  "photo_url": "URL da Foto",
  "lattes_url": "URL Lattes",
  
  // === AVALIAÇÕES BRUTAS (GOOGLE) ===
  "profile_photo_url": "URL Foto do Perfil",
  "author_url": "URL do Autor",
  "is_local_guide": "É Guia Local",
  "review_date": "Data da Avaliação",
  "relative_time": "Tempo Relativo",
  "review_likes": "Curtidas da Avaliação",
  "response_from_owner": "Resposta do Proprietário",
  "response_date": "Data da Resposta",
  
  // === JOBS DE EXTRAÇÃO ===
  "place_id": "ID do Local",
  "google_maps_url": "URL Google Maps",
  "business_name": "Nome do Negócio",
  "status": "Status",
  "total_reviews_found": "Total de Avaliações Encontradas",
  "reviews_extracted": "Avaliações Extraídas",
  "started_at": "Iniciado em",
  "completed_at": "Completado em",
  "error_message": "Mensagem de Erro",
  
  // === CAMPANHAS GOOGLE ADS ===
  "campaign_type": "Tipo de Campanha",
  "config": "Configuração",
  "last_exported": "Última Exportação",
  "product_id": "ID do Produto",
  
  // === BLOG POSTS ===
  "title": "Título",
  "content": "Conteúdo",
  "meta_description": "Meta Descrição",
  "published_at": "Publicado em",
  "published_domains": "Domínios Publicados",
  "youtube_video_url": "URL do Vídeo YouTube",
  "intelligent_links": "Links Inteligentes",
  "include_offers": "Incluir Ofertas",
  "author_kol_id": "ID do Autor KOL",
  "schema_json_ld": "Schema JSON-LD",
  
  // === LANDING PAGES ===
  "template": "Template",
  "data": "Dados",
  "selected_product_ids": "IDs dos Produtos Selecionados",
  "blog_generated": "Blog Gerado",
  "blog_generated_at": "Blog Gerado em",
  "embed": "Embed",
  "version": "Versão",
  "last_modified": "Última Modificação",
  "user_id": "ID do Usuário",
  
  // === CONFIGURAÇÕES DE PUBLICAÇÃO ===
  "wordpress_url": "URL WordPress",
  "wordpress_user": "Usuário WordPress",
  "wordpress_app_password_encrypted": "Senha App WordPress (Criptografada)",
  "ftp_host": "Host FTP",
  "ftp_port": "Porta FTP",
  "ftp_user": "Usuário FTP",
  "ftp_password_encrypted": "Senha FTP (Criptografada)",
  "ftp_remote_path": "Caminho Remoto FTP",
  "ftp_protocol": "Protocolo FTP",
  
  // === CONFIGURAÇÕES DE PROMPTS ===
  "edge_function_id": "ID da Função Edge",
  "prompt_name": "Nome do Prompt",
  "custom_prompt": "Prompt Personalizado",
  "selected_data_sources": "Fontes de Dados Selecionadas",
  "selected_fields": "Campos Selecionados",
  
  // === CAMPOS DE SISTEMA ===
  "id": "ID",
  "created_at": "Criado em",
  "updated_at": "Atualizado em",
  "extracted_at": "Extraído em"
};

// Mapeamento de fontes de dados disponíveis - EXPANSÃO COMPLETA
const DATA_SOURCES = {
  products_repository: {
    label: "Repositório de Produtos",
    fields: [
      // Campos básicos ✅ UTILIZADOS
      "name", "description", "price", "category", "subcategory", "currency",
      
      // Campos de marketing ✅ UTILIZADOS  
      "benefits", "features", "keywords", "target_audience", "sales_pitch", "faq",
      
      // URLs e dados comerciais ✅ UTILIZADOS
      "product_url", "image_url",
      
      // Especificações técnicas ✅ RECÉM INTEGRADA
      "technical_specifications",
      
      // Vídeos e conteúdo multimídia ✅ UTILIZADOS
      "youtube_videos", "instagram_videos", "technical_videos", "testimonial_videos", "tiktok_videos",
      
      // Conteúdo gerado por IA ✅ UTILIZADOS
      "whatsapp_messages", "youtube_descriptions", "instagram_copies", "tiktok_content",
      
      // Interação e bot ✅ UTILIZADOS
      "bot_trigger_words",
      
      // Legendas de vídeo ❌ NÃO UTILIZADO
      "video_captions",
      
      // Dados comerciais avançados ❌ NÃO UTILIZADO
      "resource_descriptions", "resource_cta1", "resource_cta2", "resource_cta3", "offer_discount_cta",
      
      // Google Merchant e SEO ❌ NÃO UTILIZADO
      "brand", "google_product_category", "condition", "availability", "color", "size", "material", "age_group", "gender",
      "gtin", "mpn", "seo_title_override", "seo_description_override", "canonical_url",
      
      // Categorização avançada ❌ NÃO UTILIZADO
      "market_keywords", "search_intent_keywords",
      
      // Outros campos ❌ NÃO UTILIZADO
      "tags", "source_type", "source_landing_page_id", "approved", "display_order", "use_in_ai_generation",
      "show_in_resources", "selected", "ai_generated_category", "ai_generated_keywords", "ai_generated_benefits",
      "seo_enhanced", "individual_blog_content", "original_data"
    ]
  },
  company_profile: {
    label: "Perfil da Empresa",
    fields: [
      // Dados básicos ✅ UTILIZADOS
      "company_name", "company_description", "business_sector", 
      
      // Missão e valores ✅ UTILIZADOS
      "mission_statement", "vision_statement", "brand_values", 
      
      // Diferenciais ✅ UTILIZADOS
      "differentiators", "seo_technical_expertise", "working_methodology", 
      
      // Público e posicionamento ✅ UTILIZADOS
      "target_audience", "seo_competitive_advantages", "seo_market_positioning",
      
      // Rodapé YouTube ✅ UTILIZADO
      "youtube_company_footer",
      
      // Dados de contato ❌ NÃO UTILIZADO
      "contact_email", "contact_phone", "location", "website_url",
      
      // Dados institucionais ❌ NÃO UTILIZADO
      "founded_year", "team_size", "company_logo_url", "company_culture", 
      "delivery_approach", "seo_service_areas",
      
      // Social media ❌ NÃO UTILIZADO
      "instagram_profile", "youtube_channel", "social_media_links",
      
      // Links institucionais ❌ NÃO UTILIZADO
      "institutional_links",
      
      // Vídeos da empresa ❌ NÃO UTILIZADO
      "company_videos",
      
      // Keywords SEO ❌ NÃO UTILIZADO
      "seo_context_keywords"
    ]
  },
  categories_config: {
    label: "Configuração de Categorias",
    fields: [
      // Campos básicos ✅ UTILIZADOS
      "category", "subcategory", 
      
      // Keywords básicas ✅ UTILIZADOS
      "keywords", "target_audience", 
      
      // Keywords avançadas ❌ NÃO UTILIZADO
      "search_intent_keywords", "market_keywords"
    ]
  },
  video_testimonials: {
    label: "Depoimentos em Vídeo",
    fields: [
      // Dados básicos ✅ UTILIZADOS
      "client_name", "profession", "testimonial_text", 
      
      // URLs ❌ NÃO UTILIZADO
      "youtube_url", "instagram_url", 
      
      // Dados gerados por IA ❌ NÃO UTILIZADO
      "ai_keywords", "sentiment_score", "ai_extracted_benefits",
      
      // Localização ❌ NÃO UTILIZADO
      "location", "state", "specialty"
    ]
  },
  approved_reviews: {
    label: "Avaliações Aprovadas",
    fields: [
      // Dados básicos ✅ UTILIZADOS
      "author_name", "rating", "review_text", 
      
      // SEO ❌ NÃO UTILIZADO  
      "contextual_seo_info", "ai_keywords", "notes"
    ]
  },
  key_opinion_leaders: {
    label: "Key Opinion Leaders (KOLs)",
    fields: [
      // Dados básicos ✅ UTILIZADOS
      "full_name", "specialty", "mini_cv", 
      
      // URLs ❌ NÃO UTILIZADO
      "photo_url", "website_url", "youtube_url", "instagram_url", "lattes_url"
    ]
  },
  external_links: {
    label: "Links Externos",
    fields: [
      // Dados básicos ❌ NÃO UTILIZADO
      "name", "url", "category", "subcategory", "description", "approved"
    ]
  },
  raw_reviews: {
    label: "Avaliações Brutas (Google)",
    fields: [
      // Dados do autor ❌ NÃO UTILIZADO
      "author_name", "profile_photo_url", "author_url", "is_local_guide",
      
      // Dados da avaliação ❌ NÃO UTILIZADO
      "rating", "review_text", "review_date", "relative_time", "review_likes",
      
      // Resposta do proprietário ❌ NÃO UTILIZADO
      "response_from_owner", "response_date"
    ]
  },
  manual_reviews: {
    label: "Avaliações Manuais",
    fields: [
      // Dados básicos ❌ NÃO UTILIZADO
      "author_name", "rating", "review_text", "approved"
    ]
  },
  extraction_jobs: {
    label: "Jobs de Extração",
    fields: [
      // Dados técnicos ❌ NÃO UTILIZADO
      "place_id", "google_maps_url", "business_name", "status", "total_reviews_found", "reviews_extracted"
    ]
  },
  google_ads_campaigns: {
    label: "Campanhas Google Ads",
    fields: [
      // Configurações ❌ NÃO UTILIZADO
      "campaign_type", "config", "last_exported"
    ]
  },
  blog_posts: {
    label: "Posts do Blog",
    fields: [
      // Conteúdo ❌ NÃO UTILIZADO
      "title", "content", "meta_description", "keywords", "status", "published_at"
    ]
  },
  landing_pages: {
    label: "Landing Pages",
    fields: [
      // Dados básicos ❌ NÃO UTILIZADO
      "name", "template", "data", "selected_product_ids", "status"
    ]
  },
  publication_settings: {
    label: "Configurações de Publicação",
    fields: [
      // WordPress ❌ NÃO UTILIZADO
      "wordpress_url", "wordpress_user", 
      
      // FTP ❌ NÃO UTILIZADO
      "ftp_host", "ftp_port", "ftp_user", "ftp_remote_path", "ftp_protocol"
    ]
  },
  prompts_configuration: {
    label: "Configurações de Prompts",
    fields: [
      // Configuração ❌ NÃO UTILIZADO
      "edge_function_id", "prompt_name", "custom_prompt", "selected_data_sources", "selected_fields"
    ]
  }
};

// Mapeamento de prompts reais das Edge Functions
const REAL_PROMPTS = {
  "generate-social-content": {
    "WhatsApp": `Você é um especialista em marketing digital e comunicação para WhatsApp.

Crie uma mensagem promocional otimizada para WhatsApp que seja envolvente e gere conversões.

Informações do Produto:
- Nome: {product.name}
- Resumo Comercial: {product.sales_pitch}
- Benefícios: {product.benefits}
- URL do Produto: {product.product_url}
- Categoria: {product.category}

Template da Mensagem:
🔥 [NOME DO PRODUTO] 🔥

[RESUMO COMERCIAL EM 1-2 FRASES IMPACTANTES]

✅ PRINCIPAIS BENEFÍCIOS:
[LISTE ATÉ 10 BENEFÍCIOS COM EMOJIS RELEVANTES]

💬 Responda com '{random_trigger_word}' para receber mais informações!

🛒 Saiba mais → [LINK DO PRODUTO]

#[EMPRESA] #[CATEGORIA]

Instruções:
1. Use emojis relevantes para cada benefício
2. Mantenha linguagem conversacional e persuasiva
3. Máximo 1000 caracteres (ideal para WhatsApp)
4. Inclua call-to-action claro
5. Use hashtags da empresa e categoria
6. Palavras Gatilho: Use palavras gatilho configuradas: {trigger_word_examples}
   - Se configuradas, inclua frases como: "💬 Responda com '{random_trigger_word}' que envio mais detalhes!"
7. Links Personalizados: {available_links}
   - Inclua links relevantes quando apropriado para enriquecer a mensagem
   - Use os links com moderação, apenas quando agregarem valor real

Retorne apenas o texto da mensagem formatada, sem explicações.`,

    "Instagram": `Você é um especialista em marketing digital no Instagram. Crie uma copy envolvente e otimizada para posts estáticos de feed do Instagram.

Informações do Produto:
- Nome: {product.name}
- Descrição: {product.description}
- Categoria: {product.category}
- Preço: {product.price}
- Keywords: {product.keywords}
- Público-alvo: {product.target_audience}
- Benefícios: {product.benefits}

Informações da Empresa:
- Nome: {company.company_name}
- Mention: @smartdentoficial

PALAVRAS GATILHO BOT: {product.bot_trigger_words}

INSTRUÇÕES ESPECÍFICAS PARA POST ESTÁTICO:
1. Copy Principal: Máximo 2200 caracteres, foque em storytelling envolvente
2. Início impactante: Hook que prenda a atenção nos primeiros segundos
3. Desenvolvimento: História que conecte emocionalmente com o público
4. Narrativa visual: Descreva como o produto se encaixa na vida do usuário
5. Copy para Stories: Versão resumida de até 160 caracteres
6. Call-to-action OBRIGATÓRIO: A última frase DEVE usar uma palavra gatilho BOT para incentivar comentários

TEMPLATES OBRIGATÓRIOS PARA A ÚLTIMA FRASE (escolha 1):
- "💬 Comenta '{random_trigger_word}' nos comentários que te mando mais detalhes!"
- "💬 Deixa '{random_trigger_word}' aqui em baixo que te envio as informações!"
- "💬 Escreve '{random_trigger_word}' nos comentários para saber mais!"

Se não houver palavras gatilho configuradas, use: "💬 Comenta 'QUERO' que te mando mais informações!"

CRÍTICO: Retorne APENAS um JSON válido, sem blocos de código markdown.
IMPORTANTE: As hashtags DEVEM estar sempre entre aspas. Exemplo CORRETO: ["#hashtag1", "#hashtag2"]

Formato JSON obrigatório:
{
  "feed_copy": "Copy principal para feed com storytelling envolvente (DEVE terminar com frase usando palavra gatilho) \\n\\nIncluir quebras de linha",
  "story_copy": "Versão resumida para Stories - máximo 160 caracteres",
  "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3"],
  "call_to_action": "Frase final de call-to-action com palavra gatilho",
  "post_type": "feed"
}`,

    "TikTok": `Você é um especialista em criação de conteúdo viral para TikTok e marketing digital.

Crie um script envolvente para TikTok que maximize o engajamento e viralização.

Informações do Produto:
- Nome: {product.name}
- Descrição: {product.description}
- Categoria: {product.category}
- Benefícios: {product.benefits}
- Keywords: {product.keywords}
- Público-alvo: {product.target_audience}

Informações da Empresa:
- Nome: {company.company_name}

INSTRUÇÕES ESPECÍFICAS PARA TIKTOK:
1. Hook dos primeiros 3 segundos: Extremamente impactante e curioso
2. Linguagem: Muito casual, use gírias e tendências atuais
3. Duração: Script para 15-60 segundos máximo
4. Formato dinâmico: Incluir indicações de cortes, transições
5. Trends: Incorporar elementos de trends virais quando apropriado
6. Hashtags: Foque em hashtags trending e de nicho
7. Call-to-action: Incentive seguidores, likes, shares e comentários

Estrutura do Script:
HOOK (0-3s): [Frase de impacto que para o scroll]
DESENVOLVIMENTO (3-45s): [Conteúdo principal com revelações graduais]
CTA FINAL (45-60s): [Call-to-action para engajamento]

Retorne um script detalhado com indicações de tempo e ações.`,

    "YouTube": `Você é um especialista em criação de conteúdo para YouTube e SEO de vídeos.

Gere uma descrição completa para vídeo do YouTube que otimize o alcance e engajamento.

Informações do Produto:
- Nome: {product.name}
- Descrição: {product.description}
- Categoria: {product.category}
- Benefícios: {product.benefits}

Informações da Empresa:
- Template de Rodapé: {company.youtube_company_footer}

CRÍTICO: Retorne APENAS um JSON válido, sem blocos de código markdown, sem texto adicional.
Use quebras de linha (\\n) que serão convertidas automaticamente para quebras reais na exibição.

Exemplo do formato JSON esperado:
{
  "title_suggestion": "Sugestão de título SEO otimizado",
  "description": "Descrição completa formatada incluindo o template de rodapé com quebras de linha usando \\n",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}

IMPORTANTE: Não use blocos de código markdown (\`\`\`json), retorne apenas o JSON puro.`
  },
  "generate-product-ai-content": {
    "Benefícios do Produto": `Você é um especialista em marketing de produtos e benefícios ao consumidor.

Analise o produto fornecido e gere uma lista de benefícios claros e convincentes que destaquem como este produto resolve problemas ou melhora a vida do cliente.

Informações do Produto:
- Nome: {product.name}
- Descrição: {product.description}
- Categoria: {product.category}
- Subcategoria: {product.subcategory}
- Preço: {product.price}
- Público-alvo: {product.target_audience}

Instruções específicas:
1. Foque em benefícios reais e tangíveis para o usuário
2. Use linguagem clara e persuasiva
3. Priorize benefícios únicos desta categoria de produto
4. Considere tanto benefícios funcionais quanto emocionais
5. Gere entre 5-8 benefícios distintos
6. Cada benefício deve ter entre 10-25 palavras

Retorne apenas um array JSON de strings com os benefícios, sem explicações adicionais.

Exemplo de formato:
["Benefício 1", "Benefício 2", "Benefício 3"]`,

    "Keywords do Produto": `Você é um especialista em SEO e marketing digital.

Analise o produto fornecido e gere uma lista de palavras-chave relevantes para SEO e marketing que ajudem o produto a ser encontrado pelo público-alvo correto.

Informações do Produto:
- Nome: {product.name}
- Descrição: {product.description}
- Categoria: {product.category}
- Subcategoria: {product.subcategory}
- Preço: {product.price}
- Público-alvo: {product.target_audience}

Instruções específicas:
1. Inclua keywords primárias (alto volume, média concorrência)
2. Inclua keywords de cauda longa (específicas, baixa concorrência)
3. Considere intenção de busca comercial e informacional
4. Priorize keywords relevantes para a categoria do produto
5. Gere entre 10-15 keywords
6. Misture termos técnicos e linguagem comum do consumidor

Retorne apenas um array JSON de strings com as keywords, sem explicações adicionais.

Exemplo de formato:
["keyword 1", "keyword 2", "keyword 3"]`,

    "Características do Produto": `Você é um especialista em especificações técnicas e características de produtos.

Analise o produto fornecido e gere uma lista de características técnicas e funcionais que destaquem as especificações importantes deste produto.

Informações do Produto:
- Nome: {product.name}
- Descrição: {product.description}
- Categoria: {product.category}
- Subcategoria: {product.subcategory}
- Preço: {product.price}

Instruções específicas:
1. Foque em características mensuráveis e verificáveis
2. Inclua especificações técnicas relevantes para a categoria
3. Considere aspectos de qualidade, durabilidade e performance
4. Use terminologia apropriada para o segmento do produto
5. Gere entre 6-10 características distintas
6. Cada característica deve ser concisa e informativa

Retorne apenas um array JSON de strings com as características, sem explicações adicionais.

Exemplo de formato:
["Característica 1", "Característica 2", "Característica 3"]`
  },

  "strategic-blog-generator": {
    "Artigo Estratégico Contextual": `Você é um consultor estratégico especializado em criação de conteúdo de alto valor que posiciona empresas como autoridades em suas áreas de atuação.

Sua missão é criar um artigo estratégico e contextualizado que demonstre a expertise da empresa na entrega de soluções, sem mencionar produtos específicos, utilizando EXCLUSIVAMENTE as informações fornecidas pelo sistema.

## CONTEXTO DISPONÍVEL:
{contextData}

## DIRETRIZES ESTRATÉGICAS OBRIGATÓRIAS:

### 1. FOCO EM SOLUÇÕES, NÃO EM PRODUTOS
- Fale sobre "abordagens", "metodologias", "soluções" e "resultados"
- Transforme características de produtos em "capacidades que oferecemos"
- Transforme benefícios de produtos em "resultados que entregamos"
- NUNCA mencione nomes específicos de produtos

### 2. PROIBIDO ALUCINAR INFORMAÇÕES
- Use APENAS dados fornecidos no contexto
- Se não houver informação sobre algo, NÃO invente
- Prefira dizer "nossa abordagem inclui" do que criar dados falsos
- Base tudo em evidências do contexto fornecido

### 3. INTEGRAÇÃO INTELIGENTE DOS DADOS
- Perfil da empresa → "Nossa metodologia exclusiva"
- Reviews/depoimentos → "Casos de sucesso comprovados"
- KOLs → "Reconhecimento de especialistas"
- Categorias/keywords → SEO natural no conteúdo
- Landing page → "Soluções que oferecemos"

### 4. ESTRUTURA ESTRATÉGICA OBRIGATÓRIA:
1. **Título SEO-otimizado** (50-60 caracteres, incluindo keyword principal)
2. **Introdução** (identifique problema/necessidade do mercado baseado no target_audience)
3. **Desenvolvimento** (3-4 seções sobre soluções/abordagens da empresa)
4. **Prova Social** (integre naturalmente reviews/depoimentos como casos)
5. **Metodologia** (use working_methodology e differentiators da empresa)
6. **Conclusão** (CTA estratégico para consultoria/conversa)

### 5. TOM E LINGUAGEM:
- Consultivo e educativo, nunca vendedor
- Autoridade técnica baseada nas informações fornecidas
- Foco em valor e resultados para o cliente
- Use as keywords naturalmente no texto

### 6. META DESCRIPTION:
Crie uma meta description de 150-160 caracteres que destaque o valor do artigo.

### 7. KEYWORDS:
Liste 5-8 keywords baseadas nas informações de categorias e target_audience fornecidas.

## FORMATO DE RESPOSTA:
Retorne um JSON com:
{
  "title": "Título do artigo",
  "content": "Conteúdo completo em HTML",
  "meta_description": "Meta description",
  "keywords": ["keyword1", "keyword2", ...]
}

## EXEMPLO DE ABORDAGEM:
Em vez de: "Nosso produto X tem 5 benefícios"
Use: "Nossa metodologia entrega resultados comprovados em 5 áreas principais"

Em vez de: "O produto Y custa R$ 500"
Use: "Oferecemos soluções acessíveis com excelente custo-benefício"

LEMBRE-SE: Você é um consultor estratégico criando conteúdo de autoridade, não um vendedor de produtos.`
  },
  
  "generate-product-blog": {
    "Blog Comercial": `Você é um redator especializado em marketing de conteúdo e vendas.

Crie um blog post comercial persuasivo que apresente o produto de forma atrativa, destacando seus benefícios e incentivando a compra.

DADOS DO PRODUTO:
{productData}

DADOS DA EMPRESA:
{companyData}

ESTRUTURA OBRIGATÓRIA:
1. **Título cativante** (50-60 caracteres)
2. **Introdução envolvente** (parágrafo que desperta interesse)
3. **Problema/Necessidade** (identifica dor do cliente)
4. **Apresentação da Solução** (como o produto resolve)
5. **Benefícios Principais** (3-5 benefícios com explicação)
6. **Diferenciais Competitivos** (por que escolher este produto)
7. **Prova Social** (credibilidade da empresa)
8. **Call-to-Action** (convite claro para ação)

DIRETRIZES:
- Tom persuasivo mas não agressivo
- Foque em benefícios, não apenas características
- Use linguagem acessível ao público-alvo
- Inclua elementos de urgência sutil
- Tamanho: 800-1200 palavras
- SEO-friendly com keywords naturais

Retorne apenas o conteúdo do blog em markdown, sem explicações adicionais.`,

    "Blog Técnico": `Você é um redator técnico especializado em conteúdo educativo e informativo.

Crie um blog post técnico detalhado que eduque o leitor sobre aspectos técnicos, funcionamento e aplicações do produto.

DADOS DO PRODUTO:
{productData}

DADOS DA EMPRESA:
{companyData}

ESTRUTURA OBRIGATÓRIA:
1. **Título informativo** (foco em educação)
2. **Introdução técnica** (contexto e relevância)
3. **Explicação do Funcionamento** (como funciona tecnicamente)
4. **Características Técnicas** (especificações detalhadas)
5. **Aplicações e Casos de Uso** (onde e como usar)
6. **Vantagens Técnicas** (superioridade técnica)
7. **Considerações de Implementação** (aspectos práticos)
8. **Conclusão Técnica** (resumo dos pontos principais)

DIRETRIZES:
- Tom educativo e autoritativo
- Foque em especificações e performance
- Use terminologia técnica apropriada
- Inclua dados e números quando possível
- Tamanho: 1000-1500 palavras
- Estrutura clara com subtítulos

Retorne apenas o conteúdo do blog em markdown, sem explicações adicionais.`
  },

  "ai-seo-generator": {
    "Meta Description": `Crie uma meta description otimizada para SEO com base no conteúdo fornecido.

Requisitos:
- Entre 140-160 caracteres
- Inclua a palavra-chave principal naturalmente
- Seja persuasiva e clara
- Desperte curiosidade
- Inclua call-to-action sutil quando relevante

Conteúdo: {content}
Palavra-chave principal: {primaryKeyword}

Retorne apenas a meta description, sem explicações.`,

    "Título SEO": `Crie um título SEO otimizado com base no conteúdo fornecido.

Requisitos:
- Entre 50-60 caracteres
- Inclua a palavra-chave principal no início
- Seja claro e atrativo
- Reflita o conteúdo principal
- Desperte interesse do usuário

Conteúdo: {content}
Palavra-chave principal: {primaryKeyword}

Retorne apenas o título, sem explicações.`,

    "Keywords": `Gere uma lista de palavras-chave SEO relevantes com base no conteúdo fornecido.

Inclua:
- Keywords primárias (alto volume)
- Keywords de cauda longa
- Variações e sinônimos
- Keywords de intenção comercial
- Keywords relacionadas ao tópico

Conteúdo: {content}

Retorne um array JSON com as keywords, sem explicações.`,

    "Conteúdo Oculto": `Gere conteúdo SEO adicional que pode ser usado como texto alternativo, legendas ou conteúdo expandido.

Requisitos:
- Relacionado ao tema principal
- Rico em palavras-chave relevantes
- Útil para contexto SEO
- Natural e bem escrito
- Entre 100-200 palavras

Conteúdo base: {content}

Retorne apenas o conteúdo adicional, sem explicações.`,

    "Conteúdo de Blog": `Crie um artigo de blog completo e otimizado para SEO com base no tópico fornecido.

Estrutura:
1. Título atrativo (H1)
2. Introdução envolvente
3. Desenvolvimento com subtítulos (H2, H3)
4. Conclusão persuasiva
5. Call-to-action

Requisitos:
- Entre 800-1200 palavras
- Uso natural de keywords
- Linguagem clara e envolvente
- Estrutura SEO-friendly
- Valor educativo real

Tópico: {topic}
Keywords: {keywords}

Retorne o artigo completo em markdown.`,

    "Análise de Depoimento": `Analise o depoimento em vídeo fornecido e extraia insights estruturados.

Retorne um JSON com:
- keywords: array de palavras-chave mencionadas
- sentiment: score de 1-10 (1=muito negativo, 10=muito positivo)  
- summary: resumo de 2-3 frases dos pontos principais
- emotions: array de emoções detectadas
- topics: array de tópicos abordados

Conteúdo do depoimento: {content}

Retorne apenas o JSON, sem explicações.`,

    "Keywords FAQ": `Gere perguntas frequentes (FAQ) baseadas nas palavras-chave fornecidas.

Para cada keyword, crie:
- Pergunta natural que usuários fariam
- Resposta completa e útil
- Foco em intenção de busca

Formato de retorno:
\`\`\`json
[
  {
    "question": "Pergunta?",
    "answer": "Resposta completa..."
  }
]
\`\`\`

Keywords: {keywords}

Retorne apenas o JSON com as FAQs.`
  },

  "generate-instagram-copy": {
    "Copy Feed (post estático)": `Você é um especialista em marketing digital no Instagram. Crie uma copy envolvente e otimizada para posts estáticos de feed do Instagram.

Informações do Produto:
- Nome: {product.name}
- Descrição: {product.description}
- Categoria: {product.category}
- Preço: {product.price}
- Keywords: {product.keywords}
- Público-alvo: {product.target_audience}
- Benefícios: {product.benefits}

Informações da Empresa:
- Nome: {company.company_name}
- Mention: @smartdentoficial

INSTRUÇÕES ESPECÍFICAS PARA POST ESTÁTICO:
1. Copy Principal: Máximo 2200 caracteres, foque em storytelling envolvente
2. Início impactante: Hook que prenda a atenção nos primeiros segundos
3. Desenvolvimento: História que conecte emocionalmente com o público
4. Narrativa visual: Descreva como o produto se encaixa na vida do usuário
5. Copy para Stories: Versão resumida de até 160 caracteres
6. Hashtags: Entre 20-30 hashtags relevantes e estratégicas
7. Call-to-Action: CTAs específicos ("Link na bio", "Salve este post", "Comenta aqui")
8. Emojis: Usar estrategicamente para aumentar engajamento
9. Mention: Incluir @smartdentoficial quando apropriado

ESTRUTURA SUGERIDA:
- Hook inicial (1-2 frases impactantes)
- História/problema relatable 
- Como o produto resolve o problema
- Benefícios com storytelling
- Call-to-action claro

CRÍTICO: Retorne APENAS um JSON válido, sem blocos de código markdown.

{
  "feed_copy": "Copy principal para feed com storytelling envolvente \\n\\nIncluir quebras de linha com \\n",
  "story_copy": "Versão resumida para Stories - máximo 160 caracteres",
  "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3"],
  "call_to_action": "Link na bio para saber mais! 👆",
  "post_type": "feed"
}`,

    "Copy Vídeo Reels": `Você é um especialista em marketing digital no Instagram especializado em conteúdo para Reels. Crie uma copy otimizada para vídeos Reels.

Informações do Produto:
- Nome: {product.name}
- Descrição: {product.description}
- Categoria: {product.category}
- Preço: {product.price}
- Keywords: {product.keywords}
- Público-alvo: {product.target_audience}
- Benefícios: {product.benefits}

Informações da Empresa:
- Nome: {company.company_name}
- Mention: @smartdentoficial

INSTRUÇÕES ESPECÍFICAS PARA REELS:
1. Copy Principal: Máximo 2200 caracteres, mas mais dinâmica e energética
2. Hook inicial: Muito impactante, cause curiosidade nos primeiros 3 segundos
3. Linguagem: Mais casual, use gírias quando apropriado ao público
4. Timing: Pense na sincronização com as cenas do vídeo
5. Interação: Incentive likes, shares, comentários e saves
6. Copy para Stories: Versão para republicar nos Stories
7. Hashtags: Foque em hashtags de Reels e tendências
8. Call-to-Action: CTAs específicos para vídeo ("Assista até o final", "Duplo toque se concorda")
9. Trends: Considere trends atuais do Instagram
10. Mention: Incluir @smartdentoficial estrategicamente

ESTRUTURA SUGERIDA:
- Hook ultra-impactante (pergunta, afirmação polêmica, número surpreendente)
- Desenvolvimento rápido e dinâmico
- Pontos-chave com timing para o vídeo
- CTA para engajamento máximo

CRÍTICO: Retorne APENAS um JSON válido, sem blocos de código markdown.

{
  "feed_copy": "Copy dinâmica para Reels com hooks impactantes \\n\\nLinguagem energética e casual",
  "story_copy": "Versão para Stories - máximo 160 caracteres",
  "hashtags": ["#reels", "#viral", "#trending", "#produto"],
  "call_to_action": "Assista até o final! Duplo toque se concorda 🔥",
  "post_type": "reels"
}`,

    "Copy Carrossel": `Você é um especialista em marketing digital no Instagram especializado em posts em carrossel. Crie uma copy estratégica para carrossel com múltiplas imagens.

Informações do Produto:
- Nome: {product.name}
- Descrição: {product.description}
- Categoria: {product.category}
- Preço: {product.price}
- Keywords: {product.keywords}
- Público-alvo: {product.target_audience}
- Benefícios: {product.benefits}

Informações da Empresa:
- Nome: {company.company_name}
- Mention: @smartdentoficial

INSTRUÇÕES ESPECÍFICAS PARA CARROSSEL:
1. Copy Principal: Máximo 2200 caracteres, estruturada para múltiplas imagens
2. Narrativa sequencial: Conte uma história que se desenvolve através dos slides
3. Ganchos para deslizar: Crie curiosidade para o próximo slide
4. Numeração: Use "1/5", "Slide 2:", etc. quando apropriado
5. Informação progressiva: Cada slide adiciona valor ao anterior
6. Copy para Stories: Versão que destaque o aspecto educativo/informativo
7. Hashtags: Foque em hashtags educativas e de nicho
8. Call-to-Action: CTAs que incentivem deslizar e salvar
9. Valor educativo: Carrosseis são ideais para educar
10. Mention: Incluir @smartdentoficial no contexto educativo

ESTRUTURA SUGERIDA:
- Introdução que promete informação valiosa
- Desenvolvimento por slides (ex: "No slide 2, você vai descobrir...")
- Conclusão que amarre todo o conteúdo
- CTA para salvar e compartilhar

CRÍTICO: Retorne APENAS um JSON válido, sem blocos de código markdown.

{
  "feed_copy": "Copy educativa para carrossel com narrativa sequencial \\n\\nSlide 1: Introdução \\nSlide 2: Desenvolvimento...",
  "story_copy": "Versão para Stories destacando valor educativo",
  "hashtags": ["#carrossel", "#educativo", "#dicas", "#aprenda"],
  "call_to_action": "Salve este post para não esquecer! Deslize para ver tudo →",
  "post_type": "carousel"
}`,
  },

  "generate-whatsapp-messages": {
    "Mensagem Promocional WhatsApp": `Você é um especialista em marketing digital e comunicação para WhatsApp.

Crie uma mensagem promocional otimizada para WhatsApp que seja envolvente e gere conversões.

Informações do Produto:
- Nome: {product.name}
- Resumo Comercial: {product.sales_pitch}
- Benefícios: {product.benefits}
- URL do Produto: {product.product_url}
- Categoria: {product.category}

Informações da Empresa:
- Nome: {company.company_name}

Template da Mensagem:
🔥 [NOME DO PRODUTO] 🔥

[RESUMO COMERCIAL EM 1-2 FRASES IMPACTANTES]

✅ PRINCIPAIS BENEFÍCIOS:
[LISTE ATÉ 10 BENEFÍCIOS COM EMOJIS RELEVANTES]

🛒 Saiba mais → [LINK DO PRODUTO]

#[EMPRESA] #[CATEGORIA]

Instruções:
1. Use emojis relevantes para cada benefício
2. Mantenha linguagem conversacional e persuasiva
3. Máximo 1000 caracteres (ideal para WhatsApp)
4. Inclua call-to-action claro
5. Use hashtags da empresa e categoria
6. Foque nos benefícios mais atrativos
7. Tom entusiasmado mas profissional

Retorne apenas o texto da mensagem formatada, sem explicações.`
  },

  "generate-youtube-descriptions": {
    "Descrição Completa YouTube": `Você é um especialista em criação de conteúdo para YouTube e SEO de vídeos.

Gere uma descrição completa para vídeo do YouTube que otimize o alcance e engajamento.

Informações do Produto:
- Nome: {product.name}
- Descrição: {product.description}
- Categoria: {product.category}
- Benefícios: {product.benefits}

Informações da Empresa:
- Nome: {company.company_name}
- Template de Rodapé: {company.youtube_company_footer}

Template da Descrição:
[NOME DO PRODUTO]

[DESCRIÇÃO DETALHADA DO PRODUTO/VÍDEO - 2-3 PARÁGRAFOS ENVOLVENTES]

[SEÇÃO DE BENEFÍCIOS PRINCIPAIS]

[TEMPLATE DE RODAPÉ DA EMPRESA]

Instruções:
1. Primeira linha: Nome do produto (otimizado para SEO)
2. Descrição: 2-3 parágrafos envolventes sobre o produto
3. Benefícios: Lista dos principais benefícios
4. Rodapé: Use o template da empresa fornecido
5. Total máximo: 5000 caracteres
6. Tom profissional mas acessível
7. Inclua call-to-action para engagement

Retorne no formato JSON:
{
  "title_suggestion": "Sugestão de título SEO otimizado",
  "description": "Descrição completa formatada",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}`
  },

  "generate-ad-copies": {
    "Cópias Google Ads": `Você é um especialista em Google Ads e copywriting persuasivo.

Crie cópias de anúncios Google Ads otimizadas com base nas informações de SEO fornecidas.

INFORMAÇÕES FORNECIDAS:
- Título SEO: {seoTitle}
- Meta Description: {seoDescription}  
- Palavra-chave principal: {primaryKeyword}
- Público-alvo: {targetAudience}

INSTRUÇÕES CRÍTICAS:
1. **PRIORIZAÇÃO POR CATEGORIA**: Use a palavra-chave principal como base, mas SEMPRE priorize termos específicos da categoria/produto quando eles forem mais relevantes para o anúncio.

2. **HEADLINES (3-5 unidades)**:
   - Máximo 30 caracteres cada
   - Inclua palavra-chave ou termo da categoria
   - Seja direto e persuasivo
   - Foque em benefícios principais

3. **DESCRIPTIONS (2-3 unidades)**:
   - Máximo 90 caracteres cada  
   - Expanda os benefícios
   - Inclua call-to-action
   - Destaque diferenciais

4. **PATHS (2 unidades)**:
   - Máximo 15 caracteres cada
   - Use termos relacionados ao produto/categoria
   - Seja descritivo

IMPORTANTE: Se a categoria do produto (ex: "equipamento odontológico") for mais específica e relevante que a palavra-chave genérica, priorize termos da categoria nos anúncios.

Retorne no formato JSON:
{
  "headlines": ["headline1", "headline2", "headline3"],
  "descriptions": ["desc1", "desc2"],  
  "paths": ["path1", "path2"]
}`
  },

  "generate-tiktok-content": {
    "Script TikTok": `Você é um especialista em criação de conteúdo viral para TikTok. Crie um script completo e estratégico para um vídeo TikTok que gere engajamento máximo.

Informações do Produto:
- Nome: {product.name}
- Descrição: {product.description}
- Categoria: {product.category}
- Preço: {product.price}
- Keywords: {product.keywords}
- Público-alvo: {product.target_audience}
- Benefícios: {product.benefits}
- Características: {product.features}

Informações da Empresa:
- Nome: {company.company_name}
- Valores da marca: {company.brand_values}

PALAVRAS GATILHO BOT: {product.bot_trigger_words}

INSTRUÇÕES ESPECÍFICAS PARA TIKTOK:

1. HOOK (3 primeiros segundos): CRÍTICO para capturar atenção
   - Deve ser extremamente impactante e visual
   - Use padrões virais: "POV:", "Quando você...", "Ninguém te conta que..."
   - Crie curiosidade imediata
   - Máximo 15 palavras

2. SCRIPT DO VÍDEO (15-60 segundos):
   - Linguagem casual e autêntica da geração Z/Millennial
   - Timing perfeito para cada cena
   - Use trends atuais quando possível
   - Inclua momentos de pausa para impact
   - Máximo 150 palavras para facilitar memorização

3. CALL-TO-ACTION FINAL:
   - OBRIGATÓRIO: Deve usar uma palavra gatilho do bot se disponível
   - Incentive comentários, shares e saves
   - Crie senso de urgência ou FOMO

TEMPLATES OBRIGATÓRIOS PARA CTA (escolha 1):
- "💬 Comenta '{random_trigger_word}' que te mando o link!"
- "💬 Salva o vídeo + comenta '{random_trigger_word}' para mais info!"
- "💬 Marca 3 amigos + comenta '{random_trigger_word}' nos comentários!"

Se não houver palavras gatilho configuradas, use: "💬 Comenta 'QUERO' que te mando mais informações!"

4. ELEMENTOS VIRAIS A INCLUIR:
   - Transições rápidas
   - Música/som trending
   - Texto na tela em momentos-chave
   - Gestos expressivos
   - Revelações ou plot twists

CRÍTICO: Retorne APENAS um JSON válido, sem blocos de código markdown.

Formato JSON obrigatório:
{
  "hook": "Hook viral de 3 segundos (máximo 15 palavras)",
  "video_script": "Script completo do vídeo com timing perfeito \\n\\nIncluir quebras de linha para diferentes cenas",
  "call_to_action": "CTA final OBRIGATORIAMENTE usando palavra gatilho",
  "hashtags": ["#viral", "#fyp", "#trending", "#categoria"],
  "trending_references": ["trend1", "trend2", "trend3"],
  "estimated_duration": "30-45 segundos"
}`
  },

  "extract-youtube-captions": {
    "Análise de Vídeos": `Analise o conteúdo das legendas do vídeo e extraia insights estruturados.

Tipo de vídeo: {videoType}
Conteúdo das legendas: {captions}

Com base no tipo de vídeo, forneça uma análise direcionada:

Para vídeos PROMOCIONAIS:
- Extraia palavras-chave de marketing mencionadas
- Identifique benefícios e características destacadas
- Analise o tom promocional (1-10)

Para vídeos TÉCNICOS:
- Extraia termos técnicos e especificações
- Identifique processos ou metodologias mencionadas
- Analise o nível de complexidade técnica (1-10)

Para DEPOIMENTOS:
- Extraia experiências e resultados mencionados
- Identifique emoções e satisfação expressas
- Analise credibilidade e autenticidade (1-10)

Para vídeos INSTITUCIONAIS:
- Extraia valores e missão da empresa mencionados
- Identifique diferenciais competitivos destacados
- Analise profissionalismo e confiança (1-10)

Retorne um JSON estruturado:
{
  "keywords": ["palavra1", "palavra2"],
  "sentiment": numero_de_1_a_10,
  "summary": "Resumo em 2-3 frases dos pontos principais",
  "specific_insights": {
    // Insights específicos baseados no tipo de vídeo
  }
}

Retorne apenas o JSON, sem explicações adicionais.`
  }
};

export const PromptEditModal: React.FC<PromptEditModalProps> = ({
  edgeFunction,
  open,
  onOpenChange
}) => {
  const [selectedFields, setSelectedFields] = useState<Record<string, string[]>>({});
  const [customPrompts, setCustomPrompts] = useState<Record<string, string>>({});
  const [previewPrompt, setPreviewPrompt] = useState('');
  const [tokenCount, setTokenCount] = useState(0);
  const [isInitializing, setIsInitializing] = useState(false);
  const [useIntelligentLinks, setUseIntelligentLinks] = useState(true);
  const { toast } = useToast();
  const { saveConfiguration, getConfigurationByFunction, loading } = usePromptsConfiguration();

  useEffect(() => {
    if (edgeFunction && open && !loading && !isInitializing) {
      setIsInitializing(true);
      console.log('🔄 Carregando configurações para:', edgeFunction.id);
      
      try {
        // Carregar configurações salvas
        const savedConfig = getConfigurationByFunction(edgeFunction.id, edgeFunction.prompts[0]);
        
        if (savedConfig) {
          console.log('✅ Configuração salva encontrada:', savedConfig);
          
          // Carregar campos selecionados da configuração
          setSelectedFields(savedConfig.selected_fields || {});
          
          // Carregar configuração de links inteligentes (apenas para generate-product-blog)
          if (edgeFunction.id === 'generate-product-blog') {
            setUseIntelligentLinks(savedConfig.use_intelligent_links !== undefined ? savedConfig.use_intelligent_links : true);
          }
          
          // Carregar prompts customizados (buscar todas as configurações dessa função)
          const savedPrompts: Record<string, string> = {};
          edgeFunction.prompts.forEach(promptName => {
            const promptConfig = getConfigurationByFunction(edgeFunction.id, promptName);
            
            // Verificar se existe um prompt salvo e se não é um placeholder genérico
            const isPlaceholder = promptConfig?.custom_prompt && 
              promptConfig.custom_prompt.includes(`Prompt personalizado para ${promptName}`);
            
            if (promptConfig?.custom_prompt && !isPlaceholder) {
              // Usar o prompt salvo válido
              savedPrompts[promptName] = promptConfig.custom_prompt;
            } else {
              // Usar REAL_PROMPTS quando não há prompt salvo ou é placeholder
              const realPrompt = REAL_PROMPTS[edgeFunction.id as keyof typeof REAL_PROMPTS]?.[promptName];
              savedPrompts[promptName] = realPrompt || `Prompt personalizado para ${promptName}...`;
              
              // Se encontrou um REAL_PROMPT válido, salvar automaticamente no banco
              if (realPrompt && promptConfig && isPlaceholder) {
                console.log(`🔄 Atualizando placeholder para ${promptName} com REAL_PROMPT`);
                saveConfiguration(
                  edgeFunction.id,
                  promptName,
                  realPrompt,
                  Object.keys(savedConfig.selected_fields || {}),
                  savedConfig.selected_fields || {},
                  savedConfig.use_intelligent_links
                ).catch(console.error);
              }
            }
          });
          setCustomPrompts(savedPrompts);
          
        } else {
          console.log('ℹ️ Nenhuma configuração salva, usando defaults');
          
          // Para novas funções, inicializar com configuração padrão baseada no uso atual
          const defaultFields: Record<string, string[]> = {};
          
          // Configurações padrão baseadas na função - CAMPOS ATUALMENTE UTILIZADOS
          if (edgeFunction.id === 'generate-product-ai-content') {
            defaultFields['products_repository'] = ['name', 'description', 'category', 'subcategory', 'price', 'target_audience'];
          } else if (edgeFunction.id === 'strategic-blog-generator') {
            defaultFields['products_repository'] = ['name', 'description', 'benefits', 'features', 'keywords'];
            defaultFields['company_profile'] = ['company_name', 'working_methodology', 'differentiators'];
            defaultFields['categories_config'] = ['keywords', 'target_audience'];
          } else if (edgeFunction.id === 'generate-social-content') {
            defaultFields['products_repository'] = ['name', 'description', 'benefits'];
            defaultFields['company_profile'] = ['company_name', 'target_audience'];
          } else if (edgeFunction.id === 'ai-seo-generator') {
            defaultFields['products_repository'] = ['name', 'description', 'keywords'];
          } else if (edgeFunction.id === 'generate-instagram-copy') {
            defaultFields['products_repository'] = ['name', 'description', 'category', 'price', 'keywords', 'target_audience', 'benefits'];
            defaultFields['company_profile'] = ['company_name'];
          } else if (edgeFunction.id === 'generate-whatsapp-messages') {
            defaultFields['products_repository'] = ['name', 'sales_pitch', 'benefits', 'product_url', 'category'];
            defaultFields['company_profile'] = ['company_name'];
          } else if (edgeFunction.id === 'generate-youtube-descriptions') {
            defaultFields['products_repository'] = ['name', 'description', 'category', 'benefits'];
            defaultFields['company_profile'] = ['company_name', 'youtube_company_footer'];
          } else if (edgeFunction.id === 'generate-ad-copies') {
            defaultFields['products_repository'] = ['name', 'description', 'keywords'];
          } else if (edgeFunction.id === 'generate-tiktok-content') {
            defaultFields['products_repository'] = ['name', 'description', 'category', 'price', 'keywords', 'target_audience', 'benefits', 'features', 'bot_trigger_words'];
            defaultFields['company_profile'] = ['company_name', 'brand_values'];
          } else if (edgeFunction.id === 'extract-youtube-captions') {
            defaultFields['video_testimonials'] = ['testimonial_text'];
          }
          
          setSelectedFields(defaultFields);
          
          // Inicializar prompts com prompts reais das Edge Functions
          const initialPrompts: Record<string, string> = {};
          edgeFunction.prompts.forEach(prompt => {
            const realPrompt = REAL_PROMPTS[edgeFunction.id as keyof typeof REAL_PROMPTS]?.[prompt];
            initialPrompts[prompt] = realPrompt || `Prompt personalizado para ${prompt}...`;
          });
          setCustomPrompts(initialPrompts);
        }
      } catch (error) {
        console.error('Erro ao inicializar modal:', error);
      } finally {
        setIsInitializing(false);
      }
    }
  }, [edgeFunction, open, loading, getConfigurationByFunction, isInitializing]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSelectedFields({});
      setCustomPrompts({});
      setPreviewPrompt('');
      setTokenCount(0);
      setIsInitializing(false);
    }
  }, [open]);

  const handleFieldToggle = (dataSource: string, field: string) => {
    setSelectedFields(prev => ({
      ...prev,
      [dataSource]: prev[dataSource]?.includes(field)
        ? prev[dataSource].filter(f => f !== field)
        : [...(prev[dataSource] || []), field]
    }));
  };

  const generatePreview = () => {
    if (!edgeFunction) return;
    
    let preview = `=== PREVIEW DO PROMPT ===\n\n`;
    preview += `Função: ${edgeFunction.name}\n\n`;
    
    Object.entries(selectedFields).forEach(([source, fields]) => {
      if (fields.length > 0) {
        preview += `${DATA_SOURCES[source as keyof typeof DATA_SOURCES]?.label}:\n`;
        fields.forEach(field => {
          preview += `- ${field}: [valor_do_campo]\n`;
        });
        preview += '\n';
      }
    });

    edgeFunction.prompts.forEach(prompt => {
      if (customPrompts[prompt]) {
        preview += `Prompt ${prompt}:\n${customPrompts[prompt]}\n\n`;
      }
    });

    setPreviewPrompt(preview);
    setTokenCount(Math.floor(preview.length / 4)); // Estimativa simples
  };

  const handleSave = async () => {
    if (!edgeFunction) return;
    
    // Validar se há pelo menos um campo selecionado
    const hasFields = Object.values(selectedFields).some(fields => fields.length > 0);
    if (!hasFields) {
      toast({
        title: "Erro de validação",
        description: "Selecione pelo menos um campo de dados antes de salvar",
        variant: "destructive"
      });
      return;
    }
    
    try {
      console.log('💾 Salvando configurações:', {
        edgeFunctionId: edgeFunction.id,
        selectedFields,
        promptCount: Object.keys(customPrompts).length
      });
      
      // Preparar selectedDataSources a partir dos selectedFields
      const selectedDataSources = Object.keys(selectedFields).filter(key => 
        selectedFields[key] && selectedFields[key].length > 0
      );
      
      // Salvar configurações para cada prompt customizado
      for (const [promptName, customPrompt] of Object.entries(customPrompts)) {
        if (customPrompt.trim()) {
          await saveConfiguration(
            edgeFunction.id,
            promptName,
            customPrompt,
            selectedDataSources,
            selectedFields,
            edgeFunction.id === 'generate-product-blog' ? useIntelligentLinks : undefined
          );
        }
      }
      
      toast({
        title: "Configurações salvas",
        description: `${Object.keys(customPrompts).length} prompt(s) e ${selectedDataSources.length} fonte(s) de dados configuradas`,
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
    }
  };

  const handleReset = () => {
    if (edgeFunction) {
      // Verificar se há configuração salva
      const savedConfig = getConfigurationByFunction(edgeFunction.id, edgeFunction.prompts[0]);
      
      if (savedConfig) {
        // Restaurar para configuração salva
        setSelectedFields(savedConfig.selected_fields || {});
        
        const savedPrompts: Record<string, string> = {};
        edgeFunction.prompts.forEach(promptName => {
          const promptConfig = getConfigurationByFunction(edgeFunction.id, promptName);
          savedPrompts[promptName] = promptConfig?.custom_prompt || REAL_PROMPTS[edgeFunction.id as keyof typeof REAL_PROMPTS]?.[promptName] || '';
        });
        setCustomPrompts(savedPrompts);
        
        toast({
          title: "Configuração restaurada",
          description: "Campos e prompts foram restaurados para a configuração salva",
        });
      } else {
        // Limpar seleção se não houver configuração salva
        setSelectedFields({});
        
        toast({
          title: "Seleção limpa",
          description: "Todos os campos foram desmarcados",
        });
      }
    }
  };

  if (!edgeFunction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Editar Prompts - {edgeFunction.name}
          </DialogTitle>
          <DialogDescription>
            Configure os dados utilizados e personalize os prompts para esta função IA
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="data-sources" className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="data-sources" className="flex items-center gap-1">
              <Database className="h-4 w-4" />
              Fontes de Dados
            </TabsTrigger>
            <TabsTrigger value="prompts" className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              Prompts
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="data-sources" className="flex-1 overflow-hidden">
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Selecione quais campos de dados serão utilizados na geração de conteúdo para esta função.
                  </AlertDescription>
                </Alert>

                <div className="grid gap-4">
                  {edgeFunction.dataSources.map(source => {
                    const sourceData = DATA_SOURCES[source as keyof typeof DATA_SOURCES];
                    if (!sourceData) return null;

                    return (
                      <Card key={source}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">{sourceData.label}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {sourceData.fields.map(field => (
                              <div key={field} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`${source}-${field}`}
                                  checked={selectedFields[source]?.includes(field) || false}
                                  onCheckedChange={() => handleFieldToggle(source, field)}
                                />
                                 <Label 
                                   htmlFor={`${source}-${field}`} 
                                   className="text-sm font-normal cursor-pointer"
                                   title={`Campo técnico: ${field}`}
                                 >
                                   {FIELD_FRIENDLY_NAMES[field] || field}
                                 </Label>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="prompts" className="flex-1 overflow-hidden">
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Personalize os prompts utilizados por esta função IA. Use variáveis como {'{dados_produto}'} para inserir dados dinâmicos.
                  </AlertDescription>
                </Alert>

                {edgeFunction.id === 'generate-product-blog' && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">🔗 Configurações de Links Inteligentes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="use-intelligent-links"
                          checked={useIntelligentLinks}
                          onCheckedChange={(checked) => setUseIntelligentLinks(checked as boolean)}
                        />
                        <Label htmlFor="use-intelligent-links" className="text-sm font-normal cursor-pointer">
                          Usar Links Inteligentes por Padrão
                        </Label>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Quando habilitado, os blogs gerados incluirão automaticamente links inteligentes para produtos e páginas relacionadas.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {edgeFunction.prompts.map(prompt => (
                  <Card key={prompt}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base capitalize">{prompt.replace('_', ' ')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        placeholder={`Digite o prompt personalizado para ${prompt}...`}
                        value={customPrompts[prompt] || ''}
                        onChange={(e) => setCustomPrompts(prev => ({
                          ...prev,
                          [prompt]: e.target.value
                        }))}
                        className="min-h-[120px] resize-none"
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="preview" className="flex-1 overflow-hidden">
            <div className="space-y-4 h-[500px] flex flex-col">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Tokens estimados: {tokenCount}</Badge>
                  {tokenCount > 4000 && (
                    <Badge variant="destructive">Muito extenso</Badge>
                  )}
                </div>
                <Button onClick={generatePreview} variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-1" />
                  Gerar Preview
                </Button>
              </div>
              
              <ScrollArea className="flex-1 border rounded-md">
                <div className="p-4">
                  <pre className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {previewPrompt || 'Clique em "Gerar Preview" para visualizar o prompt completo'}
                  </pre>
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>

        <Separator />

        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            onClick={handleReset}
            className="flex items-center gap-1"
          >
            <RotateCcw className="h-4 w-4" />
            Resetar
          </Button>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} className="flex items-center gap-1">
              <Save className="h-4 w-4" />
              Salvar Configurações
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};