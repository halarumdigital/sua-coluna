import { db } from "./server/db.ts";
import { googleCalendarSettings } from "./shared/schema.ts";

async function checkClientSecretValue() {
  try {
    console.log("🔍 Verificando valor do Client Secret...\n");

    const [settings] = await db.select().from(googleCalendarSettings);

    if (!settings) {
      console.log("❌ Nenhuma configuração encontrada.");
      return;
    }

    console.log("📋 Client Secret:");
    console.log(`   Primeiros 20 caracteres: ${settings.clientSecret?.substring(0, 20)}`);
    console.log(`   Últimos 10 caracteres: ${settings.clientSecret?.substring(settings.clientSecret.length - 10)}`);
    console.log(`   Tamanho total: ${settings.clientSecret?.length} caracteres`);
    console.log(`   É igual a "********": ${settings.clientSecret === "********" ? "SIM ❌" : "NÃO ✓"}`);

    if (settings.clientSecret === "********") {
      console.log("\n⚠️ PROBLEMA DETECTADO!");
      console.log("   O Client Secret foi salvo como '********' (máscara).");
      console.log("   Você precisa digitar o Client Secret real novamente na interface.");
    } else {
      console.log("\n✅ Client Secret parece estar correto!");
    }

  } catch (error) {
    console.error("❌ Erro:", error);
  } finally {
    process.exit(0);
  }
}

checkClientSecretValue();
