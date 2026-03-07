import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { BarChart3, Zap, Settings, Users } from "lucide-react";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Vehicle Prospect System
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                Monitore anúncios de veículos, identifique oportunidades e gerencie seus leads com inteligência
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <Button 
                  size="lg" 
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => navigate("/login")}
                >
                  Entrar com Usuário/Senha
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={() => navigate("/register")}
                >
                  Criar Conta
                </Button>
              </div>

              {/* Manus OAuth button - only show if configured */}
              {import.meta.env.VITE_OAUTH_PORTAL_URL && (
                <div className="mb-8">
                  <p className="text-gray-600 mb-4">ou</p>
                  <a href={getLoginUrl()}>
                    <Button size="lg" variant="secondary">
                      Entrar com Manus
                    </Button>
                  </a>
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-12">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    Coleta Automática
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Colete anúncios de múltiplas fontes (OLX, Mercado Livre, Webmotors, iCarros, SóCarrão) automaticamente com agendamento configurável.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-500" />
                    Scoring Inteligente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Priorize leads com base em múltiplos fatores: preço, urgência, localização e características do veículo.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-green-500" />
                    Filtros Configuráveis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Crie filtros personalizados por marca, modelo, preço, quilometragem, localização e muito mais.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-500" />
                    Multi-usuário
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Gerencie múltiplos usuários com diferentes níveis de acesso (admin, analyst, viewer).
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Funcionalidades Principais</h2>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start gap-3">
                  <span className="text-blue-600 font-bold">✓</span>
                  <span>Painel de controle com estatísticas em tempo real</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-600 font-bold">✓</span>
                  <span>Deduplicação inteligente de anúncios</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-600 font-bold">✓</span>
                  <span>Histórico de preços e mudanças</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-600 font-bold">✓</span>
                  <span>Exportação de dados (CSV, Excel)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-600 font-bold">✓</span>
                  <span>Notificações de leads de alta prioridade</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-600 font-bold">✓</span>
                  <span>Logs de atividade e auditoria</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Bem-vindo, {user?.name || "Usuário"}!
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Você está pronto para começar a gerenciar seus leads
            </p>
            <Button
              size="lg"
              onClick={() => navigate("/dashboard")}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Ir para o Painel
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Próximos Passos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-600">
                <p>1. Configure seus filtros de busca</p>
                <p>2. Defina as regras de scoring</p>
                <p>3. Inicie a coleta de anúncios</p>
                <p>4. Analise e gerencie seus leads</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Documentação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-gray-600">Acesse a documentação para aprender mais sobre:</p>
                <ul className="list-disc list-inside text-gray-600">
                  <li>Configuração de filtros</li>
                  <li>Scoring de leads</li>
                  <li>Exportação de dados</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Suporte</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-600">
                <p>Precisa de ajuda? Entre em contato com o suporte.</p>
                <p>Email: support@vehicleprospect.com</p>
                <p>Docs: docs.vehicleprospect.com</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
