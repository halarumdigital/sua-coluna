import { db } from "./server/db.ts";
import { googleCalendarSettings } from "./shared/schema.ts";
import { eq } from "drizzle-orm";
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function updateClientSecret() {
  try {
    console.log("🔐 Atualizar Client Secret do Google Calendar\n");

    const [settings] = await db.select().from(googleCalendarSettings);

    if (!settings) {
      console.log("❌ Nenhuma configuração encontrada.");
      rl.close();
      process.exit(0);
      return;
    }

    console.log("📋 Configuração atual:");
    console.log(`   Client ID: ${settings.clientId}`);
    console.log(`   Client Secret atual: ${settings.clientSecret}\n`);

    console.log("⚠️ IMPORTANTE:");
    console.log("   O erro 'invalid_client' significa que o Client Secret está incorreto.");
    console.log("   Você precisa pegar o Client Secret correto do Google Cloud Console.\n");

    console.log("📝 Passos:");
    console.log("   1. Acesse: https://console.cloud.google.com/apis/credentials");
    console.log("   2. Localize o Client ID OAuth 2.0: " + settings.clientId);
    console.log("   3. Clique para visualizar e COPIE o Client Secret\n");

    const newSecret = await question("Cole o Client Secret correto aqui (ou pressione Enter para cancelar): ");

    if (!newSecret || newSecret.trim() === "") {
      console.log("\n❌ Operação cancelada.");
      rl.close();
      process.exit(0);
      return;
    }

    const trimmedSecret = newSecret.trim();

    console.log(`\n📊 Comparação:`);
    console.log(`   Secret antigo: ${settings.clientSecret}`);
    console.log(`   Secret novo: ${trimmedSecret}`);
    console.log(`   São iguais: ${settings.clientSecret === trimmedSecret ? 'SIM' : 'NÃO'}\n`);

    if (settings.clientSecret === trimmedSecret) {
      console.log("⚠️ O Client Secret é o mesmo! O problema pode ser outro.");
      console.log("   Verifique se o Client ID está correto no Google Cloud Console.\n");
    }

    const confirm = await question("Confirma a atualização? (s/n): ");

    if (confirm.toLowerCase() !== 's') {
      console.log("\n❌ Operação cancelada.");
      rl.close();
      process.exit(0);
      return;
    }

    await db.update(googleCalendarSettings)
      .set({
        clientSecret: trimmedSecret,
        isConnected: false,
        refreshToken: null,
        updatedAt: new Date()
      })
      .where(eq(googleCalendarSettings.id, settings.id));

    console.log("\n✅ Client Secret atualizado com sucesso!");
    console.log("\n📋 Próximos passos:");
    console.log("   1. Acesse: https://suacoluna.gilliard.dev.br/franchise/calendar");
    console.log("   2. Clique em 'Conectar com Google'");
    console.log("   3. Autorize o acesso");
    console.log("   4. Agora deve funcionar! 🎉\n");

  } catch (error) {
    console.error("\n❌ Erro:", error);
  } finally {
    rl.close();
    process.exit(0);
  }
}

updateClientSecret();
