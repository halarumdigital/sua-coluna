import { db } from "./server/db.ts";
import { googleCalendarSettings } from "./shared/schema.ts";
import { eq } from "drizzle-orm";

async function fixClientIdWhitespace() {
  try {
    console.log("🔧 Corrigindo espaços em branco no Client ID...\n");

    const settings = await db.select().from(googleCalendarSettings);

    for (const setting of settings) {
      const originalClientId = setting.clientId;
      const trimmedClientId = setting.clientId.trim();

      if (originalClientId !== trimmedClientId) {
        console.log("❌ Client ID com espaços detectado!");
        console.log(`   Original: "${originalClientId}"`);
        console.log(`   Tamanho: ${originalClientId.length} caracteres`);
        console.log(`   Corrigido: "${trimmedClientId}"`);
        console.log(`   Tamanho: ${trimmedClientId.length} caracteres`);

        await db.update(googleCalendarSettings)
          .set({
            clientId: trimmedClientId,
            updatedAt: new Date()
          })
          .where(eq(googleCalendarSettings.id, setting.id));

        console.log("   ✅ Client ID corrigido!\n");
      } else {
        console.log("✓ Client ID está OK (sem espaços)\n");
      }

      // Também verificar Client Secret
      const originalClientSecret = setting.clientSecret;
      const trimmedClientSecret = setting.clientSecret.trim();

      if (originalClientSecret !== trimmedClientSecret) {
        console.log("❌ Client Secret com espaços detectado!");
        console.log(`   Tamanho original: ${originalClientSecret.length} caracteres`);
        console.log(`   Tamanho corrigido: ${trimmedClientSecret.length} caracteres`);

        await db.update(googleCalendarSettings)
          .set({
            clientSecret: trimmedClientSecret,
            updatedAt: new Date()
          })
          .where(eq(googleCalendarSettings.id, setting.id));

        console.log("   ✅ Client Secret corrigido!\n");
      } else {
        console.log("✓ Client Secret está OK (sem espaços)\n");
      }
    }

    console.log("✅ Correção concluída!");
    console.log("\n📋 Próximo passo:");
    console.log("   Tente conectar novamente em: https://suacoluna.gilliard.dev.br/franchise/calendar");

  } catch (error) {
    console.error("❌ Erro:", error);
  } finally {
    process.exit(0);
  }
}

fixClientIdWhitespace();
