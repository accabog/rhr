import { apiClient } from './client';
import type { Document, DocumentUpload, PaginatedResponse } from '@/types';

export interface DocumentFilters {
  content_type?: string;
  object_id?: number;
  search?: string;
  page?: number;
  page_size?: number;
}

export const documentsApi = {
  /**
   * List documents, optionally filtered by entity.
   */
  list: async (filters?: DocumentFilters): Promise<PaginatedResponse<Document>> => {
    const response = await apiClient.get<PaginatedResponse<Document>>('/documents/', {
      params: filters,
    });
    return response.data;
  },

  /**
   * Get documents for a specific entity.
   */
  listByEntity: async (
    contentType: string,
    objectId: number
  ): Promise<PaginatedResponse<Document>> => {
    const response = await apiClient.get<PaginatedResponse<Document>>('/documents/', {
      params: {
        content_type: contentType,
        object_id: objectId,
      },
    });
    return response.data;
  },

  /**
   * Get a single document by ID.
   */
  get: async (id: string): Promise<Document> => {
    const response = await apiClient.get<Document>(`/documents/${id}/`);
    return response.data;
  },

  /**
   * Upload a new document.
   */
  upload: async (data: DocumentUpload): Promise<Document> => {
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('name', data.name);
    formData.append('content_type_model', data.content_type_model);
    formData.append('object_id', data.object_id.toString());
    if (data.description) {
      formData.append('description', data.description);
    }

    const response = await apiClient.post<Document>('/documents/', formData);
    return response.data;
  },

  /**
   * Delete a document.
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/documents/${id}/`);
  },

  /**
   * Download a document (returns blob URL).
   */
  download: async (document: Document): Promise<string> => {
    const response = await apiClient.get(document.download_url, {
      responseType: 'blob',
    });
    return URL.createObjectURL(response.data);
  },
};
