---
name: test
description: Run tests intelligently based on changed files
user_invocable: true
---

<test>

# Smart Test Runner Skill

When the user invokes this skill, run tests intelligently based on what has changed.

## Steps

### 1. Detect Changed Files
```bash
# Get list of changed files (staged + unstaged)
git diff --name-only HEAD
git diff --name-only --cached
```

### 2. Determine Test Strategy

**If backend files changed** (`backend/**/*.py`):
- Find corresponding test files
- Pattern: `backend/apps/<app>/file.py` → `backend/apps/<app>/tests/test_file.py`
- Run targeted tests first: `cd backend && pytest <test_files> -v`
- If passing, run full backend suite: `cd backend && pytest`

**If frontend files changed** (`frontend/**/*.ts`, `frontend/**/*.tsx`):
- Find corresponding test files
- Pattern: `src/features/<feature>/Component.tsx` → `src/features/<feature>/__tests__/Component.test.tsx`
- Run targeted tests: `cd frontend && npm test -- --run <test_files>`
- If passing, run full frontend suite: `cd frontend && npm test`

**If both changed**:
- Run backend tests first
- Then run frontend tests
- Report combined results

### 3. Show Coverage for Changed Files
```bash
# Backend coverage for specific files
cd backend && pytest --cov=apps/<app> --cov-report=term-missing <test_files>

# Frontend coverage
cd frontend && npm test -- --coverage --run
```

## Quick Commands

| Scenario | Command |
|----------|---------|
| All backend tests | `make test-be` |
| All frontend tests | `make test-fe` |
| All tests | `make test` |
| Backend with coverage | `make test-cov` |
| Specific test file | `cd backend && pytest apps/<app>/tests/test_<name>.py -v` |
| Specific test function | `cd backend && pytest -k "test_function_name" -v` |

## Test Markers

Use pytest markers for selective testing:
```bash
# Run only fast tests
pytest -m "not slow"

# Run only API tests
pytest -m "api"

# Run tests matching a pattern
pytest -k "employee"
```

## Troubleshooting Test Failures

### Common Issues

1. **Database not migrated**
   ```bash
   cd backend && python manage.py migrate
   ```

2. **Missing fixture**
   - Check `conftest.py` for available fixtures
   - Ensure fixture dependencies are included

3. **Tenant isolation failure**
   - Verify test uses `authenticated_tenant_client` fixture
   - Check that model inherits from `TenantAwareModel`

4. **Frontend test timeout**
   - Check for unresolved promises
   - Verify mocks are properly set up

</test>
