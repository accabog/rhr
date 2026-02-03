---
name: add-api
description: Scaffold a new API endpoint with tests
user_invocable: true
---

<add-api>

# Add API Endpoint Skill

When the user wants to create a new API endpoint, follow this structured approach.

## Prerequisites

Ask the user:
1. **App name**: Which Django app should contain this endpoint? (e.g., employees, leave, contracts)
2. **Resource name**: What resource does this endpoint manage? (e.g., Department, Skill, Benefit)
3. **Tenant-scoped?**: Should this be tenant-aware? (default: yes for most resources)

## Implementation Steps

### 1. Create the Model (if needed)

In `backend/apps/<app>/models.py`:
- Inherit from `TenantAwareModel` for tenant-scoped resources
- Inherit from `TimeStampedModel` for timestamps (created_at, updated_at)
- Add appropriate fields with help_text
- Define `__str__` method
- Add `Meta` class with ordering

### 2. Create the Serializer

In `backend/apps/<app>/serializers.py`:
- Create a ModelSerializer
- Define `fields` explicitly (never use `__all__`)
- Add read_only_fields for computed/system fields
- Add validation methods as needed

### 3. Create the ViewSet

In `backend/apps/<app>/views.py`:
- Inherit from `TenantAwareViewSet` for tenant-scoped resources
- Set `serializer_class` and `queryset`
- Add `permission_classes` if custom permissions needed
- Implement custom actions with `@action` decorator if needed

### 4. Register the URL

In `backend/apps/<app>/urls.py`:
- Register with the router: `router.register('resource-name', ViewSet)`

### 5. Create Tests

In `backend/apps/<app>/tests/`:
- Create test file: `test_<resource>_api.py`
- Test CRUD operations
- Test tenant isolation
- Test permissions

## Example Output Structure

```
backend/apps/<app>/
├── models.py        # Add new model
├── serializers.py   # Add new serializer
├── views.py         # Add new ViewSet
├── urls.py          # Register route
└── tests/
    └── test_<resource>_api.py  # Add tests
```

## Code Patterns

Follow existing patterns in the codebase:
- Check `backend/apps/employees/` for a complete example
- Use factory_boy for test fixtures
- Follow REST naming conventions (plural nouns)

</add-api>
