import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for database tables
export interface Client {
  id: string;
  full_name: string;
  rg: string;
  cpf: string;
  address: string;
  phone: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface ClientDocument {
  id: string;
  client_id: string;
  document_type: 'rg' | 'cpf' | 'address_proof';
  file_name: string;
  file_path: string;
  file_size: number;
  uploaded_at: string;
}

export interface Service {
  id: string;
  client_id: string;
  service_name: string;
  service_category: string;
  total_amount: number;
  installments: number;
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
}

export interface ServiceInstallment {
  id: string;
  service_id: string;
  installment_number: number;
  amount: number;
  due_date: string;
  paid_date?: string;
  status: 'pending' | 'paid' | 'overdue';
  created_at: string;
}

// Extended types with relations
export interface ClientWithDocuments extends Client {
  client_documents: ClientDocument[];
}

export interface ServiceWithInstallments extends Service {
  service_installments: ServiceInstallment[];
  clients: Client;
}

export interface OverduePayment {
  id: string;
  client_name: string;
  client_phone: string;
  service_name: string;
  amount: number;
  due_date: string;
  days_overdue: number;
  installment: number;
  total_installments: number;
}