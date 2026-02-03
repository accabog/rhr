# RHR Code Patterns

## Backend Patterns

### Adding a New Field to an Existing Model

1. **Add field to model**
   ```python
   # backend/apps/<app>/models.py
   new_field = models.CharField(max_length=100, blank=True)
   ```

2. **Create migration**
   ```bash
   cd backend && python manage.py makemigrations <app>
   ```

3. **Add to serializer**
   ```python
   # backend/apps/<app>/serializers.py
   class MyModelSerializer:
       class Meta:
           fields = [..., 'new_field']  # Add to fields list
   ```

4. **Add to admin (if applicable)**
   ```python
   # backend/apps/<app>/admin.py
   list_display = [..., 'new_field']  # If shown in list
   ```

5. **Update tests**
   - Update fixtures in `conftest.py`
   - Update test assertions

6. **Run migration**
   ```bash
   cd backend && python manage.py migrate
   ```

### Adding a Custom ViewSet Action

```python
from rest_framework.decorators import action
from rest_framework.response import Response

class MyViewSet(TenantAwareViewSet):
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Custom action on a specific instance."""
        instance = self.get_object()
        instance.status = 'approved'
        instance.save()
        return Response({'status': 'approved'})

    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Custom action on the collection."""
        queryset = self.get_queryset().filter(status='pending')
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
```

### Nested Serializers

```python
class DepartmentSerializer(serializers.ModelSerializer):
    # Read-only nested display
    manager = EmployeeListSerializer(read_only=True)
    # Write-only FK for updates
    manager_id = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(),
        source='manager',
        write_only=True,
        required=False
    )

    class Meta:
        model = Department
        fields = ['id', 'name', 'manager', 'manager_id']
```

### Filtering and Search

```python
from rest_framework import filters
from django_filters.rest_framework import DjangoFilterBackend

class MyViewSet(TenantAwareViewSet):
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]

    # Exact match filters
    filterset_fields = ['status', 'department', 'is_active']

    # Text search across fields
    search_fields = ['name', 'description', 'employee__first_name']

    # Allowed ordering fields
    ordering_fields = ['name', 'created_at', 'status']
    ordering = ['name']  # Default ordering
```

## Frontend Patterns

### Adding a Form Field

1. **Update TypeScript interface**
   ```typescript
   // frontend/src/types/<resource>.ts
   export interface MyResource {
     // ... existing fields
     newField: string;
   }
   ```

2. **Update Zod schema (if using form validation)**
   ```typescript
   const schema = z.object({
     // ... existing fields
     newField: z.string().min(1, 'Required'),
   });
   ```

3. **Add form field component**
   ```tsx
   <Form.Item
     label="New Field"
     name="newField"
     rules={[{ required: true, message: 'Please enter a value' }]}
   >
     <Input placeholder="Enter value" />
   </Form.Item>
   ```

4. **Update API payload**
   ```typescript
   const data = {
     ...existingData,
     newField: values.newField,
   };
   ```

### Query with Dependent Data

```typescript
// Fetch detail when ID is available
const { data: employee } = useEmployee(id);

// Dependent query - only runs when employee is loaded
const { data: leaveRequests } = useQuery({
  queryKey: ['leave', 'requests', employee?.id],
  queryFn: () => leaveApi.getByEmployee(employee!.id),
  enabled: !!employee?.id,  // Only run when employee is loaded
});
```

### Optimistic Updates

```typescript
export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => employeesApi.update(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['employees', 'detail', id] });

      // Snapshot previous value
      const previous = queryClient.getQueryData(['employees', 'detail', id]);

      // Optimistically update
      queryClient.setQueryData(['employees', 'detail', id], (old) => ({
        ...old,
        ...data,
      }));

      return { previous };
    },
    onError: (err, { id }, context) => {
      // Rollback on error
      queryClient.setQueryData(['employees', 'detail', id], context?.previous);
    },
    onSettled: (data, error, { id }) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['employees', 'detail', id] });
    },
  });
}
```

### Route Protection

```tsx
// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore();

  if (isLoading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
}

// Usage in App.tsx
<Route
  path="/employees"
  element={
    <ProtectedRoute>
      <EmployeesPage />
    </ProtectedRoute>
  }
/>
```

## Testing Patterns

### Backend API Test

```python
@pytest.mark.django_db
class TestEmployeeAPI:
    def test_list_employees(self, authenticated_tenant_client, employee):
        """Test listing employees returns tenant-scoped data."""
        response = authenticated_tenant_client.get('/api/v1/employees/')
        assert response.status_code == 200
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['id'] == employee.id

    def test_create_employee(self, authenticated_tenant_client, department, position):
        """Test creating an employee."""
        data = {
            'first_name': 'John',
            'last_name': 'Doe',
            'email': 'john@example.com',
            'department': department.id,
            'position': position.id,
        }
        response = authenticated_tenant_client.post('/api/v1/employees/', data)
        assert response.status_code == 201
        assert Employee.objects.count() == 1

    def test_tenant_isolation(self, authenticated_tenant_client, tenant2):
        """Test that other tenant's data is not visible."""
        # Create employee in different tenant
        Employee.objects.create(
            tenant=tenant2,
            first_name='Other',
            last_name='Tenant',
        )

        response = authenticated_tenant_client.get('/api/v1/employees/')
        assert response.status_code == 200
        assert len(response.data['results']) == 0  # Should not see other tenant's data
```

### Frontend Component Test

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EmployeeForm } from './EmployeeForm';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const wrapper = ({ children }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('EmployeeForm', () => {
  it('submits form with valid data', async () => {
    const onSubmit = vi.fn();
    render(<EmployeeForm onSubmit={onSubmit} />, { wrapper });

    await userEvent.type(screen.getByLabelText(/first name/i), 'John');
    await userEvent.type(screen.getByLabelText(/last name/i), 'Doe');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'John',
          lastName: 'Doe',
        })
      );
    });
  });
});
```

## Common Gotchas

### Tenant Isolation
- Always use `TenantAwareModel` and `TenantAwareViewSet`
- Never query models directly without tenant filtering in views
- Test tenant isolation in every API test

### Query Cache
- Invalidate parent queries when child data changes
- Use consistent query key patterns
- Be careful with `enabled` option in dependent queries

### Serializer Fields
- Use `read_only_fields` for computed/system fields
- Use `write_only=True` for input-only fields like `password`
- Consider separate List/Detail serializers for performance

### Migrations
- Never edit applied migrations
- Use `--fake` carefully (only when you know what you're doing)
- Always test migrations on a copy of production data
