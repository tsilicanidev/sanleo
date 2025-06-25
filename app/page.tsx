'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OverduePaymentsModal } from '@/components/cashflow/overdue-payments-modal';
import { ClientForm } from '@/components/clients/client-form';
import { ClientList } from '@/components/clients/client-list';
import { CashflowManager } from '@/components/cashflow/cashflow-manager';
import { ReportsManager } from '@/components/reports/reports-manager';
import { Toaster } from '@/components/ui/sonner';
import { 
  Users, 
  DollarSign, 
  FileText, 
  TrendingUp, 
  Calendar,
  Phone,
  ExternalLink,
  Plus,
  AlertTriangle,
  CheckCircle,
  Clock,
  Car,
  Shield,
  BarChart3,
  Loader2
} from 'lucide-react';
import Image from 'next/image';
import { dashboardOperations } from '@/lib/database';
import type { ServiceWithInstallments } from '@/lib/supabase';
import { toast } from 'sonner';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showOverdueModal, setShowOverdueModal] = useState(false);
  const [showClientForm, setShowClientForm] = useState(false);
  const [stats, setStats] = useState({
    totalClients: 0,
    monthlyRevenue: 0,
    pendingServices: 0,
    overduePayments: 0
  });
  const [recentServices, setRecentServices] = useState<ServiceWithInstallments[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsData, servicesData] = await Promise.all([
        dashboardOperations.getStats(),
        dashboardOperations.getRecentServices(5)
      ]);
      
      setStats(statsData);
      setRecentServices(servicesData);
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
      toast.error('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

  const quickLinks = [
    { name: 'Detran SP', url: 'https://www.detran.sp.gov.br', icon: Shield, color: 'bg-red-500' },
    { name: 'Renavam', url: 'https://www.gov.br/pt-br/servicos/consultar-situacao-do-veiculo', icon: Car, color: 'bg-yellow-500' },
    { name: 'Secretaria da Fazenda', url: 'https://www.fazenda.sp.gov.br', icon: DollarSign, color: 'bg-green-500' },
    { name: 'Receita Federal', url: 'https://www.gov.br/receitafederal/pt-br', icon: FileText, color: 'bg-blue-500' },
  ];

  const getServiceStatus = (service: ServiceWithInstallments) => {
    const pendingInstallments = service.service_installments.filter(i => i.status === 'pending');
    const overdueInstallments = service.service_installments.filter(i => i.status === 'overdue');
    const paidInstallments = service.service_installments.filter(i => i.status === 'paid');

    if (overdueInstallments.length > 0) return { status: 'atrasado', color: 'bg-red-100 text-red-800 border-red-200' };
    if (pendingInstallments.length > 0) return { status: 'pendente', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
    if (paidInstallments.length === service.service_installments.length) return { status: 'pago', color: 'bg-green-100 text-green-800 border-green-200' };
    return { status: 'pendente', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pago': return <CheckCircle className="w-4 h-4" />;
      case 'pendente': return <Clock className="w-4 h-4" />;
      case 'atrasado': return <AlertTriangle className="w-4 h-4" />;
      default: return null;
    }
  };

  const handleNewClient = () => {
    setShowClientForm(true);
    setActiveTab('clients');
  };

  const handleClientFormSuccess = () => {
    setShowClientForm(false);
    loadDashboardData(); // Refresh dashboard data
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-lg border-b-2 border-red-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Image
                  src="/image.png"
                  alt="SanLéo Logo"
                  width={75}
                  height={75}
                  className="object-contain"
                  priority
                />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-2xl font-bold sanleo-red">
                  SanLéo
                </h1>
                <p className="text-sm sanleo-yellow font-medium">
                  Soluções em Trânsito
                </p>
              </div>
            </div>
            <Button 
              onClick={handleNewClient}
              className="sanleo-gradient text-white hover:opacity-90 transition-opacity shadow-lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Cliente
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-5 bg-white shadow-md border-2 border-gray-200">
            <TabsTrigger 
              value="dashboard" 
              className="data-[state=active]:bg-red-500 data-[state=active]:text-white font-medium"
            >
              Dashboard
            </TabsTrigger>
            <TabsTrigger 
              value="clients"
              className="data-[state=active]:bg-red-500 data-[state=active]:text-white font-medium"
            >
              Clientes
            </TabsTrigger>
            <TabsTrigger 
              value="cashflow"
              className="data-[state=active]:bg-red-500 data-[state=active]:text-white font-medium"
            >
              Fluxo de Caixa
            </TabsTrigger>
            <TabsTrigger 
              value="links"
              className="data-[state=active]:bg-red-500 data-[state=active]:text-white font-medium"
            >
              Links Rápidos
            </TabsTrigger>
            <TabsTrigger 
              value="reports" 
              className="hidden lg:flex data-[state=active]:bg-red-500 data-[state=active]:text-white font-medium"
            >
              Relatórios
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {loading ? (
              <div className="text-center py-16">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-red-600" />
                <p className="text-gray-600">Carregando dados do dashboard...</p>
              </div>
            ) : (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card className="border-l-4 border-l-red-500 shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-gray-700">Total de Clientes</CardTitle>
                      <div className="p-2 bg-red-100 rounded-full">
                        <Users className="h-5 w-5 text-red-600" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-red-600">{stats.totalClients}</div>
                      <p className="text-xs text-green-600 font-medium mt-1">
                        Clientes cadastrados
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-yellow-500 shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-gray-700">Receita Mensal</CardTitle>
                      <div className="p-2 bg-yellow-100 rounded-full">
                        <DollarSign className="h-5 w-5 text-yellow-600" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-yellow-600">
                        R$ {stats.monthlyRevenue.toLocaleString('pt-BR')}
                      </div>
                      <p className="text-xs text-green-600 font-medium mt-1">
                        Pagamentos recebidos
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-blue-500 shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-gray-700">Serviços Pendentes</CardTitle>
                      <div className="p-2 bg-blue-100 rounded-full">
                        <Calendar className="h-5 w-5 text-blue-600" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-blue-600">{stats.pendingServices}</div>
                      <p className="text-xs text-yellow-600 font-medium mt-1">
                        Parcelas pendentes
                      </p>
                    </CardContent>
                  </Card>

                  <Card 
                    className="border-l-4 border-l-red-500 shadow-lg hover:shadow-xl transition-shadow cursor-pointer hover:bg-red-50"
                    onClick={() => setShowOverdueModal(true)}
                  >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-gray-700">Pagamentos Atrasados</CardTitle>
                      <div className="p-2 bg-red-100 rounded-full">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-red-600">{stats.overduePayments}</div>
                      <p className="text-xs text-red-600 font-medium mt-1">
                        Clique para gerenciar cobranças
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Services */}
                <Card className="shadow-lg border-t-4 border-t-red-500">
                  <CardHeader className="bg-gradient-to-r from-red-50 to-yellow-50">
                    <CardTitle className="flex items-center space-x-2">
                      <BarChart3 className="w-5 h-5 text-red-600" />
                      <span className="text-gray-800">Serviços Recentes</span>
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      Últimos serviços cadastrados no sistema
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    {recentServices.length > 0 ? (
                      <div className="space-y-4">
                        {recentServices.map((service) => {
                          const serviceStatus = getServiceStatus(service);
                          return (
                            <div key={service.id} className="flex items-center justify-between p-4 border-2 border-gray-100 rounded-lg hover:border-red-200 hover:bg-red-50 transition-all duration-200">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3">
                                  <span className="font-semibold text-gray-800">{service.clients.full_name}</span>
                                  <Badge variant="outline" className="border-yellow-300 text-yellow-700 bg-yellow-50">
                                    {service.service_name}
                                  </Badge>
                                </div>
                                <div className="text-sm text-gray-500 mt-1 flex items-center space-x-2">
                                  <Calendar className="w-4 h-4" />
                                  <span>{new Date(service.created_at).toLocaleDateString('pt-BR')}</span>
                                </div>
                              </div>
                              <div className="flex items-center space-x-4">
                                <span className="font-bold text-lg text-gray-800">
                                  R$ {service.total_amount.toLocaleString('pt-BR')}
                                </span>
                                <Badge className={`${serviceStatus.color} border font-medium`}>
                                  <div className="flex items-center space-x-1">
                                    {getStatusIcon(serviceStatus.status)}
                                    <span className="capitalize">{serviceStatus.status}</span>
                                  </div>
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">Nenhum serviço cadastrado ainda</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="clients">
            {showClientForm ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setShowClientForm(false)}
                    className="border-gray-300 hover:bg-gray-50"
                  >
                    ← Voltar para Lista
                  </Button>
                </div>
                <ClientForm onSuccess={handleClientFormSuccess} />
              </div>
            ) : (
              <ClientList onNewClient={() => setShowClientForm(true)} />
            )}
          </TabsContent>

          <TabsContent value="cashflow">
            <CashflowManager />
          </TabsContent>

          <TabsContent value="links">
            <Card className="shadow-lg border-t-4 border-t-blue-500">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-red-50">
                <CardTitle className="flex items-center space-x-2">
                  <ExternalLink className="w-5 h-5 text-blue-600" />
                  <span className="text-gray-800">Links Rápidos</span>
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Acesso rápido aos principais portais governamentais
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {quickLinks.map((link, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="h-24 flex flex-col items-center justify-center space-y-3 border-2 hover:border-red-300 hover:bg-red-50 transition-all duration-200 shadow-md hover:shadow-lg"
                      onClick={() => window.open(link.url, '_blank')}
                    >
                      <div className={`p-2 ${link.color} rounded-full`}>
                        <link.icon className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-sm font-semibold text-gray-700">{link.name}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <ReportsManager />
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal de Pagamentos Atrasados */}
      <OverduePaymentsModal 
        isOpen={showOverdueModal}
        onClose={() => setShowOverdueModal(false)}
        overdueCount={stats.overduePayments}
      />

      {/* Toast Notifications */}
      <Toaster 
        position="top-right"
        richColors
        closeButton
      />
    </div>
  );
}