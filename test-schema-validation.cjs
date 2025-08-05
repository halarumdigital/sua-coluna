const { z } = require('zod');

// Recriar o schema de edição para testar
const editClientSchema = z.object({
  companyName: z.string().optional(),
  legalName: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  contactPhone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.union([z.string().email("Email inválido"), z.literal("")]).optional(),
  website: z.union([z.string().url("URL inválida"), z.literal("")]).optional(),
  systemPassword: z.union([z.string().min(6, "Senha deve ter pelo menos 6 caracteres"), z.literal("")]).optional(),
  cpfCnpj: z.string().optional(),
  businessSector: z.string().optional(),
  generalNotes: z.string().optional(),
});

// Testar dados válidos
const testData1 = {
  companyName: 'Empresa Teste',
  businessSector: 'Tecnologia'
};

// Testar dados com email vazio
const testData2 = {
  companyName: 'Empresa Teste',
  email: '',
  businessSector: 'Tecnologia'
};

// Testar dados com website vazio
const testData3 = {
  companyName: 'Empresa Teste',
  website: '',
  businessSector: 'Tecnologia'
};

// Testar dados com senha vazia
const testData4 = {
  companyName: 'Empresa Teste',
  systemPassword: '',
  businessSector: 'Tecnologia'
};

console.log('Testando validação do schema...');

try {
  console.log('Teste 1 (dados básicos):', editClientSchema.parse(testData1));
} catch (error) {
  console.error('Erro no teste 1:', error.errors);
}

try {
  console.log('Teste 2 (email vazio):', editClientSchema.parse(testData2));
} catch (error) {
  console.error('Erro no teste 2:', error.errors);
}

try {
  console.log('Teste 3 (website vazio):', editClientSchema.parse(testData3));
} catch (error) {
  console.error('Erro no teste 3:', error.errors);
}

try {
  console.log('Teste 4 (senha vazia):', editClientSchema.parse(testData4));
} catch (error) {
  console.error('Erro no teste 4:', error.errors);
}

console.log('Testes concluídos!');