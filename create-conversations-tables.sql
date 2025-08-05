-- Criar tabela whatsapp_conversations
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  instance_id VARCHAR(36) NOT NULL,
  chat_id VARCHAR(100) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  contact_name VARCHAR(255),
  last_message TEXT,
  last_message_at TIMESTAMP NULL,
  unread_count INT DEFAULT 0,
  is_group BOOLEAN DEFAULT FALSE,
  group_name VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_whatsapp_conversations_instance (instance_id),
  INDEX idx_whatsapp_conversations_chat (chat_id),
  INDEX idx_whatsapp_conversations_phone (phone_number),
  INDEX idx_whatsapp_conversations_updated (updated_at),
  UNIQUE KEY unique_instance_chat (instance_id, chat_id),
  FOREIGN KEY (instance_id) REFERENCES whatsapp_instances(id) ON DELETE CASCADE
);

-- Criar tabela whatsapp_messages
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  conversation_id VARCHAR(36) NOT NULL,
  message_id VARCHAR(100),
  sender_phone VARCHAR(20) NOT NULL,
  message_text TEXT,
  message_type VARCHAR(50) NOT NULL DEFAULT 'text',
  media_url VARCHAR(500),
  media_type VARCHAR(50),
  media_caption TEXT,
  direction VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'sent',
  timestamp TIMESTAMP NOT NULL,
  is_ai_response BOOLEAN DEFAULT FALSE,
  ai_model VARCHAR(50),
  raw_data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_whatsapp_messages_conversation (conversation_id),
  INDEX idx_whatsapp_messages_sender (sender_phone),
  INDEX idx_whatsapp_messages_timestamp (timestamp),
  INDEX idx_whatsapp_messages_direction (direction),
  INDEX idx_whatsapp_messages_ai (is_ai_response),
  FOREIGN KEY (conversation_id) REFERENCES whatsapp_conversations(id) ON DELETE CASCADE
);

-- Inserir dados de exemplo (opcional)
INSERT INTO whatsapp_conversations (id, instance_id, chat_id, phone_number, contact_name, last_message, last_message_at, unread_count, status)
SELECT 
  UUID(), 
  id, 
  '5511999999999@s.whatsapp.net', 
  '5511999999999', 
  'João Silva', 
  'Olá! Como posso ajudar?', 
  NOW(), 
  0, 
  'active'
FROM whatsapp_instances 
LIMIT 1
ON DUPLICATE KEY UPDATE updated_at = NOW();

INSERT INTO whatsapp_conversations (id, instance_id, chat_id, phone_number, contact_name, last_message, last_message_at, unread_count, status)
SELECT 
  UUID(), 
  id, 
  '5511888888888@s.whatsapp.net', 
  '5511888888888', 
  'Maria Santos', 
  'Obrigada pelo atendimento!', 
  NOW(), 
  2, 
  'active'
FROM whatsapp_instances 
LIMIT 1
ON DUPLICATE KEY UPDATE updated_at = NOW();

INSERT INTO whatsapp_conversations (id, instance_id, chat_id, phone_number, contact_name, last_message, last_message_at, unread_count, status)
SELECT 
  UUID(), 
  id, 
  '5511777777777@s.whatsapp.net', 
  '5511777777777', 
  'Pedro Costa', 
  'Preciso de informações sobre o produto', 
  NOW(), 
  1, 
  'active'
FROM whatsapp_instances 
LIMIT 1
ON DUPLICATE KEY UPDATE updated_at = NOW(); 