/**
 * Contracts React Query hooks
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  fetchContractTypes,
  fetchContracts,
  fetchContract,
  fetchMyContracts,
  fetchExpiringContracts,
  fetchContractStats,
  createContract,
  updateContract,
  deleteContract,
  activateContract,
  terminateContract,
  uploadContractDocument,
  deleteContractDocument,
  type CreateContractParams,
} from '@/api/contracts';

// Query keys
export const contractKeys = {
  all: ['contracts'] as const,
  types: () => [...contractKeys.all, 'types'] as const,
  lists: () => [...contractKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) =>
    [...contractKeys.lists(), filters] as const,
  myContracts: () => [...contractKeys.all, 'my'] as const,
  expiring: () => [...contractKeys.all, 'expiring'] as const,
  stats: () => [...contractKeys.all, 'stats'] as const,
  details: () => [...contractKeys.all, 'detail'] as const,
  detail: (id: number) => [...contractKeys.details(), id] as const,
};

// Contract Types
export function useContractTypes() {
  return useQuery({
    queryKey: contractKeys.types(),
    queryFn: fetchContractTypes,
  });
}

// Contracts
export function useContracts(params?: {
  status?: string;
  employee?: number;
  expiring_soon?: boolean;
}) {
  return useQuery({
    queryKey: contractKeys.list(params || {}),
    queryFn: () => fetchContracts(params),
  });
}

export function useContract(id: number) {
  return useQuery({
    queryKey: contractKeys.detail(id),
    queryFn: () => fetchContract(id),
    enabled: !!id,
  });
}

export function useMyContracts() {
  return useQuery({
    queryKey: contractKeys.myContracts(),
    queryFn: fetchMyContracts,
  });
}

export function useExpiringContracts() {
  return useQuery({
    queryKey: contractKeys.expiring(),
    queryFn: fetchExpiringContracts,
  });
}

export function useContractStats() {
  return useQuery({
    queryKey: contractKeys.stats(),
    queryFn: fetchContractStats,
  });
}

// Mutations
export function useCreateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateContractParams) => createContract(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contractKeys.all });
      message.success('Contract created');
    },
    onError: (error: Error & { response?: { data?: { detail?: string } } }) => {
      message.error(error.response?.data?.detail || 'Failed to create contract');
    },
  });
}

export function useUpdateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      params,
    }: {
      id: number;
      params: Partial<CreateContractParams>;
    }) => updateContract(id, params),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: contractKeys.all });
      queryClient.setQueryData(contractKeys.detail(data.id), data);
      message.success('Contract updated');
    },
    onError: (error: Error & { response?: { data?: { detail?: string } } }) => {
      message.error(error.response?.data?.detail || 'Failed to update contract');
    },
  });
}

export function useDeleteContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteContract(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contractKeys.all });
      message.success('Contract deleted');
    },
    onError: () => {
      message.error('Failed to delete contract');
    },
  });
}

export function useActivateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => activateContract(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: contractKeys.all });
      queryClient.setQueryData(contractKeys.detail(data.id), data);
      message.success('Contract activated');
    },
    onError: (error: Error & { response?: { data?: { detail?: string } } }) => {
      message.error(error.response?.data?.detail || 'Failed to activate contract');
    },
  });
}

export function useTerminateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => terminateContract(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: contractKeys.all });
      queryClient.setQueryData(contractKeys.detail(data.id), data);
      message.success('Contract terminated');
    },
    onError: (error: Error & { response?: { data?: { detail?: string } } }) => {
      message.error(error.response?.data?.detail || 'Failed to terminate contract');
    },
  });
}

// Document mutations
export function useUploadContractDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      contractId,
      name,
      file,
    }: {
      contractId: number;
      name: string;
      file: File;
    }) => uploadContractDocument(contractId, name, file),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: contractKeys.detail(variables.contractId),
      });
      message.success('Document uploaded');
    },
    onError: () => {
      message.error('Failed to upload document');
    },
  });
}

export function useDeleteContractDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteContractDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contractKeys.all });
      message.success('Document deleted');
    },
    onError: () => {
      message.error('Failed to delete document');
    },
  });
}
