require('dotenv').config();
const mysql = require('mysql2/promise');

async function monitorActivity() {
  console.log('👀 Monitorando atividade do agente IA...');
  
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
  });
  
  // Verificar se tabela de logs existe
  try {
    const [logs] = await conn.execute(`
      SELECT * FROM ai_usage_logs 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    if (logs.length > 0) {
      console.log(`📊 ${logs.length} atividade(s) recente(s) encontrada(s):`);
      logs.forEach((log, index) => {
        console.log(`   ${index + 1}. ${log.created_at}`);
        console.log(`      Cliente: ${log.client_id}`);
        console.log(`      Tokens: ${log.prompt_tokens} + ${log.completion_tokens} = ${log.total_tokens}`);
        console.log(`      Custo: $${log.cost}`);
        console.log(`      Modelo: ${log.model}`);
      });
    } else {
      console.log('ℹ️  Nenhuma atividade de IA registrada ainda');
      console.log('💡 Envie uma mensagem no WhatsApp para testar o agente');
    }
  } catch (error) {
    console.log('ℹ️  Tabela de logs ainda não existe');
    console.log('💡 Será criada automaticamente quando o agente processar a primeira mensagem');
  }
  
  await conn.end();
  console.log('\n📱 Para testar: envie uma mensagem para o WhatsApp 5549991016846');
  console.log('🤖 O agente deve responder automaticamente usando IA');
}

monitorActivity().catch(console.error);