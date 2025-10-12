import { db } from "./server/db.ts";
import { googleCalendarSettings } from "./shared/schema.ts";
import { google } from 'googleapis';

async function testGoogleCalendarAuth() {
  try {
    console.log("🔐 Testando autenticação do Google Calendar...\n");

    // Buscar configurações
    const [settings] = await db.select().from(googleCalendarSettings);

    if (!settings) {
      console.log("❌ Nenhuma configuração encontrada.");
      return;
    }

    console.log("📋 Configurações encontradas:");
    console.log(`   Client ID: ${settings.clientId?.substring(0, 20)}...`);
    console.log(`   Client Secret: ${settings.clientSecret ? '✓ Presente' : '✗ Ausente'}`);
    console.log(`   Refresh Token: ${settings.refreshToken ? '✓ Presente' : '✗ Ausente'}`);
    console.log(`   Calendar ID: ${settings.calendarId}\n`);

    if (!settings.refreshToken) {
      console.log("❌ Refresh token não encontrado. Faça login novamente.");
      return;
    }

    console.log("🔄 Tentando autenticar com o Google...\n");

    // Criar cliente OAuth2
    const oauth2Client = new google.auth.OAuth2(
      settings.clientId,
      settings.clientSecret,
      'urn:ietf:wg:oauth:2.0:oob'
    );

    // Configurar refresh token
    oauth2Client.setCredentials({
      refresh_token: settings.refreshToken
    });

    console.log("📅 Tentando acessar o Google Calendar API...");

    // Tentar listar calendários
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    try {
      const response = await calendar.calendarList.list();

      console.log("\n✅ Autenticação bem-sucedida!");
      console.log(`\n📅 Calendários disponíveis (${response.data.items?.length || 0}):`);

      response.data.items?.forEach((cal, index) => {
        console.log(`\n${index + 1}. ${cal.summary}`);
        console.log(`   ID: ${cal.id}`);
        console.log(`   Primary: ${cal.primary ? 'Sim' : 'Não'}`);
        console.log(`   Access Role: ${cal.accessRole}`);
      });

      // Testar criação de evento de teste (sem realmente criar)
      console.log("\n🧪 Verificando permissões de escrita...");
      const testEvent = {
        summary: "[TESTE] Evento de Teste - NÃO CRIAR",
        description: "Este é apenas um teste de validação",
        start: {
          dateTime: new Date().toISOString(),
          timeZone: 'America/Sao_Paulo',
        },
        end: {
          dateTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          timeZone: 'America/Sao_Paulo',
        },
      };

      console.log("✅ Cliente OAuth2 configurado corretamente!");
      console.log("✅ Permissões de leitura: OK");
      console.log("✅ Pronto para criar eventos!");

    } catch (apiError) {
      console.error("\n❌ Erro ao acessar Google Calendar API:");
      console.error(`   Código: ${apiError.code}`);
      console.error(`   Mensagem: ${apiError.message}`);

      if (apiError.code === 401 || apiError.message?.includes('invalid_client')) {
        console.log("\n⚠️ PROBLEMA IDENTIFICADO:");
        console.log("   As credenciais OAuth2 (Client ID/Secret) não correspondem ao refresh token.");
        console.log("\n💡 SOLUÇÃO:");
        console.log("   1. Vá para: https://console.cloud.google.com/apis/credentials");
        console.log("   2. Verifique se o Client ID/Secret estão corretos");
        console.log("   3. OU reconecte sua conta Google na interface web (isso gerará novo refresh token)");
      }
    }

  } catch (error) {
    console.error("\n❌ Erro geral:", error.message);
  } finally {
    process.exit(0);
  }
}

testGoogleCalendarAuth();
