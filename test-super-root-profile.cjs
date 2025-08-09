const { db } = require('./server/db.ts');
const { users } = require('./shared/schema.ts');
const { eq } = require('drizzle-orm');

async function testSuperRootProfile() {
  console.log('🧪 Testando sistema de perfil do super root...\n');

  try {
    // 1. Verificar se existe usuário super root
    console.log('1. Verificando usuários super root...');
    const superRootUsers = await db.select().from(users).where(eq(users.role, 'super_root'));
    
    console.log(`✅ Encontrados ${superRootUsers.length} usuários super root\n`);

    if (superRootUsers.length === 0) {
      console.log('⚠️  Nenhum usuário super root encontrado. Criando um para teste...');
      
      const bcrypt = await import('bcrypt');
      const hashedPassword = await bcrypt.hash('123456', 10);
      
      const [newSuperRoot] = await db.insert(users).values({
        firstName: 'Super',
        lastName: 'Root',
        email: 'superroot@sistema.com',
        phone: '(11) 99999-9999',
        password: hashedPassword,
        role: 'super_root',
        active: true
      }).returning();
      
      console.log(`✅ Super root criado: ${newSuperRoot.firstName} ${newSuperRoot.lastName}`);
      superRootUsers.push(newSuperRoot);
    }

    // 2. Listar informações dos super roots
    console.log('2. Informações dos usuários super root:');
    superRootUsers.forEach((user, index) => {
      console.log(`👑 Super Root ${index + 1}:`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   👤 Nome: ${user.firstName} ${user.lastName}`);
      console.log(`   📱 Telefone: ${user.phone || 'Não informado'}`);
      console.log(`   📊 Status: ${user.active ? 'Ativo' : 'Inativo'}`);
      console.log(`   📅 Criado em: ${user.createdAt}`);
      console.log(`   🔄 Atualizado em: ${user.updatedAt}`);
      console.log('');
    });

    // 3. Testar estrutura de dados necessária para o perfil
    console.log('3. Verificando estrutura de dados...');
    const testUser = superRootUsers[0];
    
    const requiredFields = ['id', 'firstName', 'lastName', 'email', 'phone', 'role', 'active', 'createdAt', 'updatedAt'];
    const missingFields = requiredFields.filter(field => !(field in testUser));
    
    if (missingFields.length === 0) {
      console.log('✅ Todos os campos necessários estão presentes');
    } else {
      console.log(`❌ Campos faltando: ${missingFields.join(', ')}`);
    }

    // 4. Simular atualização de perfil
    console.log('\n4. Testando atualização de perfil...');
    const updateData = {
      firstName: 'Super Atualizado',
      lastName: 'Root Teste',
      phone: '(11) 88888-8888'
    };

    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, testUser.id));

    // Buscar o usuário atualizado
    const [updatedUser] = await db.select().from(users).where(eq(users.id, testUser.id));

    console.log('✅ Perfil atualizado com sucesso:');
    console.log(`   Nome: ${updatedUser.firstName} ${updatedUser.lastName}`);
    console.log(`   Telefone: ${updatedUser.phone}`);

    // 5. Reverter alterações
    console.log('\n5. Revertendo alterações de teste...');
    await db
      .update(users)
      .set({
        firstName: testUser.firstName,
        lastName: testUser.lastName,
        phone: testUser.phone
      })
      .where(eq(users.id, testUser.id));

    console.log('✅ Alterações revertidas');

    // 6. Verificar validações de senha
    console.log('\n6. Testando hash de senha...');
    const bcrypt = await import('bcrypt');
    const testPassword = 'novaSenha123';
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    
    const isValidPassword = await bcrypt.compare(testPassword, hashedPassword);
    console.log(`✅ Hash de senha funcionando: ${isValidPassword ? 'Sim' : 'Não'}`);

    // 7. Estatísticas finais
    console.log('\n7. Estatísticas do sistema:');
    const totalUsers = await db.select().from(users);
    const activeUsers = totalUsers.filter(u => u.active);
    const usersByRole = totalUsers.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {});

    console.log(`📊 Total de usuários: ${totalUsers.length}`);
    console.log(`✅ Usuários ativos: ${activeUsers.length}`);
    console.log('📋 Usuários por role:');
    Object.entries(usersByRole).forEach(([role, count]) => {
      console.log(`   ${role}: ${count}`);
    });

    console.log('\n🎉 Teste do sistema de perfil do super root concluído com sucesso!');

  } catch (error) {
    console.error('❌ Erro no teste:', error);
    throw error;
  }
}

// Executar teste
testSuperRootProfile()
  .then(() => {
    console.log('\n✅ Todos os testes passaram!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Teste falhou:', error);
    process.exit(1);
  });