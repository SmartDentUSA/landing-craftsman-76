DO $$
DECLARE
  prod RECORD;
  doc JSONB;
  fds_doc JSONB := NULL;
  ifu_doc JSONB := NULL;
  perfil_doc JSONB := NULL;
  doc_nome TEXT;
  cta1 JSONB;
  cta2 JSONB;
  cta3 JSONB;
  descs JSONB;
  empty_cta JSONB := '{"label": "", "url": "", "visible": false}'::jsonb;
  has_any BOOLEAN;
BEGIN
  FOR prod IN 
    SELECT id, name, technical_documents
    FROM products_repository
    WHERE (category = 'RESINAS 3D' AND subcategory IN ('BIOCOMPATÍVEIS', 'USO GERAL'))
       OR (category = 'DENTÍSTICA, ESTÉTICA E ORTODONTIA' AND subcategory IN ('ADESIVOS', 'CIMENTOS', 'RESINAS COMPOSTAS'))
  LOOP
    fds_doc := NULL;
    ifu_doc := NULL;
    perfil_doc := NULL;
    
    IF prod.technical_documents IS NOT NULL AND jsonb_typeof(prod.technical_documents) = 'array' THEN
      FOR doc IN SELECT * FROM jsonb_array_elements(prod.technical_documents)
      LOOP
        doc_nome := TRIM(doc->>'nome');
        
        IF LOWER(doc_nome) = 'fds' AND fds_doc IS NULL THEN
          fds_doc := doc;
        ELSIF LOWER(doc_nome) = 'ifu' AND ifu_doc IS NULL THEN
          ifu_doc := doc;
        ELSIF LOWER(doc_nome) LIKE '%perfil%' AND perfil_doc IS NULL THEN
          perfil_doc := doc;
        END IF;
      END LOOP;
    END IF;
    
    -- Build CTAs
    IF fds_doc IS NOT NULL THEN
      cta1 := jsonb_build_object('label', fds_doc->>'nome', 'url', fds_doc->>'url_download', 'visible', true);
    ELSE
      cta1 := empty_cta;
    END IF;
    
    IF ifu_doc IS NOT NULL THEN
      cta2 := jsonb_build_object('label', ifu_doc->>'nome', 'url', ifu_doc->>'url_download', 'visible', true);
    ELSE
      cta2 := empty_cta;
    END IF;
    
    IF perfil_doc IS NOT NULL THEN
      cta3 := jsonb_build_object('label', perfil_doc->>'nome', 'url', perfil_doc->>'url_download', 'visible', true);
    ELSE
      cta3 := empty_cta;
    END IF;
    
    -- Build descriptions
    descs := jsonb_build_object(
      'cta1', COALESCE(fds_doc->>'descricao', fds_doc->>'nome', ''),
      'cta2', COALESCE(ifu_doc->>'descricao', ifu_doc->>'nome', ''),
      'cta3', COALESCE(perfil_doc->>'descricao', perfil_doc->>'nome', '')
    );
    
    has_any := (fds_doc IS NOT NULL OR ifu_doc IS NOT NULL OR perfil_doc IS NOT NULL);
    
    UPDATE products_repository SET
      resource_cta1 = cta1,
      resource_cta2 = cta2,
      resource_cta3 = cta3,
      resource_descriptions = descs,
      show_in_resources = has_any
    WHERE id = prod.id;
    
    RAISE NOTICE 'Updated: % | FDS:% IFU:% Perfil:%', 
      prod.name, 
      (fds_doc IS NOT NULL)::text, 
      (ifu_doc IS NOT NULL)::text, 
      (perfil_doc IS NOT NULL)::text;
  END LOOP;
END $$;