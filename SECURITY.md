# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please report it responsibly.

### How to Report

**DO NOT** create a public GitHub issue for security vulnerabilities.

Instead, please report security issues by emailing:

**security@raptorhr.com**

Include the following in your report:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response Timeline

- **Acknowledgment:** Within 48 hours
- **Initial Assessment:** Within 5 business days
- **Fix Development:** Depending on severity
- **Disclosure:** Coordinated with reporter

### What to Expect

1. We will acknowledge receipt of your report
2. We will investigate and validate the issue
3. We will develop and test a fix
4. We will release the fix and credit you (unless you prefer anonymity)
5. We will publicly disclose the issue after the fix is released

## Security Features

Raptor HR implements the following security measures:

### Authentication

- JWT-based authentication with short-lived access tokens (15 minutes)
- Refresh token rotation with blacklisting
- Password hashing using Django's PBKDF2
- Rate limiting on authentication endpoints

### Authorization

- Role-based access control (RBAC)
- Tenant isolation at the database level
- Permission checks on all API endpoints

### Data Protection

- All data encrypted in transit (TLS 1.2+)
- Sensitive data encrypted at rest
- SQL injection prevention via Django ORM
- XSS prevention via React's automatic escaping
- CSRF protection on state-changing operations

### Infrastructure

- Container security best practices
- Regular dependency updates
- Automated security scanning (CodeQL, Dependabot)
- Secrets management via environment variables

## Security Best Practices for Users

### Deployment

- Always use HTTPS in production
- Use strong, unique `SECRET_KEY`
- Keep `DEBUG=false` in production
- Configure `ALLOWED_HOSTS` properly
- Use secure database credentials
- Implement proper firewall rules

### Operations

- Regularly update dependencies
- Monitor for security advisories
- Implement logging and monitoring
- Regular backups with encryption
- Periodic security audits

## Security Advisories

Security advisories will be published on:
- GitHub Security Advisories
- Release notes (CHANGELOG.md)

## Bug Bounty

We currently do not have a formal bug bounty program, but we appreciate responsible disclosure and will acknowledge security researchers in our release notes.

## Contact

For security-related questions, contact: **security@your-org.com**
