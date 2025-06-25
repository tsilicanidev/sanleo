'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Users, 
  Search, 
  Phone, 
  Mail, 
  MapPin, 
  FileText,
  Edit,
  Trash2,
  Plus,
  Loader2
} from 'lucide-react';
import { clientOperations } from '@/lib/database';
import type { ClientWithDocuments } from '@/lib/supabase';
import { toast } from 'sonner';

interface ClientListProps {
  onNewClient: () => void;
}

export function ClientList({ onNewClient }: ClientListProps) {
  const [clients, setClients] = useState<ClientWithDocuments[]>([]);
  const [filteredClients, setFilteredClients] = useState<ClientWithDocuments[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    filterClients();
  }, [clients, searchTerm, filterStatus]);

  const loadClients = async () => {
    try {
      setLoading(true);
      const data = await clientOperations.getAll();
      setClients(data);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      toast.error('Erro ao carregar clientes', {
        description: 'Não foi possível carregar a lista de clientes.',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterClients = () => {
    let filtered = clients;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(client => 
        client.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.cpf.includes(searchTerm.replace(/\D/g, '')) ||
        client.phone.includes(searchTerm) ||
        client.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by document status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(client => {
        const hasDocuments = client.client_documents && client.client_documents.length > 0;
        return filterStatus === 'complete' ? hasDocuments : !hasDocuments;
      });
    }

    setFilteredClients(filtered);
  };

  const formatCPF = (cpf: string) => {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formatZipCode = (zipCode: string | null | undefined) => {
    if (!zipCode) return '';
    return zipCode.replace(/(\d{5})(\d{3})/, '$1-$2');
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const getFullAddress = (client: ClientWithDocuments) => {
    const parts = [];
    
    if (client.street) parts.push(client.street);
    if (client.number) parts.push(client.number);
    if (client.neighborhood) parts.push(`- ${client.neighborhood}`);
    if (client.city && client.state) parts.push(`${client.city}/${client.state}`);
    if (client.zip_code) parts.push(`CEP: ${formatZipCode(client.zip_code)}`);
    
    return parts.join(', ') || 'Endereço não informado';
  };

  const handleEditClient = (clientId: string) => {
    console.log('Editando cliente:', clientId);
    // TODO: Implementar edição de cliente
    toast.info('Funcionalidade em desenvolvimento', {
      description: 'A edição de clientes será implementada em breve.',
    });
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm('Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      await clientOperations.delete(clientId);
      toast.success('Cliente excluído com sucesso!');
      loadClients(); // Reload the list
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
      toast.error('Erro ao excluir cliente', {
        description: 'Não foi possível excluir o cliente.',
      });
    }
  };

  if (loading) {
    return (
      <Card className="shadow-lg">
        <CardContent className="text-center py-16">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-red-600" />
          <p className="text-gray-600">Carregando clientes...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com Busca e Filtros */}
      <Card className="shadow-lg border-t-4 border-t-red-500">
        <CardHeader className="bg-gradient-to-r from-red-50 to-yellow-50">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <div className="p-2 bg-red-100 rounded-full">
                  <Users className="w-5 h-5 text-red-600" />
                </div>
                <span className="text-gray-800">Clientes Cadastrados</span>
                <Badge className="bg-red-500 text-white">
                  {filteredClients.length}
                </Badge>
              </CardTitle>
              <CardDescription className="text-gray-600 mt-2">
                Gerencie todos os clientes cadastrados no sistema
              </CardDescription>
            </div>
            <Button 
              onClick={onNewClient}
              className="sanleo-gradient text-white hover:opacity-90 transition-opacity shadow-lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Cliente
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar por nome, CPF, telefone ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-2 border-gray-200 focus:border-red-400"
              />
            </div>
            <div className="flex space-x-2">
              <Button
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('all')}
                size="sm"
                className={filterStatus === 'all' ? 'bg-red-500 hover:bg-red-600' : 'border-red-300 hover:bg-red-50'}
              >
                Todos
              </Button>
              <Button
                variant={filterStatus === 'complete' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('complete')}
                size="sm"
                className={filterStatus === 'complete' ? 'bg-green-500 hover:bg-green-600' : 'border-green-300 hover:bg-green-50'}
              >
                Completos
              </Button>
              <Button
                variant={filterStatus === 'incomplete' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('incomplete')}
                size="sm"
                className={filterStatus === 'incomplete' ? 'bg-yellow-500 hover:bg-yellow-600' : 'border-yellow-300 hover:bg-yellow-50'}
              >
                Incompletos
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Clientes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredClients.map((client) => {
          const hasDocuments = client.client_documents && client.client_documents.length > 0;
          
          return (
            <Card key={client.id} className="shadow-lg border-2 border-gray-200 hover:border-red-300 hover:shadow-xl transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <Avatar className="w-12 h-12 bg-red-100">
                      <AvatarFallback className="text-red-600 font-semibold">
                        {getInitials(client.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-lg text-gray-800">{client.full_name}</h3>
                      <p className="text-sm text-gray-500">
                        Cadastrado em {new Date(client.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      className={hasDocuments 
                        ? 'bg-green-100 text-green-800 border-green-300' 
                        : 'bg-yellow-100 text-yellow-800 border-yellow-300'
                      }
                    >
                      <FileText className="w-3 h-3 mr-1" />
                      {hasDocuments ? 'Completo' : 'Pendente'}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center space-x-2 text-sm">
                      <FileText className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="text-gray-500">CPF</p>
                        <p className="font-medium text-gray-800">{formatCPF(client.cpf)}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <FileText className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="text-gray-500">RG</p>
                        <p className="font-medium text-gray-800">{client.rg}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 text-sm">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="text-gray-500">Telefone</p>
                      <p className="font-medium text-gray-800">{client.phone}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 text-sm">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="text-gray-500">E-mail</p>
                      <p className="font-medium text-gray-800">{client.email}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2 text-sm">
                    <MapPin className="w-4 h-4 text-gray-500 mt-1" />
                    <div>
                      <p className="text-gray-500">Endereço</p>
                      <p className="font-medium text-gray-800 leading-relaxed">
                        {getFullAddress(client)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 mt-6 pt-4 border-t border-gray-200">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditClient(client.id)}
                    className="border-blue-300 text-blue-600 hover:bg-blue-50"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteClient(client.id)}
                    className="border-red-300 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredClients.length === 0 && !loading && (
        <Card className="shadow-lg">
          <CardContent className="text-center py-16">
            <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <Users className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              Nenhum cliente encontrado
            </h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              {searchTerm ? 'Tente ajustar os filtros de busca.' : 'Comece cadastrando seu primeiro cliente.'}
            </p>
            <Button 
              onClick={onNewClient}
              className="sanleo-gradient text-white hover:opacity-90 transition-opacity shadow-lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              Cadastrar Primeiro Cliente
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}