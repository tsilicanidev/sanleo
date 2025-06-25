/*
  # Fix RLS policies to allow public access

  This migration updates the Row Level Security policies to allow public access
  to all tables. This is necessary when the application doesn't have user authentication
  implemented yet.

  IMPORTANT: For production applications, you should implement proper authentication
  and restrict these policies to authenticated users only.

  1. Security Changes
    - Update all policies to allow public access instead of authenticated only
    - This enables the application to work without user authentication
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read all clients" ON clients;
DROP POLICY IF EXISTS "Users can insert clients" ON clients;
DROP POLICY IF EXISTS "Users can update clients" ON clients;
DROP POLICY IF EXISTS "Users can delete clients" ON clients;

DROP POLICY IF EXISTS "Users can read all client documents" ON client_documents;
DROP POLICY IF EXISTS "Users can insert client documents" ON client_documents;
DROP POLICY IF EXISTS "Users can update client documents" ON client_documents;
DROP POLICY IF EXISTS "Users can delete client documents" ON client_documents;

DROP POLICY IF EXISTS "Users can read all services" ON services;
DROP POLICY IF EXISTS "Users can insert services" ON services;
DROP POLICY IF EXISTS "Users can update services" ON services;
DROP POLICY IF EXISTS "Users can delete services" ON services;

DROP POLICY IF EXISTS "Users can read all service installments" ON service_installments;
DROP POLICY IF EXISTS "Users can insert service installments" ON service_installments;
DROP POLICY IF EXISTS "Users can update service installments" ON service_installments;
DROP POLICY IF EXISTS "Users can delete service installments" ON service_installments;

-- Create new policies that allow public access
CREATE POLICY "Public can read all clients"
  ON clients
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can insert clients"
  ON clients
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can update clients"
  ON clients
  FOR UPDATE
  TO public
  USING (true);

CREATE POLICY "Public can delete clients"
  ON clients
  FOR DELETE
  TO public
  USING (true);

-- Create policies for client_documents table
CREATE POLICY "Public can read all client documents"
  ON client_documents
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can insert client documents"
  ON client_documents
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can update client documents"
  ON client_documents
  FOR UPDATE
  TO public
  USING (true);

CREATE POLICY "Public can delete client documents"
  ON client_documents
  FOR DELETE
  TO public
  USING (true);

-- Create policies for services table
CREATE POLICY "Public can read all services"
  ON services
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can insert services"
  ON services
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can update services"
  ON services
  FOR UPDATE
  TO public
  USING (true);

CREATE POLICY "Public can delete services"
  ON services
  FOR DELETE
  TO public
  USING (true);

-- Create policies for service_installments table
CREATE POLICY "Public can read all service installments"
  ON service_installments
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can insert service installments"
  ON service_installments
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can update service installments"
  ON service_installments
  FOR UPDATE
  TO public
  USING (true);

CREATE POLICY "Public can delete service installments"
  ON service_installments
  FOR DELETE
  TO public
  USING (true);