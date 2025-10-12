import { db } from "./server/db.ts";
import { googleCalendarSettings } from "./shared/schema.ts";
import { eq } from "drizzle-orm";

async function fixCalendarConnection() {
  try {
    console.log("🔧 Corrigindo status de conexão do Google Calendar...\n");

    // Buscar todas as configurações com refresh token mas is_connected = false
    const settings = await db.select().from(googleCalendarSettings);

    for (const setting of settings) {
      if (setting.refreshToken && !setting.isConnected) {
        console.log(`📅 Franquia: ${setting.franchiseId}`);
        console.log(`   Status atual: isConnected = false`);
        console.log(`   Refresh Token: ✓ Presente`);
        console.log(`   Atualizando isConnected para true...`);

        await db.update(googleCalendarSettings)
          .set({
            isConnected: true,
            lastSync: new Date(),
            updatedAt: new Date()
          })
          .where(eq(googleCalendarSettings.id, setting.id));

        console.log(`   ✅ Atualizado com sucesso!\n`);
      } else if (setting.isConnected) {
        console.log(`✓ Franquia ${setting.franchiseId} já está conectada corretamente.\n`);
      } else {
        console.log(`⚠️ Franquia ${setting.franchiseId} não tem refresh token, conexão não será estabelecida.\n`);
      }
    }

    console.log("✅ Correção concluída!");

  } catch (error) {
    console.error("❌ Erro ao corrigir configurações:", error);
  } finally {
    process.exit(0);
  }
}

fixCalendarConnection();
