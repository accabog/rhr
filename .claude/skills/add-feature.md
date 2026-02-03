---
name: add-feature
description: Create a new frontend feature module
user_invocable: true
---

<add-feature>

# Add Frontend Feature Skill

When the user wants to create a new frontend feature, follow this structured approach.

## Prerequisites

Ask the user:
1. **Feature name**: What is this feature called? (e.g., "documents", "benefits", "skills")
2. **API endpoint**: Does this feature need to connect to a backend API?
3. **Pages needed**: What pages does this feature include? (list, detail, create, edit)

## Implementation Steps

### 1. Create Feature Directory Structure

```
frontend/src/features/<feature>/
├── index.ts              # Public exports
├── <Feature>Page.tsx     # Main page component
├── components/           # Feature-specific components
│   └── <Component>.tsx
└── hooks/                # Feature-specific hooks (if needed)
    └── use<Feature>.ts
```

### 2. Create API Functions (if needed)

In `frontend/src/api/<feature>.ts`:
- Define TypeScript interfaces for the API responses
- Create API functions using the existing api client pattern
- Export TanStack Query hooks (useQuery, useMutation)

### 3. Create Page Component

In `frontend/src/features/<feature>/<Feature>Page.tsx`:
- Use existing layout components from `src/layouts/`
- Use shared UI components from `src/components/`
- Follow existing patterns (check `src/features/profile/` for reference)

### 4. Add Routes

In `frontend/src/App.tsx`:
- Import the page component
- Add route(s) to the router configuration

### 5. Add to Navigation (if needed)

Update navigation in the appropriate layout or sidebar component.

## Code Patterns to Follow

### API Hook Pattern
```typescript
// frontend/src/api/<feature>.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

export interface Feature {
  id: number;
  name: string;
  // ... fields
}

export function useFeatures() {
  return useQuery({
    queryKey: ['features'],
    queryFn: () => api.get<Feature[]>('/api/v1/features/'),
  });
}
```

### Page Component Pattern
```typescript
// frontend/src/features/<feature>/<Feature>Page.tsx
import { useFeatures } from '@/api/<feature>';

export function FeaturePage() {
  const { data, isLoading, error } = useFeatures();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div>
      {/* Feature content */}
    </div>
  );
}
```

## Existing Patterns Reference

- Check `frontend/src/features/profile/` for user-facing features
- Check `frontend/src/features/settings/` for settings pages
- Check `frontend/src/features/calendar/` for data-heavy features

</add-feature>
