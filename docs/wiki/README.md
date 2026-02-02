# Wiki Documentation

This folder contains the GitHub wiki pages for end-user documentation.

## Publishing to GitHub Wiki

GitHub wikis are stored in a separate repository. To publish these pages:

```bash
# Clone the wiki repo (create a wiki page via GitHub UI first to initialize)
git clone https://github.com/your-org/raptor-hr.wiki.git

# Copy the wiki files
cp docs/wiki/*.md raptor-hr.wiki/

# Commit and push
cd raptor-hr.wiki
git add .
git commit -m "Initial wiki documentation"
git push
```

## File Structure

- `Home.md` - Wiki landing page
- `_Sidebar.md` - Navigation sidebar
- `Getting-Started.md` - New user onboarding
- `Managing-Leave.md` - Leave requests and approvals
- `Time-Tracking.md` - Time entries and timesheets
- `For-Administrators.md` - Admin configuration guide

## Contributing

When adding new pages:
1. Use kebab-case for filenames (e.g., `My-New-Page.md`)
2. Add the page to `_Sidebar.md` for navigation
3. Link from relevant existing pages
