# Deployment Guide

This guide provides step-by-step instructions for deploying Rhulani Tuck Shop POS system to production environments.

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passed
- [ ] Code reviewed and approved
- [ ] Database backed up
- [ ] Environment variables configured
- [ ] SSL certificates obtained
- [ ] Payment gateways tested
- [ ] Backup restoration tested
- [ ] Security audit completed

### Production Deployment Steps

#### 1. Environment Setup

```bash
# 1. Create production environment file
touch .env.production

# 2. Add production configuration
cat > .env.production << EOF
# Production Database
DATABASE_HOST=your_production_host
DATABASE_PORT=3306
DATABASE_NAME=rhulanituckshop_prod
DATABASE_USER=prod_user
DATABASE_PASSWORD=strong_password_here

# Security
SESSION_SECRET=generate_with_openssl_rand_hex_32
JWT_SECRET=generate_with_openssl_rand_hex_32

# API Configuration
NEXT_PUBLIC_API_URL=https://pos.yourstore.co.za
NODE_ENV=production

# Payment Processing
ENABLE_PRODUCTION_PAYMENTS=true
EOF

# 3. Set secure permissions
chmod 600 .env.production
```

#### 2. Database Migration

```bash
# 1. Backup current database
mysqldump -h localhost -u root -p rhulanituckshop > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Create production database
mysql -h your_prod_host -u admin -p << EOF
CREATE DATABASE rhulanituckshop_prod;
CREATE USER 'prod_user'@'%' IDENTIFIED BY 'strong_password';
GRANT ALL PRIVILEGES ON rhulanituckshop_prod.* TO 'prod_user'@'%';
FLUSH PRIVILEGES;
EOF

# 3. Initialize schema
mysql -h your_prod_host -u prod_user -p rhulanituckshop_prod < schema.sql

# 4. Verify connection
npm run db:verify
```

#### 3. Build & Deployment

```bash
# 1. Install production dependencies
npm ci --only=production

# 2. Build application
npm run build

# 3. Verify build
npm run start

# 4. Run production server
npm run start &
```

#### 4. SSL/HTTPS Configuration

```bash
# 1. Obtain SSL certificate (Let's Encrypt)
sudo certbot certonly --standalone -d pos.yourstore.co.za

# 2. Configure in reverse proxy (Nginx)
sudo nano /etc/nginx/sites-available/pos

# Add the following:
server {
    listen 443 ssl http2;
    server_name pos.yourstore.co.za;

    ssl_certificate /etc/letsencrypt/live/pos.yourstore.co.za/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pos.yourstore.co.za/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# 3. Enable site
sudo ln -s /etc/nginx/sites-available/pos /etc/nginx/sites-enabled/

# 4. Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

#### 5. Process Management

```bash
# Install PM2 for process management
npm install -g pm2

# Create ecosystem config
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'rhulani-pos',
    script: './node_modules/.bin/next',
    args: 'start',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
EOF

# Start with PM2
pm2 start ecosystem.config.js

# Enable startup on reboot
pm2 startup systemd -u ubuntu --hp /home/ubuntu
pm2 save
```

#### 6. Backup Configuration

```bash
# Create backup script
cat > /home/ubuntu/backup.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/backups/rhulani-pos"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
mysqldump -h production_host -u prod_user -p rhulanituckshop_prod > $BACKUP_DIR/db_$DATE.sql

# Backup application files
tar -czf $BACKUP_DIR/app_$DATE.tar.gz /var/www/rhulani-pos

# Keep only last 30 days
find $BACKUP_DIR -type f -mtime +30 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /home/ubuntu/backup.sh

# Schedule daily backups (2am)
(crontab -l 2>/dev/null; echo "0 2 * * * /home/ubuntu/backup.sh") | crontab -
```

### Post-Deployment

- [ ] Verify all pages load correctly
- [ ] Test login with all roles
- [ ] Test payment processing (test mode first)
- [ ] Verify till system functions
- [ ] Test PIN generation and expiry
- [ ] Run smoke tests
- [ ] Monitor error logs
- [ ] Check server resources
- [ ] Enable monitoring/alerts

## Production Monitoring

### Health Checks

```bash
# Setup monitoring script
cat > health-check.sh << 'EOF'
#!/bin/bash

# Check application health
curl -s https://pos.yourstore.co.za/api/health || echo "Application down"

# Check database connection
mysql -h production_host -u prod_user -p -e "SELECT 1;" || echo "Database down"

# Check disk space
df -h | grep -E '^/dev/'

# Check memory
free -h

# Check process status
pm2 status
EOF

chmod +x health-check.sh
```

### Logging

```bash
# Enable application logs
tail -f /home/ubuntu/.pm2/logs/rhulani-pos-error.log
tail -f /home/ubuntu/.pm2/logs/rhulani-pos-out.log

# Enable Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Database slow queries
mysql -h production_host -u prod_user -p -e "SET GLOBAL slow_query_log = 'ON';"
```

## Rollback Procedures

### If Issues Occur

```bash
# 1. Stop current application
pm2 stop rhulani-pos

# 2. Restore from backup
tar -xzf /backups/rhulani-pos/app_YYYYMMDD_HHMMSS.tar.gz -C /

# 3. Restore database
mysql -h production_host -u prod_user -p rhulanituckshop_prod < /backups/rhulani-pos/db_YYYYMMDD_HHMMSS.sql

# 4. Restart application
pm2 start rhulani-pos

# 5. Verify
curl https://pos.yourstore.co.za
```

## Production Best Practices

### Security

1. **Firewall Rules**
   - Allow only necessary ports (80, 443)
   - Restrict database access to app server only
   - Enable UFW: `sudo ufw enable`

2. **System Hardening**
   - Keep OS updated: `sudo apt update && sudo apt upgrade`
   - Disable root login
   - Enable SSH key authentication
   - Set strong sudo password

3. **Database Security**
   - Regular password rotation
   - Enable query logging
   - Restrict user privileges
   - Regular backups

4. **Application Security**
   - Keep dependencies updated
   - Scan for vulnerabilities: `npm audit`
   - Use environment variables for secrets
   - Implement rate limiting

### Performance

1. **Database Optimization**
   ```sql
   -- Enable query cache
   SET GLOBAL query_cache_type = 1;
   SET GLOBAL query_cache_size = 268435456;
   
   -- Optimize tables
   OPTIMIZE TABLE users, products, sales;
   ```

2. **Caching**
   - Enable Redis for session caching
   - Cache static assets
   - Use CDN for images

3. **Monitoring**
   - Monitor CPU usage
   - Monitor memory usage
   - Monitor disk space
   - Monitor network latency

### Maintenance

1. **Regular Tasks**
   - Daily: Verify backups, check logs
   - Weekly: Review security logs, test backups
   - Monthly: Database optimization, dependency updates
   - Quarterly: Security audit, performance review

2. **Updates**
   - Test updates in staging first
   - Schedule updates during low-traffic periods
   - Have rollback plan ready
   - Monitor after updates

## Support & Troubleshooting

### Common Issues

**High CPU Usage**
```bash
# Check processes
top -b -n 1 | head -20

# Check slow queries
mysql > SHOW PROCESSLIST;
```

**Database Connection Issues**
```bash
# Test connection
mysql -h host -u user -p -e "SELECT 1;"

# Check connections
mysql > SHOW STATUS WHERE variable_name IN ('Threads_connected', 'Max_connections');
```

**Disk Space Issues**
```bash
# Check disk usage
df -h

# Find large files
find / -type f -size +1G

# Clean logs
rm -f /var/log/*.{1,2,3,4,5}
```

### Getting Help

1. Check logs: `/home/ubuntu/.pm2/logs/`
2. Review error messages
3. Check system resources
4. Contact support with details

## Version Control

### Rollback by Version

```bash
# View deployment history
git log --oneline

# Rollback to specific version
git checkout tags/v1.0.0

# Rebuild and deploy
npm run build
pm2 restart all
```

---

**Last Updated:** April 24, 2026  
**Next Review:** June 24, 2026
