import { db } from "./server/db.ts";
import { googleCalendarSettings } from "./shared/schema.ts";
import { eq } from "drizzle-orm";

async function resetGoogleCalendarConnection() {
  try {
    console.log("🔄 Resetando conexão do Google Calendar...\n");

    // Buscar configurações
    const settings = await db.select().from(googleCalendarSettings);

    if (settings.length === 0) {
      console.log("❌ Nenhuma configuração encontrada.");
      return;
    }

    for (const setting of settings) {
      console.log(`📅 Franquia: ${setting.franchiseId}`);
      console.log(`   Client ID: ${setting.clientId?.substring(0, 20)}...`);
      console.log(`   Removendo refresh token antigo...`);

      await db.update(googleCalendarSettings)
        .set({
          refreshToken: null,
          isConnected: false,
          lastSync: null,
          updatedAt: new Date()
        })
        .where(eq(googleCalendarSettings.id, setting.id));

      console.log(`   ✅ Refresh token removido!\n`);
    }

    console.log("✅ Conexão resetada com sucesso!");
    console.log("\n📋 PRÓXIMOS PASSOS:");
    console.log("   1. Acesse: http://localhost:5000/franchise/calendar");
    console.log("   2. Clique em 'Conectar com Google'");
    console.log("   3. Autorize o acesso à sua conta Google");
    console.log("   4. Um novo refresh token será gerado automaticamente");
    console.log("\n⚠️ IMPORTANTE:");
    console.log("   Certifique-se de que o Client ID e Client Secret estão corretos");
    console.log("   no Google Cloud Console antes de reconectar!");

  } catch (error) {
    console.error("❌ Erro ao resetar configurações:", error);
  } finally {
    process.exit(0);
  }
}

resetGoogleCalendarConnection();
