const mysql = require('mysql2/promise');
require('dotenv').config();

async function addSampleData() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  });

  try {
    console.log('📝 Adicionando dados de exemplo...\n');

    // 1. Pegar a franquia existente
    const [franchises] = await connection.execute(`
      SELECT id, franchise_name FROM franchises LIMIT 1
    `);

    if (franchises.length === 0) {
      console.log('❌ Nenhuma franquia encontrada');
      return;
    }

    const franchiseId = franchises[0].id;
    const franchiseName = franchises[0].franchise_name;
    console.log(`🏪 Usando franquia: ${franchiseName}`);

    // 2. Adicionar alguns clientes de exemplo
    console.log('\n👤 Adicionando clientes...');
    const clientes = [
      {
        fullName: 'João Silva Santos',
        email: 'joao.silva@email.com',
        phone: '(11) 99999-1111',
        cpfCnpj: '123.456.789-00',
        street: 'Rua das Flores',
        number: '123',
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234-567',
        notes: 'Cliente preferencial, sempre pede pizza margherita'
      },
      {
        fullName: 'Maria Oliveira Costa',
        email: 'maria.costa@email.com',
        phone: '(11) 99999-2222',
        cpfCnpj: '987.654.321-00',
        street: 'Av. Paulista',
        number: '456',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100',
        notes: 'Gosta de pizzas doces, cliente desde 2023'
      },
      {
        fullName: 'Pedro Ferreira Lima',
        email: 'pedro.lima@email.com',
        phone: '(11) 99999-3333',
        street: 'Rua Augusta',
        number: '789',
        neighborhood: 'Consolação',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01305-000',
        notes: 'Sempre pede delivery, mora próximo'
      }
    ];

    for (const cliente of clientes) {
      try {
        await connection.execute(`
          INSERT INTO clients (
            franchise_id, full_name, email, phone, cpf_cnpj,
            street, number, neighborhood, city, state, zip_code, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          franchiseId, cliente.fullName, cliente.email, cliente.phone, cliente.cpfCnpj,
          cliente.street, cliente.number, cliente.neighborhood, cliente.city, cliente.state, cliente.zipCode, cliente.notes
        ]);
        console.log(`✅ Cliente ${cliente.fullName} adicionado`);
      } catch (error) {
        console.log(`⚠️  Erro ao adicionar cliente ${cliente.fullName}:`, error.message);
      }
    }

    // 3. Adicionar números de telefone da franquia
    console.log('\n📞 Adicionando números de telefone...');
    const numeros = [
      { phoneNumber: '(11) 3333-4444', isPrimary: true },
      { phoneNumber: '(11) 99999-5555', isPrimary: false },
      { phoneNumber: '(11) 99999-6666', isPrimary: false }
    ];

    for (const numero of numeros) {
      try {
        await connection.execute(`
          INSERT INTO franchise_phone_numbers (franchise_id, phone_number, is_primary)
          VALUES (?, ?, ?)
        `, [franchiseId, numero.phoneNumber, numero.isPrimary]);
        console.log(`✅ Número ${numero.phoneNumber} adicionado ${numero.isPrimary ? '(Principal)' : ''}`);
      } catch (error) {
        console.log(`⚠️  Erro ao adicionar número ${numero.phoneNumber}:`, error.message);
      }
    }

    // 4. Adicionar agentes da franquia
    console.log('\n👨‍💼 Adicionando agentes...');
    const agentes = [
      {
        name: 'Ana Carolina Vendas',
        email: 'ana.vendas@pizzaria.com',
        phone: '(11) 99999-7777',
        department: 'Vendas',
        specialties: JSON.stringify(['Atendimento ao Cliente', 'Vendas por Telefone', 'Promoções'])
      },
      {
        name: 'Carlos Suporte Técnico',
        email: 'carlos.suporte@pizzaria.com',
        phone: '(11) 99999-8888',
        department: 'Suporte',
        specialties: JSON.stringify(['Suporte Técnico', 'Resolução de Problemas', 'Delivery'])
      },
      {
        name: 'Fernanda Gerente',
        email: 'fernanda.gerente@pizzaria.com',
        phone: '(11) 99999-9999',
        department: 'Gerência',
        specialties: JSON.stringify(['Gestão', 'Atendimento VIP', 'Reclamações'])
      }
    ];

    for (const agente of agentes) {
      try {
        await connection.execute(`
          INSERT INTO franchise_agents (franchise_id, name, email, phone, department, specialties)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [franchiseId, agente.name, agente.email, agente.phone, agente.department, agente.specialties]);
        console.log(`✅ Agente ${agente.name} adicionado (${agente.department})`);
      } catch (error) {
        console.log(`⚠️  Erro ao adicionar agente ${agente.name}:`, error.message);
      }
    }

    // 5. Adicionar prompts de atendimento
    console.log('\n💬 Adicionando prompts de atendimento...');
    const prompts = [
      {
        name: 'Saudação Inicial',
        description: 'Prompt para saudação inicial do cliente',
        prompt: 'Olá! Bem-vindo à Jéssica e Pietra Pizzaria! 🍕 Como posso ajudá-lo hoje? Temos promoções especiais e nosso cardápio completo disponível!',
        category: 'Atendimento',
        isDefault: true
      },
      {
        name: 'Cardápio e Preços',
        description: 'Informações sobre cardápio e preços',
        prompt: 'Nosso cardápio inclui pizzas tradicionais, gourmet e doces! Pizzas grandes a partir de R$ 35,90. Gostaria de conhecer nossas promoções do dia?',
        category: 'Vendas',
        isDefault: false
      },
      {
        name: 'Informações de Delivery',
        description: 'Detalhes sobre entrega',
        prompt: 'Fazemos delivery em toda a região! Taxa de entrega R$ 5,00. Tempo médio: 30-45 minutos. Qual seu endereço para confirmarmos se atendemos sua área?',
        category: 'Delivery',
        isDefault: false
      },
      {
        name: 'Promoções',
        description: 'Informações sobre promoções atuais',
        prompt: 'Temos promoções imperdíveis! 🎉 2 pizzas grandes por R$ 59,90 ou pizza família + refrigerante 2L por R$ 45,90. Qual promoção te interessa?',
        category: 'Vendas',
        isDefault: false
      },
      {
        name: 'Suporte e Reclamações',
        description: 'Atendimento para problemas e reclamações',
        prompt: 'Lamento pelo inconveniente! Vamos resolver isso rapidamente. Pode me contar o que aconteceu? Estou aqui para ajudar e garantir sua satisfação.',
        category: 'Suporte',
        isDefault: false
      }
    ];

    for (const prompt of prompts) {
      try {
        await connection.execute(`
          INSERT INTO franchise_prompts (franchise_id, name, description, prompt, category, is_default)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [franchiseId, prompt.name, prompt.description, prompt.prompt, prompt.category, prompt.isDefault]);
        console.log(`✅ Prompt "${prompt.name}" adicionado (${prompt.category})`);
      } catch (error) {
        console.log(`⚠️  Erro ao adicionar prompt "${prompt.name}":`, error.message);
      }
    }

    console.log('\n🎉 Dados de exemplo adicionados com sucesso!');
    console.log('\n📊 Resumo dos dados adicionados:');
    console.log(`   👤 ${clientes.length} clientes`);
    console.log(`   📞 ${numeros.length} números de telefone`);
    console.log(`   👨‍💼 ${agentes.length} agentes`);
    console.log(`   💬 ${prompts.length} prompts de atendimento`);

  } catch (error) {
    console.error('❌ Erro ao adicionar dados de exemplo:', error);
  } finally {
    await connection.end();
  }
}

addSampleData();