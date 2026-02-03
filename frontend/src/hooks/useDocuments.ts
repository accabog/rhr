import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { documentsApi, type DocumentFilters } from '@/api/documents';
import type { DocumentUpload } from '@/types';

/**
 * Hook to fetch documents with optional filters.
 */
export function useDocuments(filters?: DocumentFilters) {
  return useQuery({
    queryKey: ['documents', filters],
    queryFn: () => documentsApi.list(filters),
  });
}

/**
 * Hook to fetch documents for a specific entity.
 */
export function useEntityDocuments(contentType: string, objectId: number | undefined) {
  return useQuery({
    queryKey: ['documents', contentType, objectId],
    queryFn: () => documentsApi.listByEntity(contentType, objectId!),
    enabled: !!objectId,
  });
}

/**
 * Hook to fetch a single document.
 */
export function useDocument(id: string | undefined) {
  return useQuery({
    queryKey: ['documents', id],
    queryFn: () => documentsApi.get(id!),
    enabled: !!id,
  });
}

/**
 * Hook to upload a document.
 */
export function useUploadDocument() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: (data: DocumentUpload) => documentsApi.upload(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({
        queryKey: ['documents', variables.content_type_model, variables.object_id],
      });
      message.success('Document uploaded successfully');
    },
    onError: () => {
      message.error('Failed to upload document');
    },
  });
}

/**
 * Hook to delete a document.
 */
export function useDeleteDocument() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: (id: string) => documentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      message.success('Document deleted successfully');
    },
    onError: () => {
      message.error('Failed to delete document');
    },
  });
}
