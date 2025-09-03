# 🚀 Cloud Deployment Guide - Contractor CRM

## **Security by Design - Enterprise Grade Security**

This guide provides step-by-step instructions for deploying the Contractor CRM application to the cloud with enterprise-grade security.

## **📋 Prerequisites**

### **Required Accounts:**
- Cloud Provider Account (AWS, Azure, GCP)
- Domain Name with DNS Access
- SSL Certificate Provider (Let's Encrypt)
- Monitoring Service Account

### **Required Tools:**
- Docker & Docker Compose
- Git
- SSH Client
- Cloud CLI Tools

## **🔐 Security Features Implemented**

### **Authentication & Authorization:**
- JWT-based authentication
- Role-based access control (user/admin)
- Session management with Redis
- Password policies (12+ chars, special chars, numbers, uppercase, lowercase)
- Account lockout after failed attempts

### **Data Protection:**
- AES-256-GCM encryption at rest
- TLS 1.3 for data in transit
- Input sanitization and validation
- SQL injection prevention
- XSS protection

### **Network Security:**
- HTTPS enforcement
- CORS configuration
- Rate limiting
- DDoS protection
- Network isolation with Docker

### **Monitoring & Auditing:**
- Security event logging
- Audit trails
- Performance monitoring
- Health checks
- Automated alerts

## **🌐 Cloud Deployment Options**

### **Option 1: AWS (Recommended)**

#### **1.1 Infrastructure Setup:**
```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure AWS credentials
aws configure
```

#### **1.2 Create ECS Cluster:**
```bash
# Create ECS cluster
aws ecs create-cluster --cluster-name contractor-crm-cluster

# Create ECR repository
aws ecr create-repository --repository-name contractor-crm
```

#### **1.3 Deploy with ECS:**
```bash
# Build and push Docker image
docker build -t contractor-crm .
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
docker tag contractor-crm:latest $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/contractor-crm:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/contractor-crm:latest
```

### **Option 2: Azure**

#### **2.1 Install Azure CLI:**
```bash
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
az login
```

#### **2.2 Create Container Registry:**
```bash
# Create resource group
az group create --name contractor-crm-rg --location eastus

# Create container registry
az acr create --resource-group contractor-crm-rg --name contractorcrmacr --sku Basic
```

### **Option 3: Google Cloud Platform**

#### **3.1 Install Google Cloud CLI:**
```bash
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
gcloud init
```

#### **3.2 Deploy to GKE:**
```bash
# Create GKE cluster
gcloud container clusters create contractor-crm-cluster --zone us-central1-a

# Deploy application
kubectl apply -f k8s/
```

## **🐳 Docker Deployment**

### **1. Environment Setup:**
```bash
# Copy environment file
cp .env.example .env

# Edit environment variables
nano .env
```

### **2. Required Environment Variables:**
```bash
# Database
MONGODB_URI=mongodb://username:password@host:port/database
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=your-super-secure-password

# Security
JWT_SECRET=your-32-character-jwt-secret
SESSION_SECRET=your-32-character-session-secret

# Domain
DOMAIN_NAME=yourdomain.com
CERTBOT_EMAIL=admin@yourdomain.com

# Cloud
CLOUD_PROVIDER=aws
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

### **3. Deploy Application:**
```bash
# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f app
```

## **🔒 Security Hardening**

### **1. Database Security:**
```bash
# Create database user with limited permissions
use contractor-crm
db.createUser({
  user: "app_user",
  pwd: "secure_password",
  roles: [
    { role: "readWrite", db: "contractor-crm" }
  ]
})
```

### **2. Network Security:**
```bash
# Configure firewall rules
sudo ufw enable
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw deny 27017/tcp  # MongoDB (internal only)
```

### **3. SSL/TLS Configuration:**
```bash
# Generate SSL certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## **📊 Monitoring & Logging**

### **1. Prometheus Configuration:**
```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'contractor-crm'
    static_configs:
      - targets: ['app:3001']
    metrics_path: '/api/metrics'
```

### **2. Grafana Dashboards:**
- Application performance metrics
- Security event monitoring
- Database performance
- User activity tracking

### **3. Log Aggregation:**
```bash
# Configure log rotation
sudo nano /etc/logrotate.d/contractor-crm

# Log format
/var/log/contractor-crm/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
}
```

## **🔄 Backup & Recovery**

### **1. Automated Backups:**
```bash
# Create backup script
nano backup.sh

#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --host localhost --port 27017 --db contractor-crm --out /backup/$DATE
aws s3 sync /backup s3://your-backup-bucket/contractor-crm/
```

### **2. Disaster Recovery Plan:**
- **RTO (Recovery Time Objective):** 4 hours
- **RPO (Recovery Point Objective):** 1 hour
- **Backup Frequency:** Daily
- **Backup Retention:** 30 days
- **Testing:** Monthly restore tests

## **🚨 Security Incident Response**

### **1. Incident Classification:**
- **Critical:** Data breach, unauthorized access
- **High:** Failed login attempts, suspicious activity
- **Medium:** Performance degradation, service disruption
- **Low:** Minor configuration issues

### **2. Response Procedures:**
```bash
# 1. Isolate affected systems
docker-compose -f docker-compose.prod.yml stop app

# 2. Preserve evidence
docker exec contractor-crm-mongodb mongodump --out /backup/incident_$(date +%Y%m%d_%H%M%S)

# 3. Investigate
docker-compose -f docker-compose.prod.yml logs app | grep -i "error\|warning\|security"

# 4. Remediate
# Update security configurations
# Rotate credentials
# Apply patches

# 5. Restore services
docker-compose -f docker-compose.prod.yml start app
```

## **📈 Performance Optimization**

### **1. Database Optimization:**
```javascript
// Create indexes
db.contractors.createIndex({ "company_id": 1 })
db.contractors.createIndex({ "name": 1 })
db.contractors.createIndex({ "sector": 1 })

// Monitor query performance
db.contractors.find({ "sector": "בניה" }).explain("executionStats")
```

### **2. Application Optimization:**
- Connection pooling
- Caching with Redis
- CDN for static assets
- Load balancing
- Auto-scaling

## **🔍 Security Auditing**

### **1. Regular Security Scans:**
```bash
# Vulnerability scanning
npm audit
docker run --rm -v $(pwd):/app owasp/zap2docker-stable zap-baseline.py -t http://yourdomain.com

# Dependency scanning
snyk test
```

### **2. Compliance Checks:**
- GDPR compliance
- SOC 2 Type II
- ISO 27001
- HIPAA (if applicable)

## **📞 Support & Maintenance**

### **1. Monitoring Alerts:**
- Email notifications for security events
- Slack/Teams integration for critical alerts
- SMS alerts for system downtime

### **2. Maintenance Windows:**
- Scheduled maintenance: Sundays 2:00-4:00 AM UTC
- Emergency maintenance: As needed with 2-hour notice
- Backup verification: Daily at 3:00 AM UTC

## **✅ Deployment Checklist**

- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Database secured and backed up
- [ ] Firewall rules configured
- [ ] Monitoring and logging enabled
- [ ] Backup procedures tested
- [ ] Security scans completed
- [ ] Performance tests passed
- [ ] Documentation updated
- [ ] Team trained on procedures

## **🚀 Quick Start Commands**

```bash
# 1. Clone repository
git clone https://github.com/your-org/contractor-crm.git
cd contractor-crm

# 2. Configure environment
cp .env.example .env
nano .env

# 3. Deploy to cloud
docker-compose -f docker-compose.prod.yml up -d

# 4. Verify deployment
curl https://yourdomain.com/api/health

# 5. Monitor logs
docker-compose -f docker-compose.prod.yml logs -f
```

## **📚 Additional Resources**

- [Docker Security Best Practices](https://docs.docker.com/engine/security/)
- [MongoDB Security Checklist](https://docs.mongodb.com/manual/security/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

---

**⚠️ Security Notice:** This application implements enterprise-grade security measures. Always follow security best practices and regularly update dependencies and security configurations.


