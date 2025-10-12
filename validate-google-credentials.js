import { db } from "./server/db.ts";
import { googleCalendarSettings } from "./shared/schema.ts";
import { google } from 'googleapis';

async function validateGoogleCredentials() {
  try {
    console.log("🔐 Validando credenciais do Google...\n");

    const [settings] = await db.select().from(googleCalendarSettings);

    if (!settings) {
      console.log("❌ Nenhuma configuração encontrada.");
      return;
    }

    const redirectUrl = process.env.GOOGLE_OAUTH_REDIRECT_URL ||
                       'https://suacoluna.gilliard.dev.br/api/franchise/calendar-oauth-callback';

    console.log("📋 Credenciais atuais:");
    console.log(`   Client ID: ${settings.clientId}`);
    console.log(`   Client Secret: ${settings.clientSecret}`);
    console.log(`   Redirect URL: ${redirectUrl}\n`);

    // Criar cliente OAuth2
    const oauth2Client = new google.auth.OAuth2(
      settings.clientId,
      settings.clientSecret,
      redirectUrl
    );

    // Gerar URL de autorização (se isso funcionar, as credenciais estão no formato correto)
    console.log("🔄 Gerando URL de autorização...");
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar'],
      prompt: 'consent'
    });

    console.log("✅ URL gerada com sucesso!\n");
    console.log("🔗 URL completa:");
    console.log(authUrl);
    console.log();

    // Extrair parâmetros
    const urlParams = new URL(authUrl);
    const clientIdParam = urlParams.searchParams.get('client_id');
    const redirectUriParam = urlParams.searchParams.get('redirect_uri');

    console.log("📊 Análise:");
    console.log(`   Client ID na URL: ${clientIdParam}`);
    console.log(`   Client ID no banco: ${settings.clientId}`);
    console.log(`   ✓ Match: ${clientIdParam === settings.clientId ? 'SIM' : 'NÃO'}\n`);

    console.log(`   Redirect URI na URL: ${redirectUriParam}`);
    console.log(`   Redirect URI esperado: ${redirectUrl}`);
    console.log(`   ✓ Match: ${redirectUriParam === redirectUrl ? 'SIM' : 'NÃO'}\n`);

    console.log("⚠️ DIAGNÓSTICO:");
    console.log("   O erro 'invalid_client' acontece quando:");
    console.log("   1. Client Secret está incorreto");
    console.log("   2. Client ID e Client Secret não pertencem ao mesmo projeto");
    console.log("   3. O projeto foi deletado ou desabilitado no Google Cloud\n");

    console.log("✅ SOLUÇÃO:");
    console.log("   1. Vá para: https://console.cloud.google.com/apis/credentials");
    console.log("   2. Localize o Client ID: " + settings.clientId);
    console.log("   3. Verifique se ele EXISTE e está ATIVO");
    console.log("   4. Clique nele e copie o Client Secret EXATO");
    console.log("   5. Se o Client Secret estiver diferente, execute:");
    console.log("      npx tsx update-client-secret.js\n");

    console.log("💡 TESTE RÁPIDO:");
    console.log("   Cole esta URL no navegador:");
    console.log("   " + authUrl);
    console.log("   Se aparecer erro 400, o problema está nas credenciais!");

  } catch (error) {
    console.error("\n❌ Erro:", error);
  } finally {
    process.exit(0);
  }
}

validateGoogleCredentials();
