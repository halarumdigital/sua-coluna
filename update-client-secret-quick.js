import { db } from "./server/db.ts";
import { googleCalendarSettings } from "./shared/schema.ts";
import { eq } from "drizzle-orm";

// COLE O NOVO CLIENT SECRET AQUI:
const NEW_CLIENT_SECRET = "COLE_AQUI_O_NOVO_CLIENT_SECRET";

async function updateClientSecret() {
  try {
    if (NEW_CLIENT_SECRET === "COLE_AQUI_O_NOVO_CLIENT_SECRET") {
      console.log("❌ Edite o arquivo update-client-secret-quick.js");
      console.log("   e cole o novo Client Secret na linha 6");
      console.log("   Depois execute novamente: npx tsx update-client-secret-quick.js");
      process.exit(1);
      return;
    }

    console.log("🔄 Atualizando Client Secret...\n");

    const [settings] = await db.select().from(googleCalendarSettings);

    if (!settings) {
      console.log("❌ Nenhuma configuração encontrada.");
      return;
    }

    console.log("📋 Secret antigo:", settings.clientSecret);
    console.log("📋 Secret novo:", NEW_CLIENT_SECRET);
    console.log();

    await db.update(googleCalendarSettings)
      .set({
        clientSecret: NEW_CLIENT_SECRET.trim(),
        isConnected: false,
        refreshToken: null,
        updatedAt: new Date()
      })
      .where(eq(googleCalendarSettings.id, settings.id));

    console.log("✅ Client Secret atualizado!");
    console.log("\n📋 Próximos passos:");
    console.log("   1. Acesse: https://suacoluna.gilliard.dev.br/franchise/calendar");
    console.log("   2. Clique em 'Conectar com Google'");
    console.log("   3. Deve funcionar agora! 🎉\n");

  } catch (error) {
    console.error("❌ Erro:", error);
  } finally {
    process.exit(0);
  }
}

updateClientSecret();
