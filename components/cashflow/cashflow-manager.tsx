'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calculator, 
  Calendar, 
  DollarSign, 
  Car, 
  FileText, 
  Loader2, 
  Edit, 
  Trash2, 
  Plus, 
  CreditCard,
  CheckCircle,
  Clock,
  AlertTriangle,
  User,
  Search,
  Settings
} from 'lucide-react';
import { clientOperations, serviceOperations, installmentOperations } from '@/lib/database';
import type { Client, ServiceWithInstallments } from '@/lib/supabase';
import { toast } from 'sonner';

interface Service {
  id: string;
  name: string;
  basePrice: number;
  category: string;
  isCustom?: boolean;
}

interface InstallmentPlan {
  installments: number;
  dueDate: string;
  amount: number;
  paymentMethod?: 'pix' | 'debit' | 'credit' | 'cash';
}

interface EditingInstallment {
  id: string;
  installment_number: number;
  amount: number;
  due_date: string;
  payment_method?: 'pix' | 'debit' | 'credit' | 'cash';
  status: 'pending' | 'paid' | 'overdue';
}

interface EditingService {
  id: string;
  name: string;
  basePrice: number;
  category: string;
  isCustom?: boolean;
}

export function CashflowManager() {
  const [activeTab, setActiveTab] = useState('new-service');
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<ServiceWithInstallments[]>([]);
  const [predefinedServices, setPredefinedServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<ServiceWithInstallments[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [customServiceName, setCustomServiceName] = useState('');
  const [customServicePrice, setCustomServicePrice] = useState('');
  const [installments, setInstallments] = useState(1);
  const [installmentPlan, setInstallmentPlan] = useState<InstallmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingService, setEditingService] = useState<ServiceWithInstallments | null>(null);
  const [editingInstallment, setEditingInstallment] = useState<EditingInstallment | null>(null);
  const [editingPredefinedService, setEditingPredefinedService] = useState<EditingService | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showInstallmentDialog, setShowInstallmentDialog] = useState(false);
  const [showPredefinedServiceDialog, setShowPredefinedServiceDialog] = useState(false);

  // Serviços predefinidos iniciais
  const initialPredefinedServices: Service[] = [
    { id: '1', name: 'Licenciamento Anual', basePrice: 450, category: 'Licenciamento' },
    { id: '2', name: 'Transferência de Veículo', basePrice: 890, category: 'Transferência' },
    { id: '3', name: 'IPVA', basePrice: 1200, category: 'Tributário' },
    { id: '4', name: 'DPVAT', basePrice: 156, category: 'Seguro' },
    { id: '5', name: 'Mudança de Categoria', basePrice: 320, category: 'Alteração' },
    { id: '6', name: 'CNH Digital', basePrice: 280, category: 'Habilitação' },
    { id: '7', name: 'Renovação CNH', basePrice: 380, category: 'Habilitação' },
    { id: '8', name: 'Segunda Via CNH', basePrice: 180, category: 'Habilitação' },
    { id: '9', name: 'Multa de Trânsito', basePrice: 250, category: 'Infrações' },
    { id: '10', name: 'Recurso de Multa', basePrice: 150, category: 'Infrações' },
    { id: 'custom', name: 'Serviço Personalizado', basePrice: 0, category: 'Personalizado' },
  ];

  const paymentMethods = [
    { value: 'pix', label: 'PIX', icon: '💳', color: 'bg-green-100 text-green-800' },
    { value: 'debit', label: 'Débito', icon: '💳', color: 'bg-blue-100 text-blue-800' },
    { value: 'credit', label: 'Crédito', icon: '💳', color: 'bg-purple-100 text-purple-800' },
    { value: 'cash', label: 'Dinheiro', icon: '💰', color: 'bg-yellow-100 text-yellow-800' },
  ];

  useEffect(() => {
    loadData();
    loadPredefinedServices();
  }, []);

  useEffect(() => {
    filterServices();
  }, [services, searchTerm]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [clientsData, servicesData] = await Promise.all([
        clientOperations.getAll(),
        serviceOperations.getAll()
      ]);
      setClients(clientsData);
      setServices(servicesData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const loadPredefinedServices = () => {
    // Carrega serviços predefinidos do localStorage ou usa os iniciais
    const saved = localStorage.getItem('predefinedServices');
    if (saved) {
      try {
        setPredefinedServices(JSON.parse(saved));
      } catch {
        setPredefinedServices(initialPredefinedServices);
      }
    } else {
      setPredefinedServices(initialPredefinedServices);
    }
  };

  const savePredefinedServices = (services: Service[]) => {
    localStorage.setItem('predefinedServices', JSON.stringify(services));
    setPredefinedServices(services);
  };

  const filterServices = () => {
    let filtered = services;

    if (searchTerm) {
      filtered = filtered.filter(service => 
        service.service_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.clients.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.service_category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredServices(filtered);
  };

  const selectedServiceData = predefinedServices.find(s => s.id === selectedService);
  const isCustomService = selectedService === 'custom';

  const getCurrentServicePrice = () => {
    if (isCustomService) {
      return parseFloat(customServicePrice) || 0;
    }
    return selectedServiceData?.basePrice || 0;
  };

  const getCurrentServiceName = () => {
    if (isCustomService) {
      return customServiceName || 'Serviço Personalizado';
    }
    return selectedServiceData?.name || '';
  };

  const generateInstallmentPlan = () => {
    const baseAmount = getCurrentServicePrice();
    if (!baseAmount || installments < 1) {
      toast.error('Informe um valor válido para o serviço');
      return;
    }

    const installmentAmount = baseAmount / installments;
    const plan: InstallmentPlan[] = [];

    for (let i = 0; i < installments; i++) {
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + i + 1);
      
      plan.push({
        installments: i + 1,
        dueDate: dueDate.toISOString().split('T')[0],
        amount: installmentAmount,
        paymentMethod: 'pix'
      });
    }

    setInstallmentPlan(plan);
    toast.success('Plano de parcelamento gerado!');
  };

  const handleCreateService = async () => {
    if (!selectedClient || !selectedService || installmentPlan.length === 0) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const serviceName = getCurrentServiceName();
    const servicePrice = getCurrentServicePrice();

    if (!serviceName || servicePrice <= 0) {
      toast.error('Nome e valor do serviço são obrigatórios');
      return;
    }

    setSubmitting(true);

    try {
      const serviceData = {
        client_id: selectedClient,
        service_name: serviceName,
        service_category: selectedServiceData?.category || 'Personalizado',
        total_amount: servicePrice,
        installments: installments,
        status: 'active' as const,
      };

      const installmentData = installmentPlan.map(plan => ({
        installment_number: plan.installments,
        amount: plan.amount,
        due_date: plan.dueDate,
        payment_method: plan.paymentMethod,
        status: 'pending' as const,
      }));

      await serviceOperations.create(serviceData, installmentData);

      toast.success('Serviço criado com sucesso!', {
        description: `${serviceName} foi adicionado para o cliente.`,
      });

      // Reset form
      setSelectedClient('');
      setSelectedService('');
      setCustomServiceName('');
      setCustomServicePrice('');
      setInstallments(1);
      setInstallmentPlan([]);
      
      // Reload services
      loadData();

    } catch (error) {
      console.error('Erro ao criar serviço:', error);
      toast.error('Erro ao criar serviço', {
        description: 'Não foi possível criar o serviço.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditService = (service: ServiceWithInstallments) => {
    setEditingService(service);
    setShowEditDialog(true);
  };

  const handleUpdateService = async () => {
    if (!editingService) return;

    try {
      await serviceOperations.update(editingService.id, {
        service_name: editingService.service_name,
        total_amount: editingService.total_amount,
      });

      toast.success('Serviço atualizado com sucesso!');
      setShowEditDialog(false);
      setEditingService(null);
      loadData();
    } catch (error) {
      console.error('Erro ao atualizar serviço:', error);
      toast.error('Erro ao atualizar serviço');
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('Tem certeza que deseja excluir este serviço? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      await serviceOperations.delete(serviceId);
      toast.success('Serviço excluído com sucesso!');
      loadData();
    } catch (error) {
      console.error('Erro ao excluir serviço:', error);
      toast.error('Erro ao excluir serviço');
    }
  };

  const handleEditPredefinedService = (service: Service) => {
    setEditingPredefinedService({
      id: service.id,
      name: service.name,
      basePrice: service.basePrice,
      category: service.category,
      isCustom: service.isCustom
    });
    setShowPredefinedServiceDialog(true);
  };

  const handleUpdatePredefinedService = () => {
    if (!editingPredefinedService) return;

    const updatedServices = predefinedServices.map(service => 
      service.id === editingPredefinedService.id 
        ? {
            ...service,
            name: editingPredefinedService.name,
            basePrice: editingPredefinedService.basePrice,
            category: editingPredefinedService.category
          }
        : service
    );

    savePredefinedServices(updatedServices);
    toast.success('Serviço predefinido atualizado!');
    setShowPredefinedServiceDialog(false);
    setEditingPredefinedService(null);
  };

  const handleAddNewPredefinedService = () => {
    const newService: Service = {
      id: `custom_${Date.now()}`,
      name: 'Novo Serviço',
      basePrice: 100,
      category: 'Personalizado',
      isCustom: true
    };

    const updatedServices = [...predefinedServices, newService];
    savePredefinedServices(updatedServices);
    handleEditPredefinedService(newService);
  };

  const handleDeletePredefinedService = (serviceId: string) => {
    if (serviceId === 'custom') {
      toast.error('Não é possível excluir o serviço personalizado padrão');
      return;
    }

    if (!confirm('Tem certeza que deseja excluir este serviço predefinido?')) {
      return;
    }

    const updatedServices = predefinedServices.filter(service => service.id !== serviceId);
    savePredefinedServices(updatedServices);
    toast.success('Serviço predefinido excluído!');
  };

  const handleEditInstallment = (installment: any) => {
    setEditingInstallment({
      id: installment.id,
      installment_number: installment.installment_number,
      amount: installment.amount,
      due_date: installment.due_date,
      payment_method: installment.payment_method || 'pix',
      status: installment.status
    });
    setShowInstallmentDialog(true);
  };

  const handleUpdateInstallment = async () => {
    if (!editingInstallment) return;

    try {
      await installmentOperations.update(editingInstallment.id, {
        amount: editingInstallment.amount,
        due_date: editingInstallment.due_date,
        payment_method: editingInstallment.payment_method,
      });

      toast.success('Parcela atualizada com sucesso!');
      setShowInstallmentDialog(false);
      setEditingInstallment(null);
      loadData();
    } catch (error) {
      console.error('Erro ao atualizar parcela:', error);
      toast.error('Erro ao atualizar parcela');
    }
  };

  const handleMarkAsPaid = async (installmentId: string, paymentMethod: 'pix' | 'debit' | 'credit' | 'cash') => {
    try {
      await installmentOperations.markAsPaid(installmentId, paymentMethod);
      toast.success('Parcela marcada como paga!');
      loadData();
    } catch (error) {
      console.error('Erro ao marcar parcela como paga:', error);
      toast.error('Erro ao marcar parcela como paga');
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'Licenciamento': 'bg-red-100 text-red-800 border-red-200',
      'Transferência': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Tributário': 'bg-green-100 text-green-800 border-green-200',
      'Seguro': 'bg-blue-100 text-blue-800 border-blue-200',
      'Alteração': 'bg-purple-100 text-purple-800 border-purple-200',
      'Habilitação': 'bg-orange-100 text-orange-800 border-orange-200',
      'Infrações': 'bg-pink-100 text-pink-800 border-pink-200',
      'Personalizado': 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return colors[category] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'overdue': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'overdue': return <AlertTriangle className="w-4 h-4" />;
      default: return null;
    }
  };

  const getPaymentMethodInfo = (method?: string) => {
    const paymentMethod = paymentMethods.find(pm => pm.value === method);
    return paymentMethod || { value: 'pix', label: 'PIX', icon: '💳', color: 'bg-green-100 text-green-800' };
  };

  if (loading) {
    return (
      <Card className="shadow-xl border-t-4 border-t-red-500">
        <CardContent className="text-center py-16">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-red-600" />
          <p className="text-gray-600">Carregando dados...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-xl border-t-4 border-t-red-500">
        <CardHeader className="bg-gradient-to-r from-red-50 to-yellow-50">
          <CardTitle className="flex items-center space-x-2">
            <div className="p-2 bg-red-100 rounded-full">
              <DollarSign className="w-5 h-5 text-red-600" />
            </div>
            <span className="text-gray-800">Gestão de Fluxo de Caixa</span>
          </CardTitle>
          <CardDescription className="text-gray-600">
            Controle completo de serviços, valores e parcelamentos
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 bg-gray-100">
              <TabsTrigger 
                value="new-service"
                className="data-[state=active]:bg-red-500 data-[state=active]:text-white"
                            >
                <FileText className="w-4 h-4 mr-2" />
                Serviços Cadastrados ({services.length})
              </TabsTrigger>
              <TabsTrigger 
                value="predefined-services"
                className="data-[state=active]:bg-green-500 data-[state=active]:text-white"
              >
                <Settings className="w-4 h-4 mr-2" />
                Gerenciar Serviços ({predefinedServices.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="new-service" className="space-y-6">
              {/* Formulário de Criação de Serviço */}
              <div className="space-y-6">
                {/* Seleção de Cliente e Serviço */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-gray-700 font-medium">Cliente *</Label>
                    <Select value={selectedClient} onValueChange={setSelectedClient}>
                      <SelectTrigger className="border-2 border-gray-200 focus:border-red-400">
                        <SelectValue placeholder="Selecione um cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-gray-700 font-medium">Tipo de Serviço *</Label>
                    <Select value={selectedService} onValueChange={setSelectedService}>
                      <SelectTrigger className="border-2 border-gray-200 focus:border-red-400">
                        <SelectValue placeholder="Selecione um serviço" />
                      </SelectTrigger>
                      <SelectContent>
                        {predefinedServices.map((service) => (
                          <SelectItem key={service.id} value={service.id}>
                            <div className="flex justify-between items-center w-full">
                              <span>{service.name}</span>
                              {service.id !== 'custom' && (
                                <Badge variant="outline" className={getCategoryColor(service.category)}>
                                  R$ {service.basePrice.toLocaleString('pt-BR')}
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Campos para Serviço Personalizado */}
                {isCustomService && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                    <div className="space-y-3">
                      <Label className="text-gray-700 font-medium">Nome do Serviço *</Label>
                      <Input
                        value={customServiceName}
                        onChange={(e) => setCustomServiceName(e.target.value)}
                        placeholder="Digite o nome do serviço"
                        className="border-2 border-gray-200 focus:border-red-400"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-gray-700 font-medium">Valor (R$) *</Label>
                      <Input
                        type="number"
                        value={customServicePrice}
                        onChange={(e) => setCustomServicePrice(e.target.value)}
                        placeholder="0,00"
                        min="0"
                        step="0.01"
                        className="border-2 border-gray-200 focus:border-red-400"
                      />
                    </div>
                  </div>
                )}

                {/* Valor e Parcelamento */}
                {(selectedServiceData || isCustomService) && getCurrentServicePrice() > 0 && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-6 bg-gradient-to-r from-red-50 to-yellow-50 rounded-lg border-2 border-red-200">
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-red-100 rounded-full">
                          <Car className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-800 text-lg">{getCurrentServiceName()}</h4>
                          <Badge className={getCategoryColor(selectedServiceData?.category || 'Personalizado')}>
                            {selectedServiceData?.category || 'Personalizado'}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-red-600">
                          R$ {getCurrentServicePrice().toLocaleString('pt-BR')}
                        </div>
                        <p className="text-sm text-gray-600">Valor total</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label className="text-gray-700 font-medium">Número de Parcelas</Label>
                        <Input
                          type="number"
                          min="1"
                          max="12"
                          value={installments}
                          onChange={(e) => setInstallments(parseInt(e.target.value) || 1)}
                          className="border-2 border-gray-200 focus:border-red-400"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button 
                          onClick={generateInstallmentPlan} 
                          className="w-full bg-yellow-500 hover:bg-yellow-600 text-white shadow-lg"
                        >
                          <Calendar className="w-4 h-4 mr-2" />
                          Gerar Parcelamento
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Plano de Parcelamento */}
                {installmentPlan.length > 0 && (
                  <Card className="border-t-4 border-t-yellow-500">
                    <CardHeader className="bg-gradient-to-r from-yellow-50 to-green-50">
                      <CardTitle className="flex items-center space-x-2">
                        <div className="p-2 bg-yellow-100 rounded-full">
                          <FileText className="w-5 h-5 text-yellow-600" />
                        </div>
                        <span className="text-gray-800">Plano de Parcelamento</span>
                      </CardTitle>
                      <CardDescription className="text-gray-600">
                        Configure as datas de vencimento e formas de pagamento
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        {installmentPlan.map((installment, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-4 border-2 border-gray-100 rounded-lg hover:border-yellow-300 hover:bg-yellow-50 transition-all duration-200"
                          >
                            <div className="flex items-center space-x-4">
                              <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300 font-medium">
                                {installment.installments}ª parcela
                              </Badge>
                              <div className="flex items-center space-x-2">
                                <Calendar className="w-4 h-4 text-gray-500" />
                                <Input
                                  type="date"
                                  value={installment.dueDate}
                                  onChange={(e) => {
                                    const newPlan = [...installmentPlan];
                                    newPlan[index].dueDate = e.target.value;
                                    setInstallmentPlan(newPlan);
                                  }}
                                  className="border-gray-200 focus:border-yellow-400 w-40"
                                />
                              </div>
                              <Select
                                value={installment.paymentMethod || 'pix'}
                                onValueChange={(value: 'pix' | 'debit' | 'credit' | 'cash') => {
                                  const newPlan = [...installmentPlan];
                                  newPlan[index].paymentMethod = value;
                                  setInstallmentPlan(newPlan);
                                }}
                              >
                                <SelectTrigger className="w-36 border-gray-200 focus:border-yellow-400">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {paymentMethods.map((method) => (
                                    <SelectItem key={method.value} value={method.value}>
                                      {method.icon} {method.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="text-xl font-bold text-green-600">
                              R$ {installment.amount.toLocaleString('pt-BR')}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex justify-between items-center mt-8 pt-6 border-t-2 border-gray-200">
                        <span className="text-lg font-semibold text-gray-700">Total do Serviço:</span>
                        <span className="text-2xl font-bold text-green-600">
                          R$ {getCurrentServicePrice().toLocaleString('pt-BR')}
                        </span>
                      </div>

                      <Button
                        onClick={handleCreateService}
                        className="w-full mt-6 sanleo-gradient text-white hover:opacity-90 transition-opacity shadow-lg py-3 text-lg font-semibold"
                        disabled={!selectedClient || !selectedService || submitting}
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Criando Serviço...
                          </>
                        ) : (
                          <>
                            <DollarSign className="w-5 h-5 mr-2" />
                            Confirmar Serviço
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="manage-services" className="space-y-6">
              {/* Busca e Filtros */}
              <div className="flex items-center space-x-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar por cliente, serviço ou categoria..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-2 border-gray-200 focus:border-blue-400"
                  />
                </div>
              </div>

              {/* Lista de Serviços */}
              {filteredServices.length > 0 ? (
                <div className="space-y-6">
                  {filteredServices.map((service) => (
                    <Card key={service.id} className="border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-4">
                            <div className="p-2 bg-blue-100 rounded-full">
                              <User className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-lg text-gray-800">{service.service_name}</h4>
                              <p className="text-gray-600">{service.clients.full_name}</p>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge className={getCategoryColor(service.service_category)}>
                                  {service.service_category}
                                </Badge>
                                <span className="text-sm text-gray-500">
                                  Criado em {new Date(service.created_at).toLocaleDateString('pt-BR')}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <div className="text-2xl font-bold text-blue-600">
                                R$ {service.total_amount.toLocaleString('pt-BR')}
                              </div>
                              <p className="text-sm text-gray-600">{service.installments} parcela(s)</p>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditService(service)}
                                className="border-blue-300 text-blue-600 hover:bg-blue-50"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteService(service.id)}
                                className="border-red-300 text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Parcelas */}
                        <div className="space-y-3">
                          <h5 className="font-medium text-gray-700 border-b pb-2 flex items-center">
                            <CreditCard className="w-4 h-4 mr-2" />
                            Parcelas:
                          </h5>
                          {service.service_installments.map((installment) => {
                            const paymentInfo = getPaymentMethodInfo(installment.payment_method);
                            return (
                              <div key={installment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                <div className="flex items-center space-x-3">
                                  <Badge variant="outline" className="bg-white font-medium">
                                    {installment.installment_number}ª
                                  </Badge>
                                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                                    <Calendar className="w-4 h-4" />
                                    <span>Venc: {new Date(installment.due_date).toLocaleDateString('pt-BR')}</span>
                                  </div>
                                  <Badge className={`${getStatusColor(installment.status)} flex items-center space-x-1`}>
                                    {getStatusIcon(installment.status)}
                                    <span>
                                      {installment.status === 'paid' ? 'Pago' : 
                                       installment.status === 'overdue' ? 'Atrasado' : 'Pendente'}
                                    </span>
                                  </Badge>
                                  <Badge variant="outline" className={paymentInfo.color}>
                                    {paymentInfo.icon} {paymentInfo.label}
                                  </Badge>
                                </div>
                                <div className="flex items-center space-x-3">
                                  <span className="font-bold text-gray-800">
                                    R$ {installment.amount.toLocaleString('pt-BR')}
                                  </span>
                                  <div className="flex space-x-1">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleEditInstallment(installment)}
                                      className="border-yellow-300 text-yellow-600 hover:bg-yellow-50"
                                    >
                                      <Edit className="w-3 h-3" />
                                    </Button>
                                    {installment.status !== 'paid' && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleMarkAsPaid(installment.id, installment.payment_method || 'pix')}
                                        className="border-green-300 text-green-600 hover:bg-green-50"
                                      >
                                        <CheckCircle className="w-3 h-3" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                    <FileText className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    {searchTerm ? 'Nenhum serviço encontrado' : 'Nenhum serviço cadastrado'}
                  </h3>
                  <p className="text-gray-600 mb-8 max-w-md mx-auto">
                    {searchTerm ? 'Tente ajustar os filtros de busca.' : 'Comece criando seu primeiro serviço.'}
                  </p>
                  <Button 
                    onClick={() => setActiveTab('new-service')}
                    className="sanleo-gradient text-white hover:opacity-90 transition-opacity shadow-lg"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Criar Primeiro Serviço
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="predefined-services" className="space-y-6">
              {/* Header com botão para adicionar */}
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Serviços Predefinidos</h3>
                  <p className="text-gray-600">Gerencie os serviços disponíveis para seleção</p>
                </div>
                <Button 
                  onClick={handleAddNewPredefinedService}
                  className="bg-green-500 hover:bg-green-600 text-white shadow-lg"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Serviço
                </Button>
              </div>

              {/* Lista de Serviços Predefinidos */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {predefinedServices.map((service) => (
                  <Card key={service.id} className="border-2 border-gray-200 hover:border-green-300 hover:bg-green-50 transition-all duration-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <Badge className={getCategoryColor(service.category)}>
                          {service.category}
                        </Badge>
                        {service.isCustom && (
                          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                            Personalizado
                          </Badge>
                        )}
                      </div>
                      
                      <h4 className="font-semibold text-gray-800 mb-2">{service.name}</h4>
                      
                      <div className="flex items-center justify-between">
                        <div className="text-xl font-bold text-green-600">
                          {service.id === 'custom' ? 'Variável' : `R$ ${service.basePrice.toLocaleString('pt-BR')}`}
                        </div>
                        <div className="flex space-x-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditPredefinedService(service)}
                            className="border-green-300 text-green-600 hover:bg-green-50"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          {service.id !== 'custom' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeletePredefinedService(service.id)}
                              className="border-red-300 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Dialog para Editar Serviço Cadastrado */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Serviço</DialogTitle>
            <DialogDescription>
              Altere os dados do serviço
            </DialogDescription>
          </DialogHeader>
          {editingService && (
            <div className="space-y-4">
              <div>
                <Label>Nome do Serviço</Label>
                <Input
                  value={editingService.service_name}
                  onChange={(e) => setEditingService({
                    ...editingService,
                    service_name: e.target.value
                  })}
                />
              </div>
              <div>
                <Label>Valor Total (R$)</Label>
                <Input
                  type="number"
                  value={editingService.total_amount}
                  onChange={(e) => setEditingService({
                    ...editingService,
                    total_amount: parseFloat(e.target.value) || 0
                  })}
                />
              </div>
              <div className="flex space-x-2">
                <Button onClick={handleUpdateService} className="flex-1">
                  Salvar
                </Button>
                <Button variant="outline" onClick={() => setShowEditDialog(false)} className="flex-1">
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog para Editar Serviço Predefinido */}
      <Dialog open={showPredefinedServiceDialog} onOpenChange={setShowPredefinedServiceDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Serviço Predefinido</DialogTitle>
            <DialogDescription>
              Altere os dados do serviço predefinido
            </DialogDescription>
          </DialogHeader>
          {editingPredefinedService && (
            <div className="space-y-4">
              <div>
                <Label>Nome do Serviço</Label>
                <Input
                  value={editingPredefinedService.name}
                  onChange={(e) => setEditingPredefinedService({
                    ...editingPredefinedService,
                    name: e.target.value
                  })}
                />
              </div>
              <div>
                <Label>Valor Base (R$)</Label>
                <Input
                  type="number"
                  value={editingPredefinedService.basePrice}
                  onChange={(e) => setEditingPredefinedService({
                    ...editingPredefinedService,
                    basePrice: parseFloat(e.target.value) || 0
                  })}
                  disabled={editingPredefinedService.id === 'custom'}
                />
              </div>
              <div>
                <Label>Categoria</Label>
                <Input
                  value={editingPredefinedService.category}
                  onChange={(e) => setEditingPredefinedService({
                    ...editingPredefinedService,
                    category: e.target.value
                  })}
                />
              </div>
              <div className="flex space-x-2">
                <Button onClick={handleUpdatePredefinedService} className="flex-1">
                  Salvar
                </Button>
                <Button variant="outline" onClick={() => setShowPredefinedServiceDialog(false)} className="flex-1">
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog para Editar Parcela */}
      <Dialog open={showInstallmentDialog} onOpenChange={setShowInstallmentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Parcela</DialogTitle>
            <DialogDescription>
              Altere os dados da parcela
            </DialogDescription>
          </DialogHeader>
          {editingInstallment && (
            <div className="space-y-4">
              <div>
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  value={editingInstallment.amount}
                  onChange={(e) => setEditingInstallment({
                    ...editingInstallment,
                    amount: parseFloat(e.target.value) || 0
                  })}
                />
              </div>
              <div>
                <Label>Data de Vencimento</Label>
                <Input
                  type="date"
                  value={editingInstallment.due_date}
                  onChange={(e) => setEditingInstallment({
                    ...editingInstallment,
                    due_date: e.target.value
                  })}
                />
              </div>
              <div>
                <Label>Forma de Pagamento</Label>
                <Select
                  value={editingInstallment.payment_method || 'pix'}
                  onValueChange={(value: 'pix' | 'debit' | 'credit' | 'cash') => 
                    setEditingInstallment({
                      ...editingInstallment,
                      payment_method: value
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.icon} {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex space-x-2">
                <Button onClick={handleUpdateInstallment} className="flex-1">
                  Salvar
                </Button>
                <Button variant="outline" onClick={() => setShowInstallmentDialog(false)} className="flex-1">
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}