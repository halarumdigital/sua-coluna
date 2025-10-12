import { db } from "./server/db.ts";
import { googleCalendarSettings } from "./shared/schema.ts";
import { google } from 'googleapis';

async function testOAuthUrl() {
  try {
    console.log("🔍 Gerando URL de OAuth para teste...\n");

    const [settings] = await db.select().from(googleCalendarSettings);

    if (!settings) {
      console.log("❌ Nenhuma configuração encontrada.");
      return;
    }

    // Simular a URL de callback que seria gerada
    const possibleUrls = [
      'http://localhost:5000/api/franchise/calendar-oauth-callback',
      'https://suacoluna.gilliard.dev.br/api/franchise/calendar-oauth-callback',
      'https://cwp.sites.halarum.com.br/api/franchise/calendar-oauth-callback'
    ];

    console.log("📋 Credenciais:");
    console.log(`   Client ID: ${settings.clientId?.substring(0, 30)}...`);
    console.log(`   Client Secret: ${settings.clientSecret ? 'Configurado ✓' : 'Não configurado ✗'}`);

    console.log("\n📍 Testando possíveis URLs de callback:\n");

    for (const redirectUrl of possibleUrls) {
      console.log(`\n🔗 URL: ${redirectUrl}`);

      const oauth2Client = new google.auth.OAuth2(
        settings.clientId,
        settings.clientSecret,
        redirectUrl
      );

      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/calendar'],
        prompt: 'consent'
      });

      console.log(`   Auth URL gerada (primeiros 100 chars):`);
      console.log(`   ${authUrl.substring(0, 100)}...`);
    }

    console.log("\n\n⚠️ IMPORTANTE:");
    console.log("   Para corrigir o erro 400, você precisa:");
    console.log("   1. Ir para: https://console.cloud.google.com/apis/credentials");
    console.log("   2. Clicar no seu Client ID OAuth 2.0");
    console.log("   3. Em 'URIs de redirecionamento autorizados', adicionar:");
    console.log("      • https://suacoluna.gilliard.dev.br/api/franchise/calendar-oauth-callback");
    console.log("      • http://localhost:5000/api/franchise/calendar-oauth-callback (se testar localmente)");
    console.log("   4. Salvar e tentar novamente");

  } catch (error) {
    console.error("❌ Erro:", error);
  } finally {
    process.exit(0);
  }
}

testOAuthUrl();
