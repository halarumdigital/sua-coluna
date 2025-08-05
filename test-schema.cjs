// Test the schema validation
const { z } = require('zod');

// Recreate the schema for testing
const createClientSchema = z.object({
  // Dados básicos da empresa
  companyName: z.string().min(1, "Nome fantasia é obrigatório"),
  legalName: z.string().min(1, "Razão social é obrigatória"),
  
  // Endereço completo
  street: z.string().min(1, "Rua é obrigatória"),
  number: z.string().min(1, "Número é obrigatório"),
  complement: z.string().optional(),
  neighborhood: z.string().min(1, "Bairro é obrigatório"),
  city: z.string().min(1, "Cidade é obrigatória"),
  state: z.string().min(1, "Estado é obrigatório"),
  zipCode: z.string().min(1, "CEP é obrigatório"),
  
  // Contatos
  contactPhone: z.string().min(1, "Telefone de contato é obrigatório"),
  whatsapp: z.string().optional(),
  email: z.string().email("Email inválido"),
  website: z.string().url("URL inválida").optional().or(z.literal("")),
  
  // Senha para acesso ao sistema
  systemPassword: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  
  // Campos opcionais
  cpfCnpj: z.string().optional(),
  businessSector: z.string().optional(),
  generalNotes: z.string().optional(),
});

async function testSchema() {
  try {
    console.log('Testando validação do schema...');
    
    const testData = {
      companyName: "Empresa Teste API",
      legalName: "Empresa Teste API Sociedade Limitada",
      street: "Rua da API",
      number: "456",
      complement: "Andar 2",
      neighborhood: "Tech District",
      city: "São Paulo",
      state: "SP",
      zipCode: "01234-567",
      contactPhone: "(11) 99999-1234",
      whatsapp: "(11) 88888-1234",
      email: "api@empresateste.com",
      website: "https://www.empresatesteapi.com",
      systemPassword: "123456",
      cpfCnpj: "98.765.432/0001-10",
      businessSector: "Tecnologia da Informação",
      generalNotes: "Cliente criado via API para teste"
    };
    
    const validatedData = createClientSchema.parse(testData);
    console.log('✅ Schema válido!');
    console.log('Dados validados:', validatedData);
    
  } catch (error) {
    console.error('❌ Erro de validação:', error.errors || error.message);
  }
}

testSchema();