/*
  # Create clients and related tables

  1. New Tables
    - `clients`
      - `id` (uuid, primary key)
      - `full_name` (text)
      - `rg` (text)
      - `cpf` (text, unique)
      - `address` (text)
      - `phone` (text)
      - `email` (text, unique)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `client_documents`
      - `id` (uuid, primary key)
      - `client_id` (uuid, foreign key)
      - `document_type` (text: 'rg', 'cpf', 'address_proof')
      - `file_name` (text)
      - `file_path` (text)
      - `file_size` (integer)
      - `uploaded_at` (timestamp)
    
    - `services`
      - `id` (uuid, primary key)
      - `client_id` (uuid, foreign key)
      - `service_name` (text)
      - `service_category` (text)
      - `total_amount` (decimal)
      - `installments` (integer)
      - `status` (text: 'active', 'completed', 'cancelled')
      - `created_at` (timestamp)
    
    - `service_installments`
      - `id` (uuid, primary key)
      - `service_id` (uuid, foreign key)
      - `installment_number` (integer)
      - `amount` (decimal)
      - `due_date` (date)
      - `paid_date` (date, nullable)
      - `status` (text: 'pending', 'paid', 'overdue')
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their data
*/

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  rg text NOT NULL,
  cpf text UNIQUE NOT NULL,
  address text NOT NULL,
  phone text NOT NULL,
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create client_documents table
CREATE TABLE IF NOT EXISTS client_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('rg', 'cpf', 'address_proof')),
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer NOT NULL,
  uploaded_at timestamptz DEFAULT now()
);

-- Create services table
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  service_name text NOT NULL,
  service_category text NOT NULL,
  total_amount decimal(10,2) NOT NULL,
  installments integer DEFAULT 1,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now()
);

-- Create service_installments table
CREATE TABLE IF NOT EXISTS service_installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid REFERENCES services(id) ON DELETE CASCADE,
  installment_number integer NOT NULL,
  amount decimal(10,2) NOT NULL,
  due_date date NOT NULL,
  paid_date date,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_installments ENABLE ROW LEVEL SECURITY;

-- Create policies for clients table
CREATE POLICY "Users can read all clients"
  ON clients
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert clients"
  ON clients
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update clients"
  ON clients
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can delete clients"
  ON clients
  FOR DELETE
  TO authenticated
  USING (true);

-- Create policies for client_documents table
CREATE POLICY "Users can read all client documents"
  ON client_documents
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert client documents"
  ON client_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update client documents"
  ON client_documents
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can delete client documents"
  ON client_documents
  FOR DELETE
  TO authenticated
  USING (true);

-- Create policies for services table
CREATE POLICY "Users can read all services"
  ON services
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert services"
  ON services
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update services"
  ON services
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can delete services"
  ON services
  FOR DELETE
  TO authenticated
  USING (true);

-- Create policies for service_installments table
CREATE POLICY "Users can read all service installments"
  ON service_installments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert service installments"
  ON service_installments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update service installments"
  ON service_installments
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can delete service installments"
  ON service_installments
  FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clients_cpf ON clients(cpf);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_client_documents_client_id ON client_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_services_client_id ON services(client_id);
CREATE INDEX IF NOT EXISTS idx_service_installments_service_id ON service_installments(service_id);
CREATE INDEX IF NOT EXISTS idx_service_installments_due_date ON service_installments(due_date);
CREATE INDEX IF NOT EXISTS idx_service_installments_status ON service_installments(status);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically update installment status based on due date
CREATE OR REPLACE FUNCTION update_overdue_installments()
RETURNS void AS $$
BEGIN
  UPDATE service_installments 
  SET status = 'overdue'
  WHERE status = 'pending' 
    AND due_date < CURRENT_DATE
    AND paid_date IS NULL;
END;
$$ language 'plpgsql';