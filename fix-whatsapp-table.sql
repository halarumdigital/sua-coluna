-- Script para corrigir a tabela whatsapp_instances
-- Remover coluna client_id e ajustar franchise_id

-- 1. Adicionar coluna franchise_id se não existir
ALTER TABLE whatsapp_instances 
ADD COLUMN IF NOT EXISTS franchise_id VARCHAR(36) AFTER id;

-- 2. Remover coluna client_id
ALTER TABLE whatsapp_instances 
DROP COLUMN client_id;

-- 3. Remover índice antigo se existir
DROP INDEX IF EXISTS idx_whatsapp_instances_client ON whatsapp_instances;

-- 4. Adicionar novo índice para franchise_id
ALTER TABLE whatsapp_instances 
ADD INDEX idx_whatsapp_instances_franchise (franchise_id);

-- 5. Definir franchise_id como NOT NULL
ALTER TABLE whatsapp_instances 
MODIFY COLUMN franchise_id VARCHAR(36) NOT NULL;
