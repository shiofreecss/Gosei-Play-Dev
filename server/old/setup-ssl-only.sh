#!/bin/bash

# Standalone SSL Setup Script for Gosei Server
# Run this if SSL setup didn't complete during main deployment

# Configuration
DOMAIN="gosei-svr-01.beaver.foundation"
EMAIL="nhvu.dalat@gmail.com"

echo "🔐 Starting SSL setup for ${DOMAIN}..."

# Install Certbot
echo "Installing Certbot..."
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
echo "Obtaining SSL certificate..."
sudo certbot certonly --webroot -w /var/www/html -d ${DOMAIN} --non-interactive --agree-tos --email ${EMAIL}

if [ $? -eq 0 ]; then
    echo "✅ SSL certificate obtained successfully!"
    
    # Update nginx configuration with SSL
    echo "Updating Nginx configuration..."
    sudo tee /etc/nginx/sites-available/${DOMAIN} > /dev/null << 'EOF'
upstream gosei_backend {
    least_conn;
    server 127.0.0.1:3001 max_fails=3 fail_timeout=30s weight=3;
    server 127.0.0.1:3002 backup max_fails=2 fail_timeout=15s;
    keepalive 32;
}

server {
    listen 80;
    server_name gosei-svr-01.beaver.foundation;
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name gosei-svr-01.beaver.foundation;
    
    ssl_certificate /etc/letsencrypt/live/gosei-svr-01.beaver.foundation/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gosei-svr-01.beaver.foundation/privkey.pem;
    
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    location / {
        proxy_pass http://gosei_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /socket.io/ {
        proxy_pass http://gosei_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
    
    location /health {
        access_log off;
        proxy_pass http://gosei_backend;
        proxy_set_header Host $host;
    }
}
EOF
    
    # Test and reload nginx
    echo "Testing Nginx configuration..."
    if sudo nginx -t; then
        echo "✅ Nginx configuration is valid"
        sudo systemctl reload nginx
        echo "✅ Nginx reloaded with SSL"
        echo ""
        echo "🎉 SSL setup completed successfully!"
        echo "Your server is now available at: https://${DOMAIN}"
    else
        echo "❌ Nginx configuration test failed"
        exit 1
    fi
else
    echo "❌ SSL certificate generation failed"
    echo "Make sure your domain ${DOMAIN} points to this server"
    exit 1
fi 