---
name: migrate
description: Generate and run Django migrations
user_invocable: true
---

<migrate>

# Django Migration Skill

When the user invokes this skill, help them manage Django migrations.

## Steps

1. **Check for pending changes**: Run `python manage.py makemigrations --dry-run` to see what migrations would be created
2. **Review model changes**: If there are changes, explain what migration operations will be created
3. **Create migrations**: Run `python manage.py makemigrations` with appropriate app name if specified
4. **Review the migration file**: Read the generated migration file and explain what it does
5. **Apply migrations**: Ask if user wants to apply with `python manage.py migrate`

## Common Scenarios

### Creating migrations for a specific app
```bash
cd backend && python manage.py makemigrations <app_name>
```

### Checking migration status
```bash
cd backend && python manage.py showmigrations
```

### Reversing a migration
```bash
cd backend && python manage.py migrate <app_name> <previous_migration_number>
```

## Important Notes

- Always review migration files before applying
- For data migrations, create an empty migration with `--empty`
- Use `RunPython` for data migrations
- Consider backwards compatibility with `reverse_code`

</migrate>
