---
name: scaffold
description: Generate boilerplate for new features (model, API, frontend)
user_invocable: true
---

<scaffold>

# Scaffold Skill

When the user invokes this skill, help them generate boilerplate code for new features.

## Ask the User

1. **What do you want to scaffold?**
   - Backend model + API
   - Frontend feature
   - Full stack (both)

2. **What is the resource name?** (e.g., "Benefit", "Skill", "Training")

3. **Which app should it belong to?** (for backend)
   - employees, leave, contracts, timetracking, timesheets, or new app

4. **What fields does it need?**

## Backend Scaffolding

### 1. Model Template

```python
# backend/apps/<app>/models.py

from django.db import models
from apps.core.models import TenantAwareModel


class <ResourceName>(TenantAwareModel):
    """<Description of the resource>."""

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']
        verbose_name = '<resource_name>'
        verbose_name_plural = '<resource_names>'
        constraints = [
            models.UniqueConstraint(
                fields=['tenant', 'name'],
                name='unique_<resource_name>_name_per_tenant'
            )
        ]
        indexes = [
            models.Index(fields=['tenant', 'is_active']),
        ]

    def __str__(self):
        return self.name
```

### 2. Serializer Template

```python
# backend/apps/<app>/serializers.py

from rest_framework import serializers
from .models import <ResourceName>


class <ResourceName>ListSerializer(serializers.ModelSerializer):
    """Serializer for list view (minimal fields)."""

    class Meta:
        model = <ResourceName>
        fields = ['id', 'name', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class <ResourceName>DetailSerializer(serializers.ModelSerializer):
    """Serializer for detail/create/update views."""

    class Meta:
        model = <ResourceName>
        fields = ['id', 'name', 'description', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
```

### 3. ViewSet Template

```python
# backend/apps/<app>/views.py

from rest_framework import filters
from django_filters.rest_framework import DjangoFilterBackend
from apps.core.views import TenantAwareViewSet
from .models import <ResourceName>
from .serializers import <ResourceName>ListSerializer, <ResourceName>DetailSerializer


class <ResourceName>ViewSet(TenantAwareViewSet):
    """API endpoint for <resource_name> management."""

    queryset = <ResourceName>.objects.all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

    def get_serializer_class(self):
        if self.action == 'list':
            return <ResourceName>ListSerializer
        return <ResourceName>DetailSerializer
```

### 4. URL Registration

```python
# backend/apps/<app>/urls.py

from rest_framework.routers import DefaultRouter
from .views import <ResourceName>ViewSet

router = DefaultRouter()
router.register('<resource_names>', <ResourceName>ViewSet, basename='<resource_name>')

urlpatterns = router.urls
```

### 5. Admin Registration

```python
# backend/apps/<app>/admin.py

from django.contrib import admin
from .models import <ResourceName>


@admin.register(<ResourceName>)
class <ResourceName>Admin(admin.ModelAdmin):
    list_display = ['name', 'tenant', 'is_active', 'created_at']
    list_filter = ['is_active', 'tenant']
    search_fields = ['name', 'description']
    ordering = ['name']
```

### 6. Test Template

```python
# backend/apps/<app>/tests/test_<resource_name>.py

import pytest
from django.urls import reverse
from apps.<app>.models import <ResourceName>


@pytest.fixture
def <resource_name>(tenant):
    return <ResourceName>.objects.create(
        tenant=tenant,
        name='Test <ResourceName>',
        description='Test description',
    )


@pytest.mark.django_db
class Test<ResourceName>API:
    def test_list_<resource_names>(self, authenticated_tenant_client, <resource_name>):
        url = reverse('<resource_name>-list')
        response = authenticated_tenant_client.get(url)
        assert response.status_code == 200
        assert len(response.data['results']) == 1

    def test_create_<resource_name>(self, authenticated_tenant_client):
        url = reverse('<resource_name>-list')
        data = {'name': 'New <ResourceName>', 'description': 'New description'}
        response = authenticated_tenant_client.post(url, data)
        assert response.status_code == 201
        assert <ResourceName>.objects.count() == 1

    def test_tenant_isolation(self, authenticated_tenant_client, tenant2):
        """Ensure resources from other tenants are not visible."""
        <ResourceName>.objects.create(tenant=tenant2, name='Other Tenant')
        url = reverse('<resource_name>-list')
        response = authenticated_tenant_client.get(url)
        assert response.status_code == 200
        assert len(response.data['results']) == 0
```

## Frontend Scaffolding

### 1. TypeScript Interface

```typescript
// frontend/src/types/<resourceName>.ts

export interface <ResourceName> {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface <ResourceName>CreateInput {
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface <ResourceName>UpdateInput extends Partial<<ResourceName>CreateInput> {}
```

### 2. API Module

```typescript
// frontend/src/api/<resourceName>.ts

import { api } from './client';
import type { <ResourceName>, <ResourceName>CreateInput, <ResourceName>UpdateInput } from '@/types/<resourceName>';
import type { PaginatedResponse } from '@/types/api';

export const <resourceName>Api = {
  list: async (params?: Record<string, unknown>): Promise<PaginatedResponse<<ResourceName>>> => {
    const response = await api.get('/<resource_names>/', { params });
    return response.data;
  },

  get: async (id: number): Promise<<ResourceName>> => {
    const response = await api.get(`/<resource_names>/${id}/`);
    return response.data;
  },

  create: async (data: <ResourceName>CreateInput): Promise<<ResourceName>> => {
    const response = await api.post('/<resource_names>/', data);
    return response.data;
  },

  update: async (id: number, data: <ResourceName>UpdateInput): Promise<<ResourceName>> => {
    const response = await api.patch(`/<resource_names>/${id}/`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/<resource_names>/${id}/`);
  },
};
```

### 3. React Query Hooks

```typescript
// frontend/src/hooks/use<ResourceName>.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { <resourceName>Api } from '@/api/<resourceName>';
import type { <ResourceName>CreateInput, <ResourceName>UpdateInput } from '@/types/<resourceName>';

export function use<ResourceName>s(filters?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['<resourceNames>', 'list', filters],
    queryFn: () => <resourceName>Api.list(filters),
  });
}

export function use<ResourceName>(id: number) {
  return useQuery({
    queryKey: ['<resourceNames>', 'detail', id],
    queryFn: () => <resourceName>Api.get(id),
    enabled: !!id,
  });
}

export function useCreate<ResourceName>() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: (data: <ResourceName>CreateInput) => <resourceName>Api.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['<resourceNames>'] });
      message.success('<ResourceName> created successfully');
    },
    onError: () => {
      message.error('Failed to create <resourceName>');
    },
  });
}

export function useUpdate<ResourceName>() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: <ResourceName>UpdateInput }) =>
      <resourceName>Api.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['<resourceNames>'] });
      message.success('<ResourceName> updated successfully');
    },
    onError: () => {
      message.error('Failed to update <resourceName>');
    },
  });
}

export function useDelete<ResourceName>() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: (id: number) => <resourceName>Api.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['<resourceNames>'] });
      message.success('<ResourceName> deleted successfully');
    },
    onError: () => {
      message.error('Failed to delete <resourceName>');
    },
  });
}
```

## Post-Scaffold Steps

After generating the code:

1. **Backend**:
   ```bash
   cd backend && python manage.py makemigrations
   cd backend && python manage.py migrate
   ```

2. **Run tests**:
   ```bash
   make test-be
   ```

3. **Frontend**:
   - Add route in `src/App.tsx`
   - Add to navigation if needed

4. **Update CLAUDE.md** if this is a significant new domain entity

</scaffold>
