import { db } from "./server/db.ts";
import { googleCalendarSettings } from "./shared/schema.ts";
import { google } from 'googleapis';

async function testGoogleOAuthConfig() {
  try {
    console.log("🔍 Testando configuração OAuth do Google...\n");

    const [settings] = await db.select().from(googleCalendarSettings);

    if (!settings) {
      console.log("❌ Nenhuma configuração encontrada.");
      return;
    }

    const redirectUrl = process.env.GOOGLE_OAUTH_REDIRECT_URL ||
                       'https://suacoluna.gilliard.dev.br/api/franchise/calendar-oauth-callback';

    console.log("📋 Configurações:");
    console.log(`   Client ID: ${settings.clientId}`);
    console.log(`   Client Secret: ${settings.clientSecret}`);
    console.log(`   Redirect URL: ${redirectUrl}`);
    console.log();

    // Criar cliente OAuth2
    const oauth2Client = new google.auth.OAuth2(
      settings.clientId,
      settings.clientSecret,
      redirectUrl
    );

    // Gerar URL de autorização
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar'],
      prompt: 'consent'
    });

    console.log("🔗 URL de autorização gerada:");
    console.log(authUrl);
    console.log();

    // Extrair redirect_uri
    const urlParams = new URL(authUrl);
    const redirectUriParam = urlParams.searchParams.get('redirect_uri');
    const clientIdParam = urlParams.searchParams.get('client_id');

    console.log("📍 Parâmetros extraídos:");
    console.log(`   redirect_uri: ${redirectUriParam}`);
    console.log(`   client_id: ${clientIdParam}`);
    console.log();

    console.log("✅ Verificações:");
    console.log(`   redirect_uri correto: ${redirectUriParam === redirectUrl ? '✓ SIM' : '✗ NÃO'}`);
    console.log(`   client_id correto: ${clientIdParam === settings.clientId ? '✓ SIM' : '✗ NÃO'}`);
    console.log();

    console.log("⚠️ Para corrigir o erro 400:");
    console.log("   1. Vá para: https://console.cloud.google.com/apis/credentials");
    console.log(`   2. Certifique-se que esta URL está cadastrada: ${redirectUriParam}`);
    console.log(`   3. Certifique-se que o Client ID é: ${clientIdParam}`);
    console.log();
    console.log("💡 Dica: Se você acabou de alterar no Google Cloud Console,");
    console.log("   aguarde 2-5 minutos e tente novamente.");

  } catch (error) {
    console.error("❌ Erro:", error);
  } finally {
    process.exit(0);
  }
}

testGoogleOAuthConfig();
