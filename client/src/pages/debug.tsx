import { useAuth } from "@/hooks/useAuth";

export default function Debug() {
  const { user, isLoading, isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Debug - Informações de Autenticação</h1>
        
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Status da Autenticação</h2>
          <div className="space-y-2">
            <p><strong>isLoading:</strong> {isLoading ? 'true' : 'false'}</p>
            <p><strong>isAuthenticated:</strong> {isAuthenticated ? 'true' : 'false'}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Dados do Usuário</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>

        <div className="mt-6 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Redirecionamento</h2>
          <p>Com base no role do usuário, o sistema deveria redirecionar para:</p>
          <div className="mt-2">
            {user?.role === 'super_root' && (
              <p className="text-green-600 font-semibold">✅ Super Root Dashboard (/super-root)</p>
            )}
            {(user?.role === 'franchisor' || user?.role === 'admin') && (
              <p className="text-blue-600 font-semibold">✅ Franchisor Dashboard (/admin)</p>
            )}
            {(user?.role === 'franchise' || user?.role === 'client') && (
              <p className="text-purple-600 font-semibold">✅ Franchise Dashboard (/client)</p>
            )}
            {user?.role === 'team' && (
              <p className="text-orange-600 font-semibold">✅ Team Dashboard (/team)</p>
            )}
            {!user?.role && (
              <p className="text-red-600 font-semibold">❌ Nenhum role definido</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}