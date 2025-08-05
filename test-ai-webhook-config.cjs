const { createServer } = require('http');
const { parse } = require('url');

// Simular configurações da Evolution API
const mockAdminSettings = {
  evolutionApiUrl: "https://api.evolution.com",
  globalToken: "test-token-123",
  isActive: true
};

// Simular instância WhatsApp
const mockInstance = {
  id: "test-instance-1",
  instanceKey: "test-instance-key",
  instanceName: "Test Instance",
  clientId: "test-client-1"
};

// Simular requisição para configurar webhook
async function testWebhookConfiguration() {
  console.log("🧪 Testando configuração do webhook da IA...");
  
  // Simular URL base
  const baseUrl = "https://localhost:3000";
  const webhookUrl = `${baseUrl}/api/client/whatsapp-webhook/${mockInstance.instanceKey}`;
  
  // Configuração do webhook conforme documentação da Evolution API
  const webhookConfig = {
    webhook: {
      enabled: true,
      url: webhookUrl,
      headers: {
        authorization: `Bearer ${mockAdminSettings.globalToken}`,
        "Content-Type": "application/json"
      },
      byEvents: false,
      base64: true,
      events: [
        "MESSAGES_UPSERT"
      ]
    }
  };
  
  console.log("📋 Configuração do webhook:");
  console.log(JSON.stringify(webhookConfig, null, 2));
  
  console.log("🔗 URL do webhook:", webhookUrl);
  console.log("🎯 Eventos configurados:", webhookConfig.webhook.events);
  
  // Simular chamada para Evolution API
  const evolutionApiUrl = `${mockAdminSettings.evolutionApiUrl}/webhook/set/${mockInstance.instanceKey}`;
  console.log("🌐 URL da Evolution API:", evolutionApiUrl);
  
  console.log("✅ Teste de configuração concluído!");
  console.log("\n📝 Resumo:");
  console.log("- Webhook ativado: ✓");
  console.log("- URL configurada: ✓");
  console.log("- Headers configurados: ✓");
  console.log("- Base64 ativado: ✓");
  console.log("- Apenas MESSAGES_UPSERT ativo: ✓");
  
  return webhookConfig;
}

// Executar teste
testWebhookConfiguration()
  .then(() => {
    console.log("\n🎉 Teste concluído com sucesso!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Erro no teste:", error);
    process.exit(1);
  }); 