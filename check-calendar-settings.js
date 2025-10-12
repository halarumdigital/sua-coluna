import { db } from "./server/db.ts";
import { googleCalendarSettings } from "./shared/schema.ts";

async function checkCalendarSettings() {
  try {
    console.log("🔍 Verificando configurações do Google Calendar...\n");

    const settings = await db.select().from(googleCalendarSettings);

    if (settings.length === 0) {
      console.log("❌ Nenhuma configuração de calendário encontrada.");
      return;
    }

    settings.forEach((setting, index) => {
      console.log(`\n📅 Configuração ${index + 1}:`);
      console.log(`   Franchise ID: ${setting.franchiseId}`);
      console.log(`   Is Enabled: ${setting.isEnabled}`);
      console.log(`   Is Connected: ${setting.isConnected}`);
      console.log(`   Client ID: ${setting.clientId ? '✓ Configurado' : '✗ Não configurado'}`);
      console.log(`   Client Secret: ${setting.clientSecret ? '✓ Configurado' : '✗ Não configurado'}`);
      console.log(`   Refresh Token: ${setting.refreshToken ? '✓ Configurado' : '✗ Não configurado'}`);
      console.log(`   Calendar ID: ${setting.calendarId}`);
      console.log(`   Last Sync: ${setting.lastSync || 'Nunca'}`);
      console.log(`   Created At: ${setting.createdAt}`);
      console.log(`   Updated At: ${setting.updatedAt}`);
    });

    console.log("\n✅ Verificação concluída!");

  } catch (error) {
    console.error("❌ Erro ao verificar configurações:", error);
  } finally {
    process.exit(0);
  }
}

checkCalendarSettings();
