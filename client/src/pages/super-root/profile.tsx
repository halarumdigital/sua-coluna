import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Crown, User, Mail, Phone, Lock, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface ProfileData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ProfileFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const defaultFormData: ProfileFormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

export default function SuperRootProfile() {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [formData, setFormData] = useState<ProfileFormData>(defaultFormData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/super-root/profile', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setProfileData(data);
        setFormData({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || '',
          phone: data.phone || '',
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else {
        toast.error('Erro ao carregar perfil');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Erro ao carregar perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Validações básicas
      if (!formData.firstName.trim()) {
        toast.error('Nome é obrigatório');
        return;
      }

      if (!formData.lastName.trim()) {
        toast.error('Sobrenome é obrigatório');
        return;
      }

      if (!formData.email.trim()) {
        toast.error('Email é obrigatório');
        return;
      }

      if (!formData.phone.trim()) {
        toast.error('Telefone é obrigatório');
        return;
      }

      // Validações de senha
      if (formData.newPassword) {
        if (!formData.currentPassword) {
          toast.error('Para alterar a senha, informe a senha atual');
          return;
        }

        if (formData.newPassword.length < 6) {
          toast.error('Nova senha deve ter pelo menos 6 caracteres');
          return;
        }

        if (formData.newPassword !== formData.confirmPassword) {
          toast.error('Confirmação de senha não confere');
          return;
        }
      }

      const response = await fetch('/api/super-root/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success('Perfil atualizado com sucesso!');
        // Limpar campos de senha
        setFormData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        }));
        // Recarregar dados do perfil
        fetchProfile();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Erro ao atualizar perfil');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Erro ao atualizar perfil');
    } finally {
      setSaving(false);
    }
  };

  const getUserInitials = () => {
    if (profileData?.firstName && profileData?.lastName) {
      return `${profileData.firstName[0]}${profileData.lastName[0]}`.toUpperCase();
    }
    if (profileData?.email) {
      return profileData.email[0].toUpperCase();
    }
    return "SR";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Layout title="Meu Perfil">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Meu Perfil">
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Meu Perfil
          </h2>
          <p className="text-gray-600">
            Gerencie suas informações pessoais e configurações de conta
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Profile Info Card */}
          <div className="xl:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informações do Usuário</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <Avatar className="w-24 h-24 mx-auto">
                  <AvatarImage
                    src={profileData?.profileImageUrl || ""}
                    alt="Profile"
                    className="object-cover"
                  />
                  <AvatarFallback className="text-xl bg-blue-100 text-blue-600">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {profileData?.firstName} {profileData?.lastName}
                  </h3>
                  <p className="text-sm text-gray-600">{profileData?.email}</p>
                </div>
                
                <div className="p-3 bg-purple-50 rounded-lg">
                  <Crown className="w-5 h-5 mx-auto mb-1 text-purple-600" />
                  <p className="text-sm font-medium text-purple-800">Super Root</p>
                </div>

                {profileData && (
                  <div className="pt-4 border-t text-left space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User className="h-4 w-4" />
                      <span>ID: {profileData.id}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>Status: </span>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        profileData.active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {profileData.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      <p>Criado em: {formatDate(profileData.createdAt)}</p>
                      <p>Atualizado em: {formatDate(profileData.updatedAt)}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Profile Form */}
          <div className="xl:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Editar Perfil</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Dados Pessoais */}
                  <div>
                    <h3 className="text-base font-medium text-gray-900 mb-4">Dados Pessoais</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">Nome</Label>
                        <Input
                          id="firstName"
                          value={formData.firstName}
                          onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                          required
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="lastName">Sobrenome</Label>
                        <Input
                          id="lastName"
                          value={formData.lastName}
                          onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Contatos */}
                  <div>
                    <h3 className="text-base font-medium text-gray-900 mb-4">Informações de Contato</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                            className="pl-10"
                            required
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="phone">Telefone</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="phone"
                            value={formData.phone}
                            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                            className="pl-10"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Alterar Senha */}
                  <div>
                    <h3 className="text-base font-medium text-gray-900 mb-4">Alterar Senha</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Deixe os campos em branco se não quiser alterar a senha
                    </p>
                    
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="currentPassword">Senha Atual</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="currentPassword"
                            type={showCurrentPassword ? "text" : "password"}
                            value={formData.currentPassword}
                            onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
                            className="pl-10 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                          >
                            {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="newPassword">Nova Senha</Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              id="newPassword"
                              type={showNewPassword ? "text" : "password"}
                              value={formData.newPassword}
                              onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                              className="pl-10 pr-10"
                              minLength={6}
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                            >
                              {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                        
                        <div>
                          <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              id="confirmPassword"
                              type={showConfirmPassword ? "text" : "password"}
                              value={formData.confirmPassword}
                              onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                              className="pl-10 pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                            >
                              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end pt-4 border-t">
                    <Button 
                      type="submit" 
                      disabled={saving}
                      className="w-full sm:w-auto"
                    >
                      {saving ? "Salvando..." : "Salvar Alterações"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}