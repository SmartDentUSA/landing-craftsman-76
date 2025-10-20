# 🔌 Knowledge Base API - Exemplos de Integração

Este guia fornece exemplos práticos de como integrar a Knowledge Base API em diferentes sistemas e casos de uso.

## 📋 Índice

- [1. IA de Atendimento (Chatbot)](#1-ia-de-atendimento-chatbot)
- [2. Sistema B (Sincronização Bidirecional)](#2-sistema-b-sincronização-bidirecional)
- [3. CRM / ERP](#3-crm--erp)
- [4. Google Merchant Feed](#4-google-merchant-feed)
- [5. Power BI / Analytics](#5-power-bi--analytics)
- [6. Automação No-Code (Zapier, Make, n8n)](#6-automação-no-code-zapier-make-n8n)
- [7. E-commerce (Loja Integrada, Shopify)](#7-e-commerce-loja-integrada-shopify)
- [8. Marketing Automation](#8-marketing-automation)

---

## 1. IA de Atendimento (Chatbot)

### 🎯 Objetivo
Treinar um chatbot (GPT, Claude, DialogFlow) com conhecimento completo da empresa e produtos.

### 📥 Formato Recomendado
`ai_training` - Texto otimizado para LLMs

### 💻 Exemplo de Implementação

#### Script Python para Treinar IA

```python
import requests
import os
from datetime import datetime

class KnowledgeBaseSync:
    def __init__(self, api_key):
        self.api_key = api_key
        self.base_url = "https://pgfgripuanuwwolmtknn.supabase.co/functions/v1/knowledge-base"
    
    def fetch_knowledge_base(self):
        """Busca base de conhecimento no formato AI Training"""
        response = requests.get(
            f"{self.base_url}?format=ai_training",
            headers={'x-api-key': self.api_key}
        )
        
        if response.status_code == 200:
            return response.text
        else:
            raise Exception(f"Erro: {response.status_code} - {response.text}")
    
    def save_to_file(self, content):
        """Salva conteúdo em arquivo para treinamento"""
        filename = f"knowledge_base_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✅ Base de conhecimento salva em: {filename}")
        return filename
    
    def train_openai_assistant(self, knowledge_text):
        """Exemplo: Treinar OpenAI Assistant"""
        from openai import OpenAI
        
        client = OpenAI(api_key=os.environ['OPENAI_API_KEY'])
        
        # Criar arquivo de conhecimento
        file = client.files.create(
            file=open("knowledge_base.txt", "rb"),
            purpose='assistants'
        )
        
        # Criar assistant com conhecimento
        assistant = client.beta.assistants.create(
            name="Atendimento Smartdent",
            instructions="""Você é um assistente especializado em produtos 
            odontológicos da Smartdent. Use a base de conhecimento para 
            responder perguntas sobre produtos, categorias e empresa.""",
            model="gpt-4-turbo-preview",
            tools=[{"type": "retrieval"}],
            file_ids=[file.id]
        )
        
        print(f"✅ Assistant criado: {assistant.id}")
        return assistant

# Uso
syncer = KnowledgeBaseSync(api_key=os.environ['KNOWLEDGE_BASE_API_KEY'])
knowledge = syncer.fetch_knowledge_base()
filename = syncer.save_to_file(knowledge)
syncer.train_openai_assistant(knowledge)
```

#### Agendamento Automático (Cron)

```bash
# Atualizar base de conhecimento a cada 6 horas
0 */6 * * * /usr/bin/python3 /path/to/sync_knowledge_base.py
```

---

## 2. Sistema B (Sincronização Bidirecional)

### 🎯 Objetivo
Sincronizar produtos e categorias entre Sistema A (atual) e Sistema B (legacy).

### 📥 Formato Recomendado
`system_b` - Estrutura flat otimizada

### 💻 Exemplo de Implementação

#### Node.js - Sincronização Completa

```javascript
const axios = require('axios');

class SystemBIntegration {
  constructor(apiKey, systemBUrl) {
    this.apiKey = apiKey;
    this.systemBUrl = systemBUrl;
    this.knowledgeBaseUrl = 'https://pgfgripuanuwwolmtknn.supabase.co/functions/v1/knowledge-base';
  }

  async fetchFromKnowledgeBase() {
    const response = await axios.get(this.knowledgeBaseUrl, {
      params: { format: 'system_b' },
      headers: { 'x-api-key': this.apiKey }
    });
    
    return response.data;
  }

  async syncProducts(products) {
    console.log(`🔄 Sincronizando ${products.length} produtos...`);
    
    for (const product of products) {
      const systemBProduct = this.transformToSystemB(product);
      
      try {
        await axios.post(`${this.systemBUrl}/products`, systemBProduct, {
          headers: { 'Authorization': `Bearer ${process.env.SYSTEM_B_TOKEN}` }
        });
        console.log(`✅ Produto ${product.name} sincronizado`);
      } catch (error) {
        console.error(`❌ Erro ao sincronizar ${product.name}:`, error.message);
      }
    }
  }

  transformToSystemB(product) {
    return {
      // Mapeamento de campos para Sistema B
      codigo_produto: product.id,
      nome: product.name,
      descricao: product.description,
      preco_venda: product.price,
      preco_promocional: product.promo_price,
      categoria: product.category,
      subcategoria: product.subcategory,
      marca: product.brand,
      ean: product.ean,
      ncm: product.ncm,
      estoque: product.stock_quantity,
      peso: product.weight,
      altura: product.height,
      largura: product.width,
      profundidade: product.depth,
      ativo: product.active,
      imagem_principal: product.image_url,
      imagens_adicionais: product.images_gallery?.map(img => img.url),
      especificacoes: product.technical_specifications,
      palavras_chave: product.keywords
    };
  }

  async run() {
    try {
      const data = await this.fetchFromKnowledgeBase();
      await this.syncProducts(data.products);
      console.log('✅ Sincronização concluída!');
    } catch (error) {
      console.error('❌ Erro na sincronização:', error.message);
    }
  }
}

// Execução
const integration = new SystemBIntegration(
  process.env.KNOWLEDGE_BASE_API_KEY,
  process.env.SYSTEM_B_URL
);
integration.run();
```

---

## 3. CRM / ERP

### 🎯 Objetivo
Importar produtos para CRM (HubSpot, Salesforce, Pipedrive).

### 💻 Exemplo - HubSpot

```javascript
const axios = require('axios');

async function syncToHubSpot() {
  // 1. Buscar produtos
  const kb = await axios.get(
    'https://pgfgripuanuwwolmtknn.supabase.co/functions/v1/knowledge-base',
    {
      params: { include_products: true, include_company: false },
      headers: { 'x-api-key': process.env.KNOWLEDGE_BASE_API_KEY }
    }
  );

  // 2. Transformar para formato HubSpot
  const products = kb.data.data.products.map(item => ({
    properties: {
      name: item.product.name,
      description: item.product.description,
      price: item.product.price,
      hs_sku: item.product.id,
      hs_cost_of_goods_sold: item.product.price * 0.6, // Exemplo
      hs_images: item.product.images_gallery?.map(img => img.url).join(';')
    }
  }));

  // 3. Criar produtos no HubSpot
  for (const product of products) {
    await axios.post(
      'https://api.hubapi.com/crm/v3/objects/products',
      product,
      {
        headers: {
          'Authorization': `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
  }

  console.log(`✅ ${products.length} produtos criados no HubSpot`);
}

syncToHubSpot();
```

---

## 4. Google Merchant Feed

### 🎯 Objetivo
Gerar feed XML para Google Merchant Center.

### 💻 Exemplo - XML Generator

```python
import requests
import xml.etree.ElementTree as ET
from xml.dom import minidom

def generate_google_merchant_feed():
    # Buscar produtos
    response = requests.get(
        'https://pgfgripuanuwwolmtknn.supabase.co/functions/v1/knowledge-base',
        headers={'x-api-key': os.environ['KNOWLEDGE_BASE_API_KEY']},
        params={'approved_only': True, 'limit': 500}
    )
    
    data = response.json()['data']
    company = data['company_profile']
    products = data['products']
    
    # Criar XML
    rss = ET.Element('rss', {
        'xmlns:g': 'http://base.google.com/ns/1.0',
        'version': '2.0'
    })
    channel = ET.SubElement(rss, 'channel')
    
    # Informações do canal
    ET.SubElement(channel, 'title').text = company['company_name']
    ET.SubElement(channel, 'link').text = company['website_url']
    ET.SubElement(channel, 'description').text = company['company_description']
    
    # Adicionar produtos
    for item in products:
        p = item['product']
        
        product_elem = ET.SubElement(channel, 'item')
        ET.SubElement(product_elem, 'g:id').text = str(p['id'])
        ET.SubElement(product_elem, 'g:title').text = p['name'][:150]
        ET.SubElement(product_elem, 'g:description').text = p['description'][:5000]
        ET.SubElement(product_elem, 'g:link').text = p['product_url']
        ET.SubElement(product_elem, 'g:image_link').text = p['image_url']
        
        # Preço
        price = p.get('promo_price') or p['price']
        ET.SubElement(product_elem, 'g:price').text = f"{price} BRL"
        
        # Categoria Google
        if p.get('google_product_category'):
            ET.SubElement(product_elem, 'g:google_product_category').text = p['google_product_category']
        
        # Marca
        if p.get('brand'):
            ET.SubElement(product_elem, 'g:brand').text = p['brand']
        
        # GTIN
        if p.get('gtin'):
            ET.SubElement(product_elem, 'g:gtin').text = p['gtin']
        
        # MPN
        if p.get('mpn'):
            ET.SubElement(product_elem, 'g:mpn').text = p['mpn']
        
        # Condição
        ET.SubElement(product_elem, 'g:condition').text = p.get('condition', 'new')
        
        # Disponibilidade
        ET.SubElement(product_elem, 'g:availability').text = p.get('availability', 'in stock')
    
    # Salvar XML
    xml_str = minidom.parseString(ET.tostring(rss)).toprettyxml(indent='  ')
    with open('google_merchant_feed.xml', 'w', encoding='utf-8') as f:
        f.write(xml_str)
    
    print(f"✅ Feed gerado com {len(products)} produtos")

generate_google_merchant_feed()
```

---

## 5. Power BI / Analytics

### 🎯 Objetivo
Criar dashboards e relatórios no Power BI.

### 💻 Exemplo - Power Query (M)

```m
let
    // Buscar dados da API
    Source = Web.Contents(
        "https://pgfgripuanuwwolmtknn.supabase.co/functions/v1/knowledge-base",
        [
            Headers=[
                #"x-api-key"="YOUR_API_KEY"
            ]
        ]
    ),
    
    // Parsear JSON
    JsonData = Json.Document(Source),
    Data = JsonData[data],
    
    // Produtos
    Products = Data[products],
    ProductsTable = Table.FromList(Products, Splitter.SplitByNothing(), null, null, ExtraValues.Error),
    ExpandedProducts = Table.ExpandRecordColumn(
        ProductsTable, 
        "Column1", 
        {"product", "completion_score", "coupons"},
        {"product", "completion_score", "coupons"}
    ),
    
    // Expandir campos do produto
    ExpandedProductDetails = Table.ExpandRecordColumn(
        ExpandedProducts,
        "product",
        {"id", "name", "price", "promo_price", "category", "subcategory", "brand", "stock_quantity"},
        {"ID", "Nome", "Preço", "Preço Promocional", "Categoria", "Subcategoria", "Marca", "Estoque"}
    ),
    
    // Expandir score de completude
    FinalTable = Table.ExpandRecordColumn(
        ExpandedProductDetails,
        "completion_score",
        {"completion_score", "completion_status"},
        {"Score %", "Status"}
    )
in
    FinalTable
```

---

## 6. Automação No-Code (Zapier, Make, n8n)

### 🎯 Objetivo
Integrar sem código usando plataformas no-code.

### 💻 Exemplo - Zapier

#### Trigger: Webhook (Agendado)
1. **App:** Webhooks by Zapier
2. **Event:** GET Request
3. **URL:** `https://pgfgripuanuwwolmtknn.supabase.co/functions/v1/knowledge-base`
4. **Headers:**
   - `x-api-key`: YOUR_API_KEY

#### Action: Google Sheets
1. **App:** Google Sheets
2. **Event:** Create Spreadsheet Row
3. **Mapeamento:**
   - Coluna A: `{{data.products.0.product.name}}`
   - Coluna B: `{{data.products.0.product.price}}`
   - Coluna C: `{{data.products.0.product.category}}`

### 💻 Exemplo - Make (Integromat)

```json
{
  "name": "Sync Knowledge Base to Airtable",
  "modules": [
    {
      "module": "http:ActionSendData",
      "parameters": {
        "url": "https://pgfgripuanuwwolmtknn.supabase.co/functions/v1/knowledge-base",
        "method": "get",
        "headers": [
          {
            "name": "x-api-key",
            "value": "{{env.KNOWLEDGE_BASE_API_KEY}}"
          }
        ]
      }
    },
    {
      "module": "iterator",
      "array": "{{output.data.products}}"
    },
    {
      "module": "airtable:createRecord",
      "parameters": {
        "baseId": "YOUR_BASE_ID",
        "tableId": "Products",
        "fields": {
          "Name": "{{product.name}}",
          "Price": "{{product.price}}",
          "Category": "{{product.category}}"
        }
      }
    }
  ]
}
```

---

## 7. E-commerce (Loja Integrada, Shopify)

### 🎯 Objetivo
Importar produtos para loja online.

### 💻 Exemplo - Shopify

```javascript
const Shopify = require('shopify-api-node');
const axios = require('axios');

async function syncToShopify() {
  // Conectar Shopify
  const shopify = new Shopify({
    shopName: process.env.SHOPIFY_SHOP_NAME,
    accessToken: process.env.SHOPIFY_ACCESS_TOKEN
  });

  // Buscar produtos da Knowledge Base
  const response = await axios.get(
    'https://pgfgripuanuwwolmtknn.supabase.co/functions/v1/knowledge-base',
    { headers: { 'x-api-key': process.env.KNOWLEDGE_BASE_API_KEY } }
  );

  const products = response.data.data.products;

  // Importar para Shopify
  for (const item of products) {
    const p = item.product;
    
    const shopifyProduct = {
      title: p.name,
      body_html: p.description,
      vendor: p.brand || 'Default',
      product_type: p.category,
      tags: p.keywords?.join(', '),
      variants: [
        {
          price: p.price,
          compare_at_price: p.promo_price ? p.price : null,
          sku: p.id,
          inventory_quantity: p.stock_quantity || 0,
          weight: p.weight,
          weight_unit: 'kg'
        }
      ],
      images: p.images_gallery?.map(img => ({ src: img.url })) || []
    };

    await shopify.product.create(shopifyProduct);
    console.log(`✅ ${p.name} importado`);
  }
}

syncToShopify();
```

---

## 8. Marketing Automation

### 🎯 Objetivo
Criar campanhas personalizadas baseadas em categorias.

### 💻 Exemplo - SendGrid Email Campaigns

```python
import requests
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

def create_category_campaigns():
    # Buscar categorias
    response = requests.get(
        'https://pgfgripuanuwwolmtknn.supabase.co/functions/v1/knowledge-base',
        headers={'x-api-key': os.environ['KNOWLEDGE_BASE_API_KEY']},
        params={'include_products': True}
    )
    
    data = response.json()['data']
    
    # Agrupar produtos por categoria
    by_category = {}
    for item in data['products']:
        cat = item['product']['category']
        if cat not in by_category:
            by_category[cat] = []
        by_category[cat].append(item['product'])
    
    # Criar campanha por categoria
    sg = SendGridAPIClient(os.environ['SENDGRID_API_KEY'])
    
    for category, products in by_category.items():
        # Construir HTML
        html = f"<h1>Novidades em {category}</h1><ul>"
        for p in products[:5]:  # Top 5
            html += f"<li><strong>{p['name']}</strong> - R$ {p['price']}</li>"
        html += "</ul>"
        
        # Enviar email
        message = Mail(
            from_email='marketing@empresa.com',
            to_emails='subscribers@example.com',
            subject=f'Novidades em {category}',
            html_content=html
        )
        
        response = sg.send(message)
        print(f"✅ Campanha {category} enviada")

create_category_campaigns()
```

---

## 📝 Checklist de Integração

### Antes de Começar
- [ ] Obter API Key válida
- [ ] Testar endpoint com cURL
- [ ] Verificar rate limits (100 req/min)
- [ ] Definir formato de resposta (`json`, `ai_training`, `system_b`)

### Durante o Desenvolvimento
- [ ] Implementar tratamento de erros (401, 429, 500)
- [ ] Adicionar retry logic para falhas temporárias
- [ ] Monitorar rate limit headers
- [ ] Validar dados recebidos

### Após Implementação
- [ ] Configurar agendamento (cron, webhooks)
- [ ] Implementar logging
- [ ] Testar com dados de produção
- [ ] Documentar mapeamento de campos

---

## 🆘 Suporte

Para mais exemplos ou dúvidas:
- Consulte [KNOWLEDGE_BASE_API.md](./KNOWLEDGE_BASE_API.md)
- Consulte [KNOWLEDGE_BASE_FIELDS_REFERENCE.md](./KNOWLEDGE_BASE_FIELDS_REFERENCE.md)

---

**🚀 Boas Integrações!**
