# Security Guidelines

## Environment Variables

**IMPORTANT**: Never commit sensitive information like database credentials to Git.

### Required Environment Variables

Create a `.env` file in the `server/` directory with the following variables:

```bash
PORT=3001
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/contractor-crm?retryWrites=true&w=majority
```

### Security Best Practices

1. **Never commit `.env` files** - They are already in `.gitignore`
2. **Use environment variables** for all sensitive data
3. **Rotate credentials regularly**
4. **Use strong passwords** for database access
5. **Limit database user permissions** to minimum required

### If Credentials Are Exposed

1. **Immediately rotate** the exposed credentials
2. **Remove** the exposed data from Git history
3. **Update** all environment variables
4. **Notify** team members of the security incident

## Database Security

- Use MongoDB Atlas IP whitelist
- Enable authentication
- Use SSL/TLS connections
- Regular security audits
