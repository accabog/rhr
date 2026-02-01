---
name: debug
description: Debug common issues in the RHR codebase
user_invocable: true
---

<debug>

# Debug Skill

When the user invokes this skill, help them debug common issues.

## Ask the User

First, determine what type of issue they're experiencing:
1. API returning 403/404 errors
2. Migration conflicts or errors
3. Test fixture errors
4. Frontend query/cache issues
5. Authentication problems
6. Docker/service issues

## Debugging Guides

### API 403/404 Errors (Tenant Isolation)

**Symptoms**: API returns 403 Forbidden or 404 Not Found unexpectedly

**Check these things**:

1. **Is X-Tenant-ID header being sent?**
   ```typescript
   // Frontend should include this header
   headers: {
     'X-Tenant-ID': tenantId,
     'Authorization': `Bearer ${token}`
   }
   ```

2. **Does the model inherit from TenantAwareModel?**
   ```python
   # backend/apps/<app>/models.py
   class MyModel(TenantAwareModel):  # NOT models.Model
       ...
   ```

3. **Does the ViewSet inherit from TenantAwareViewSet?**
   ```python
   # backend/apps/<app>/views.py
   class MyViewSet(TenantAwareViewSet):  # NOT ModelViewSet
       ...
   ```

4. **Check the database directly**:
   ```bash
   make db-shell
   SELECT id, tenant_id FROM <table_name> WHERE id = <id>;
   ```

5. **Check the request in Django shell**:
   ```bash
   make shell
   # Then:
   from apps.<app>.models import MyModel
   MyModel.objects.filter(id=<id>).values('id', 'tenant_id')
   ```

### Migration Conflicts

**Symptoms**: `django.db.migrations.exceptions.InconsistentMigrationHistory`

**Resolution**:

1. **Check migration status**:
   ```bash
   cd backend && python manage.py showmigrations
   ```

2. **If migrations are out of sync**:
   ```bash
   # Create a merge migration
   cd backend && python manage.py makemigrations --merge
   ```

3. **If database is corrupted (DEV ONLY)**:
   ```bash
   make clean  # Removes all containers and volumes
   make up
   make migrate
   make seed
   ```

### Test Fixture Errors

**Symptoms**: `pytest.fixture "xyz" not found` or `IntegrityError`

**Check**:

1. **Is the fixture defined in conftest.py?**
   ```bash
   grep -n "def xyz" backend/conftest.py
   ```

2. **Are fixture dependencies available?**
   - Check the fixture's parameters for required fixtures
   - Example: `employee` requires `tenant`, `department`, `position`

3. **Is @pytest.mark.django_db decorator present?**
   ```python
   @pytest.mark.django_db
   def test_my_function(employee):
       ...
   ```

4. **Common fixture dependency chain**:
   ```
   tenant (no deps)
   └── department (tenant)
   └── position (tenant)
   └── employee (tenant, department, position)
       └── employee_with_user (+ user)
   ```

### Frontend Query/Cache Issues

**Symptoms**: Stale data, updates not reflecting, infinite loading

**Check**:

1. **Is query key correct?**
   ```typescript
   // Query keys should be consistent
   queryKey: ['employees', 'list', filters]  // ✅
   queryKey: ['employee-list', filters]      // ❌ Inconsistent
   ```

2. **Is cache being invalidated after mutations?**
   ```typescript
   onSuccess: () => {
     queryClient.invalidateQueries({ queryKey: ['employees'] });
   }
   ```

3. **Check React Query DevTools**:
   - Open browser DevTools
   - Look for "React Query" tab
   - Inspect query state, cache, and refetch triggers

4. **Force refetch**:
   ```typescript
   const { refetch } = useEmployees();
   refetch();
   ```

### Authentication Problems

**Symptoms**: 401 errors, login failures, token issues

**Check**:

1. **Is token in localStorage?**
   ```javascript
   localStorage.getItem('rhr-auth')
   ```

2. **Is token expired?**
   - Access tokens expire in 15 minutes
   - Refresh tokens expire in 7 days

3. **Check token refresh logic**:
   - Located in `frontend/src/api/client.ts`
   - Response interceptor handles 401 → refresh

4. **Clear auth state**:
   ```javascript
   localStorage.removeItem('rhr-auth')
   // Then reload page
   ```

### Docker/Service Issues

**Symptoms**: Services not starting, connection refused

**Check**:

1. **Service status**:
   ```bash
   make status
   ```

2. **Service logs**:
   ```bash
   make logs
   # Or specific service:
   docker compose logs backend -f
   ```

3. **Database connectivity**:
   ```bash
   make db-shell
   # If this works, DB is up
   ```

4. **Redis connectivity**:
   ```bash
   make redis-cli
   PING
   # Should return PONG
   ```

5. **Full restart**:
   ```bash
   make down
   make up
   ```

6. **Frontend package errors** (stale node_modules volume):
   ```bash
   make refresh-frontend
   ```

7. **Nuclear option (destroys data)**:
   ```bash
   make clean
   make up
   make migrate
   make seed
   ```

</debug>
