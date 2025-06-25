import { supabase } from './supabase';
import type { Client, ClientDocument, Service, ServiceInstallment, ClientWithDocuments, ServiceWithInstallments, OverduePayment } from './supabase';

// Client operations
export const clientOperations = {
  // Create a new client
  async create(clientData: Omit<Client, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('clients')
      .insert([clientData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get all clients with their documents
  async getAll(): Promise<ClientWithDocuments[]> {
    const { data, error } = await supabase
      .from('clients')
      .select(`
        *,
        client_documents (*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get client by ID
  async getById(id: string): Promise<ClientWithDocuments | null> {
    const { data, error } = await supabase
      .from('clients')
      .select(`
        *,
        client_documents (*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  // Update client
  async update(id: string, updates: Partial<Omit<Client, 'id' | 'created_at' | 'updated_at'>>) {
    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete client
  async delete(id: string) {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Search clients
  async search(query: string): Promise<ClientWithDocuments[]> {
    const { data, error } = await supabase
      .from('clients')
      .select(`
        *,
        client_documents (*)
      `)
      .or(`full_name.ilike.%${query}%,cpf.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
};

// Document operations
export const documentOperations = {
  // Upload document
  async upload(file: File, clientId: string, documentType: 'rg' | 'cpf' | 'address_proof') {
    const fileExt = file.name.split('.').pop();
    const fileName = `${clientId}/${documentType}.${fileExt}`;
    
    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('client-documents')
      .upload(fileName, file, {
        upsert: true
      });

    if (uploadError) throw uploadError;

    // Save document record to database
    const { data, error } = await supabase
      .from('client_documents')
      .insert([{
        client_id: clientId,
        document_type: documentType,
        file_name: file.name,
        file_path: uploadData.path,
        file_size: file.size
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get document URL
  async getUrl(filePath: string) {
    const { data } = await supabase.storage
      .from('client-documents')
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    return data?.signedUrl;
  },

  // Delete document
  async delete(documentId: string) {
    // Get document info first
    const { data: document, error: fetchError } = await supabase
      .from('client_documents')
      .select('file_path')
      .eq('id', documentId)
      .single();

    if (fetchError) throw fetchError;

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('client-documents')
      .remove([document.file_path]);

    if (storageError) throw storageError;

    // Delete from database
    const { error } = await supabase
      .from('client_documents')
      .delete()
      .eq('id', documentId);

    if (error) throw error;
  }
};

// Service operations
export const serviceOperations = {
  // Create service with installments
  async create(serviceData: Omit<Service, 'id' | 'created_at'>, installments: Omit<ServiceInstallment, 'id' | 'service_id' | 'created_at'>[]) {
    // Create service
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .insert([serviceData])
      .select()
      .single();

    if (serviceError) throw serviceError;

    // Create installments
    const installmentData = installments.map(installment => ({
      ...installment,
      service_id: service.id
    }));

    const { data: createdInstallments, error: installmentError } = await supabase
      .from('service_installments')
      .insert(installmentData)
      .select();

    if (installmentError) throw installmentError;

    return { service, installments: createdInstallments };
  },

  // Get all services with client info and installments
  async getAll(): Promise<ServiceWithInstallments[]> {
    const { data, error } = await supabase
      .from('services')
      .select(`
        *,
        clients (*),
        service_installments (*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get services by client
  async getByClient(clientId: string): Promise<ServiceWithInstallments[]> {
    const { data, error } = await supabase
      .from('services')
      .select(`
        *,
        clients (*),
        service_installments (*)
      `)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
};

// Installment operations
export const installmentOperations = {
  // Mark installment as paid
  async markAsPaid(installmentId: string) {
    const { data, error } = await supabase
      .from('service_installments')
      .update({
        status: 'paid',
        paid_date: new Date().toISOString().split('T')[0]
      })
      .eq('id', installmentId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get overdue payments
  async getOverdue(): Promise<OverduePayment[]> {
    const { data, error } = await supabase
      .from('service_installments')
      .select(`
        id,
        installment_number,
        amount,
        due_date,
        services (
          service_name,
          installments,
          clients (
            full_name,
            phone
          )
        )
      `)
      .eq('status', 'overdue')
      .order('due_date', { ascending: true });

    if (error) throw error;

    return (data || []).map(item => {
      const dueDate = new Date(item.due_date);
      const today = new Date();
      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      return {
        id: item.id,
        client_name: item.services.clients.full_name,
        client_phone: item.services.clients.phone,
        service_name: item.services.service_name,
        amount: item.amount,
        due_date: item.due_date,
        days_overdue: daysOverdue,
        installment: item.installment_number,
        total_installments: item.services.installments
      };
    });
  },

  // Update overdue status (run periodically)
  async updateOverdueStatus() {
    const { error } = await supabase.rpc('update_overdue_installments');
    if (error) throw error;
  }
};

// Dashboard statistics
export const dashboardOperations = {
  async getStats() {
    // Get total clients
    const { count: totalClients } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true });

    // Get monthly revenue (current month)
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    const { data: monthlyRevenue } = await supabase
      .from('service_installments')
      .select('amount')
      .eq('status', 'paid')
      .gte('paid_date', `${currentMonth}-01`)
      .lt('paid_date', `${currentMonth}-32`);

    const monthlyTotal = monthlyRevenue?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;

    // Get pending services count
    const { count: pendingServices } = await supabase
      .from('service_installments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Get overdue payments count
    const { count: overduePayments } = await supabase
      .from('service_installments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'overdue');

    return {
      totalClients: totalClients || 0,
      monthlyRevenue: monthlyTotal,
      pendingServices: pendingServices || 0,
      overduePayments: overduePayments || 0
    };
  },

  async getRecentServices(limit = 5): Promise<ServiceWithInstallments[]> {
    const { data, error } = await supabase
      .from('services')
      .select(`
        *,
        clients (*),
        service_installments (*)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }
};