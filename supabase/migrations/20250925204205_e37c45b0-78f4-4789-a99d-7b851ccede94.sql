-- Adicionar campos para armazenar mensagens geradas no products_repository
ALTER TABLE products_repository 
ADD COLUMN whatsapp_messages JSONB DEFAULT '{"messages": [], "last_generated": null}'::jsonb,
ADD COLUMN youtube_descriptions JSONB DEFAULT '{"descriptions": [], "last_generated": null}'::jsonb;

-- Campo para template padrão do YouTube na company_profile
ALTER TABLE company_profile 
ADD COLUMN youtube_company_footer TEXT DEFAULT '🌟SIGA-NOS NAS REDES SOCIAIS:
► 𝐈𝐍𝐒𝐓𝐀𝐆𝐑𝐀𝐌 𝐒𝐌𝐀𝐑𝐓𝐃𝐄𝐍𝐓: https://www.instagram.com/smartdentoficial/
► 𝐅𝐀𝐂𝐄𝐁𝐎𝐎𝐊: https://www.facebook.com/SmartdentOficial
► 𝐘𝐎𝐔𝐓𝐔𝐁𝐄: https://www.youtube.com/@smartdentoficial
► 𝐖𝐄𝐁𝐒𝐈𝐓𝐄: https://smartdent.com.br/

📍 𝐄𝐍𝐃𝐄𝐑𝐄ÇO: Rua Exemplo, 123 - Centro, Cidade - Estado
📞 𝐂𝐎𝐍𝐓𝐀𝐓𝐎: (11) 99999-9999
✉️ 𝐄-𝐌𝐀𝐈𝐋: contato@smartdent.com.br

💡 𝐒𝐨𝐦𝐨𝐬 𝐮𝐦𝐚 𝐞𝐦𝐩𝐫𝐞𝐬𝐚 𝐞𝐬𝐩𝐞𝐜𝐢𝐚𝐥𝐢𝐳𝐚𝐝𝐚 𝐞𝐦 𝐬𝐨𝐥𝐮çõ𝐞𝐬 𝐢𝐧𝐨𝐯𝐚𝐝𝐨𝐫𝐚𝐬 𝐩𝐚𝐫𝐚 𝐨 𝐦𝐞𝐫𝐜𝐚𝐝𝐨 𝐨𝐝𝐨𝐧𝐭𝐨𝐥ó𝐠𝐢𝐜𝐨.';