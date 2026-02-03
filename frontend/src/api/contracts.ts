/**
 * Contracts API client
 */

import apiClient from './client';

export interface ContractType {
  id: number;
  name: string;
  code: string;
  description: string;
  is_active: boolean;
}

export interface ContractDocument {
  id: number;
  contract: number;
  name: string;
  file: string;
  file_url: string;
  uploaded_by: number | null;
  uploaded_by_name: string | null;
  created_at: string;
}

export interface Contract {
  id: number;
  employee: number;
  employee_name: string;
  contract_type: number;
  contract_type_name: string;
  title: string;
  start_date: string;
  end_date: string | null;
  status: 'draft' | 'active' | 'expired' | 'terminated';
  salary: string | null;
  salary_currency: string;
  salary_period: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  hours_per_week: string;
  probation_end_date: string | null;
  probation_passed: boolean;
  notice_period_days: number;
  notes: string;
  documents?: ContractDocument[];
  is_expiring_soon: boolean;
  days_until_expiry: number | null;
  created_at: string;
  updated_at: string;
}

export interface ContractListItem {
  id: number;
  employee: number;
  employee_name: string;
  contract_type: number;
  contract_type_name: string;
  title: string;
  start_date: string;
  end_date: string | null;
  status: 'draft' | 'active' | 'expired' | 'terminated';
  salary: string | null;
  salary_currency: string;
  salary_period: string;
  is_expiring_soon: boolean;
  created_at: string;
}

export interface ContractStats {
  total: number;
  active: number;
  draft: number;
  expired: number;
  expiring_soon: number;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface CreateContractParams {
  employee: number;
  contract_type: number;
  title: string;
  start_date: string;
  end_date?: string;
  status?: 'draft' | 'active';
  salary?: number;
  salary_currency?: string;
  salary_period?: string;
  hours_per_week?: number;
  probation_end_date?: string;
  notice_period_days?: number;
  notes?: string;
}

// Contract Types
export async function fetchContractTypes(): Promise<ContractType[]> {
  const response = await apiClient.get('/contracts/types/');
  return response.data;
}

// Contracts
export async function fetchContracts(params?: {
  status?: string;
  employee?: number;
  expiring_soon?: boolean;
}): Promise<PaginatedResponse<ContractListItem>> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.append('status', params.status);
  if (params?.employee) searchParams.append('employee', params.employee.toString());
  if (params?.expiring_soon) searchParams.append('expiring_soon', 'true');

  const queryString = searchParams.toString();
  const response = await apiClient.get(`/contracts/${queryString ? `?${queryString}` : ''}`);
  return response.data;
}

export async function fetchContract(id: number): Promise<Contract> {
  const response = await apiClient.get(`/contracts/${id}/`);
  return response.data;
}

export async function fetchMyContracts(): Promise<
  PaginatedResponse<ContractListItem>
> {
  const response = await apiClient.get('/contracts/my_contracts/');
  return response.data;
}

export async function fetchExpiringContracts(): Promise<ContractListItem[]> {
  const response = await apiClient.get('/contracts/expiring/');
  return response.data;
}

export async function fetchContractStats(): Promise<ContractStats> {
  const response = await apiClient.get('/contracts/stats/');
  return response.data;
}

export async function createContract(
  params: CreateContractParams
): Promise<Contract> {
  const response = await apiClient.post('/contracts/', params);
  return response.data;
}

export async function updateContract(
  id: number,
  params: Partial<CreateContractParams>
): Promise<Contract> {
  const response = await apiClient.patch(`/contracts/${id}/`, params);
  return response.data;
}

export async function deleteContract(id: number): Promise<void> {
  await apiClient.delete(`/contracts/${id}/`);
}

export async function activateContract(id: number): Promise<Contract> {
  const response = await apiClient.post(`/contracts/${id}/activate/`);
  return response.data;
}

export async function terminateContract(id: number): Promise<Contract> {
  const response = await apiClient.post(`/contracts/${id}/terminate/`);
  return response.data;
}

// Contract Documents
export async function fetchContractDocuments(
  contractId: number
): Promise<ContractDocument[]> {
  const response = await apiClient.get(`/contracts/${contractId}/documents/`);
  return response.data;
}

export async function uploadContractDocument(
  contractId: number,
  name: string,
  file: File
): Promise<ContractDocument> {
  const formData = new FormData();
  formData.append('name', name);
  formData.append('file', file);

  const response = await apiClient.post(
    `/contracts/${contractId}/documents/`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data;
}

export async function deleteContractDocument(id: number): Promise<void> {
  await apiClient.delete(`/contracts/documents/${id}/`);
}
