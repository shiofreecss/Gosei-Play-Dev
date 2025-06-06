# 🔐 Nginx SSL Configuration Instructions

## Quick SSL Setup (After Obtaining Certificate)

Since you've already obtained your SSL certificate with certbot, here's how to update your Nginx configuration:

### Option 1: Use the Automated Script
```bash
# Make the script executable
chmod +x /var/www/gosei/server/update-nginx-ssl.sh

# Run the script (will backup current config and update with SSL)
./update-nginx-ssl.sh
```

### Option 2: Manual Configuration

#### 1. Backup Current Configuration
```bash
sudo cp /etc/nginx/sites-available/gosei-svr-01.beaver.foundation \
       /etc/nginx/sites-available/gosei-svr-01.beaver.foundation.backup
```

#### 2. Create SSL-Enabled Configuration
```bash
sudo nano /etc/nginx/sites-available/gosei-svr-01.beaver.foundation
```

Replace the content with:

```nginx
# Upstream configuration for load balancing
upstream gosei_backend {
    least_conn;
    server 127.0.0.1:3001 max_fails=3 fail_timeout=30s weight=3;
    server 127.0.0.1:3002 backup max_fails=2 fail_timeout=15s;
    keepalive 32;
    keepalive_requests 1000;
    keepalive_timeout 60s;
}

# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=general:10m rate=30r/s;
limit_req_zone $binary_remote_addr zone=socket:10m rate=100r/s;

# SSL session cache
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;

# HTTP server - redirect to HTTPS
server {
    listen 80;
    server_name gosei-svr-01.beaver.foundation;
    
    # Let's Encrypt ACME challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        allow all;
    }
    
    # Redirect all other HTTP traffic to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name gosei-svr-01.beaver.foundation;
    
    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/gosei-svr-01.beaver.foundation/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gosei-svr-01.beaver.foundation/privkey.pem;
    
    # Enhanced SSL security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' ws: wss: data: blob: 'unsafe-inline' 'unsafe-eval'" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;
    
    # Main application proxy
    location / {
        limit_req zone=general burst=50 nodelay;
        proxy_pass http://gosei_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $server_name;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 300s;
        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;
    }
    
    # WebSocket/Socket.IO specific configuration
    location /socket.io/ {
        limit_req zone=socket burst=200 nodelay;
        proxy_pass http://gosei_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $server_name;
        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;
        
        # WebSocket timeout settings
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
        proxy_connect_timeout 60s;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://gosei_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_connect_timeout 5s;
        proxy_read_timeout 10s;
    }
    
    # Static file serving with caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://gosei_backend;
        proxy_cache_valid 200 1h;
        add_header Cache-Control "public, immutable";
        expires 1h;
    }
    
    # Security: Block common attack patterns
    location ~ /\.(ht|git|svn) {
        deny all;
        return 404;
    }
    
    location ~ /\.(env|log|config) {
        deny all;
        return 404;
    }
}
```

#### 3. Test and Reload
```bash
# Test the configuration
sudo nginx -t

# If test passes, reload nginx
sudo systemctl reload nginx
```

## Verification Commands

### Check SSL Certificate
```bash
# Certificate details
sudo certbot certificates

# Certificate expiry
openssl x509 -in /etc/letsencrypt/live/gosei-svr-01.beaver.foundation/cert.pem -noout -enddate

# Test SSL connection
curl -I https://gosei-svr-01.beaver.foundation/
```

### Test Services
```bash
# Check HTTP redirect (should return 301)
curl -I http://gosei-svr-01.beaver.foundation/

# Test HTTPS
curl -I https://gosei-svr-01.beaver.foundation/

# Test health endpoint
curl https://gosei-svr-01.beaver.foundation/health
```

### Monitor Logs
```bash
# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log

# SSL certificate renewal logs
sudo journalctl -u certbot.timer
```

## Troubleshooting

### If Nginx Test Fails
```bash
# Check syntax errors
sudo nginx -t

# Restore backup if needed
sudo cp /etc/nginx/sites-available/gosei-svr-01.beaver.foundation.backup \
       /etc/nginx/sites-available/gosei-svr-01.beaver.foundation
sudo systemctl reload nginx
```

### If HTTPS Doesn't Work
1. **Check certificate paths exist:**
   ```bash
   ls -la /etc/letsencrypt/live/gosei-svr-01.beaver.foundation/
   ```

2. **Verify firewall allows HTTPS:**
   ```bash
   sudo ufw status
   # Should show: 443 ALLOW
   ```

3. **Check DNS resolution:**
   ```bash
   nslookup gosei-svr-01.beaver.foundation
   ```

## SSL Auto-Renewal

### Test Auto-Renewal
```bash
sudo certbot renew --dry-run
```

### Check Renewal Service
```bash
# Check timer status
sudo systemctl status certbot.timer

# Check for scheduled renewals
sudo systemctl list-timers | grep certbot
```

## Next Steps After SSL Setup

1. **Test your site:** https://gosei-svr-01.beaver.foundation
2. **Check SSL grade:** https://www.ssllabs.com/ssltest/analyze.html?d=gosei-svr-01.beaver.foundation
3. **Monitor performance:** Use `pm2 monit` to watch server metrics
4. **Set up monitoring alerts** for certificate expiry

🎉 **Your Gosei server is now secure with HTTPS!** 