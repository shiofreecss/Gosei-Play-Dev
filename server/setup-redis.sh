#!/bin/bash

# Redis Setup Script for Gosei Play Server Load Balancing
# Optimized for 2GB RAM VPS

echo "🚀 Setting up Redis for Gosei Play Server Load Balancing"
echo "📡 Domain: gosei-svr-01.beaver.foundation"

# Update system
echo "📦 Updating system packages..."
sudo apt update

# Install Redis
echo "🔧 Installing Redis Server..."
sudo apt install -y redis-server

# Create optimized Redis configuration for 2GB VPS
echo "⚙️  Configuring Redis for 2GB VPS..."

# Backup original config
sudo cp /etc/redis/redis.conf /etc/redis/redis.conf.backup

# Create optimized configuration
sudo tee /etc/redis/redis.conf.optimized > /dev/null <<EOF
# Redis Configuration for Gosei Play Server (2GB VPS)
# Optimized for memory efficiency and clustering

# Network
bind 127.0.0.1
port 6379
timeout 300
tcp-keepalive 60

# Memory Management (Conservative for 2GB VPS)
maxmemory 512mb
maxmemory-policy allkeys-lru
maxmemory-samples 5

# Persistence (Optimized for game state)
save 900 1
save 300 10
save 60 10000
stop-writes-on-bgsave-error yes
rdbcompression yes
rdbchecksum yes
dbfilename dump.rdb
dir /var/lib/redis

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log
syslog-enabled yes
syslog-ident redis

# Performance
databases 16
tcp-backlog 511
hz 10
dynamic-hz yes

# Security
requirepass ""
# Uncomment and set password for production:
# requirepass your_secure_password_here

# Pub/Sub
client-output-buffer-limit pubsub 32mb 8mb 60

# Memory optimization
hash-max-ziplist-entries 512
hash-max-ziplist-value 64
list-max-ziplist-size -2
list-compress-depth 0
set-max-intset-entries 512
zset-max-ziplist-entries 128
zset-max-ziplist-value 64

# Disable potentially memory-intensive features
repl-diskless-sync no
repl-diskless-sync-delay 5

# Enable lazy freeing (Redis 4.0+)
lazyfree-lazy-eviction yes
lazyfree-lazy-expire yes
lazyfree-lazy-server-del yes
replica-lazy-flush yes

# Disable some features not needed for game state
appendonly no
EOF

# Apply the configuration
sudo cp /etc/redis/redis.conf.optimized /etc/redis/redis.conf

# Set up proper permissions
sudo chown redis:redis /etc/redis/redis.conf
sudo chmod 640 /etc/redis/redis.conf

# Create logs directory
sudo mkdir -p /var/log/redis
sudo chown redis:redis /var/log/redis

# Configure systemd service
echo "🔧 Configuring Redis systemd service..."
sudo tee /etc/systemd/system/redis.service > /dev/null <<EOF
[Unit]
Description=Advanced key-value store for Gosei Play
After=network.target
Documentation=http://redis.io/documentation, man:redis-server(1)

[Service]
Type=notify
ExecStart=/usr/bin/redis-server /etc/redis/redis.conf
ExecStop=/bin/kill -s QUIT \$MAINPID
TimeoutStopSec=0
Restart=always
User=redis
Group=redis
RuntimeDirectory=redis
RuntimeDirectoryMode=0755

# Memory and security limits
LimitNOFILE=65535
PrivateTmp=yes
PrivateDevices=yes
ProtectHome=yes
ReadOnlyDirectories=/
ReadWriteDirectories=-/var/lib/redis
ReadWriteDirectories=-/var/log/redis

[Install]
WantedBy=multi-user.target
EOF

# Enable and start Redis
echo "▶️  Starting Redis service..."
sudo systemctl daemon-reload
sudo systemctl enable redis
sudo systemctl start redis

# Test Redis installation
echo "🧪 Testing Redis installation..."
sleep 2

if sudo systemctl is-active --quiet redis; then
    echo "✅ Redis is running successfully!"
    
    # Test Redis connection
    redis-cli ping
    if [ $? -eq 0 ]; then
        echo "✅ Redis connection test passed!"
    else
        echo "❌ Redis connection test failed!"
    fi
    
    # Show Redis info
    echo "📊 Redis Information:"
    redis-cli info memory | grep -E "(used_memory_human|maxmemory_human)"
    redis-cli info server | grep redis_version
    
else
    echo "❌ Redis failed to start!"
    sudo systemctl status redis
    exit 1
fi

# Create monitoring script
echo "📊 Creating Redis monitoring script..."
sudo tee /usr/local/bin/redis-monitor > /dev/null <<EOF
#!/bin/bash
echo "📊 Redis Status for Gosei Play Server"
echo "====================================="
echo "Service Status: \$(sudo systemctl is-active redis)"
echo "Memory Usage:"
redis-cli info memory | grep -E "(used_memory_human|maxmemory_human|used_memory_peak_human)"
echo ""
echo "Connections:"
redis-cli info clients | grep connected_clients
echo ""
echo "Operations:"
redis-cli info stats | grep -E "(total_commands_processed|instantaneous_ops_per_sec)"
echo ""
echo "Keyspace:"
redis-cli info keyspace
EOF

sudo chmod +x /usr/local/bin/redis-monitor

# Set up Redis log rotation
echo "📝 Setting up log rotation..."
sudo tee /etc/logrotate.d/redis-server > /dev/null <<EOF
/var/log/redis/redis-server.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    copytruncate
}
EOF

echo ""
echo "🎉 Redis setup completed successfully!"
echo ""
echo "📋 Next Steps:"
echo "1. Run: npm install (to install Node.js dependencies)"
echo "2. Run: npm run pm2:start (to start the load-balanced server)"
echo "3. Monitor with: redis-monitor"
echo "4. Check logs: sudo journalctl -u redis -f"
echo ""
echo "🔧 Configuration:"
echo "- Redis is bound to localhost:6379"
echo "- Memory limit: 512MB (optimized for 2GB VPS)"
echo "- Persistence: RDB snapshots enabled"
echo "- Log rotation: Daily with 52-day retention"
echo ""
echo "⚡ Performance Tips:"
echo "- Monitor memory usage with: redis-cli info memory"
echo "- Use: redis-cli monitor (to see real-time commands)"
echo "- Check server logs: sudo journalctl -u redis -f" 