-- Migration: Add image fields to custom_ai_agents table
-- Date: 2025-10-02

ALTER TABLE custom_ai_agents
ADD COLUMN IF NOT EXISTS image_files JSON DEFAULT '[]' COMMENT 'Array de nomes de arquivos de imagem' AFTER pdf_contents,
ADD COLUMN IF NOT EXISTS image_descriptions JSON DEFAULT '[]' COMMENT 'Array de objetos {fileName, description}' AFTER image_files;
