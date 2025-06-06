# PM2 Ecosystem Configuration for Gosei Server

This document provides PM2 configuration templates and management commands for running the Gosei server in production with optimal load balancing and monitoring.

## Ecosystem Configuration Files

### Primary Configuration (`ecosystem.config.js`)

Place this file in `/var/www/gosei/heroku-server/ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'gosei-server-cluster',
      script: './server.js',
      instances: 2, // 2 instances for 2GB RAM server
      exec_mode: 'cluster',
      
      // Environment configurations
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
        DEBUG: 'false'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        DEBUG: 'false'
      },
      
      // Memory and performance limits
      max_memory_restart: '400M',
      node_args: '--max-old-space-size=384',
      
      // Clustering options
      kill_timeout: 5000,
      listen_timeout: 8000,
      
      // Logging configuration
      log_file: '/var/log/pm2/gosei-combined.log',
      out_file: '/var/log/pm2/gosei-out.log',
      error_file: '/var/log/pm2/gosei-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm Z',
      merge_logs: true,
      
      // Auto restart settings
      watch: false,
      ignore_watch: ['node_modules', 'logs', '.git'],
      
      // Restart behavior
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Health monitoring
      health_check_grace_period: 3000,
      
      // Source map support
      source_map_support: true,
      
      // Instance variables
      instance_var: 'INSTANCE_ID'
    },
    {
      name: 'gosei-server-backup',
      script: './server.js',
      instances: 1,
      exec_mode: 'fork',
      
      env: {
        NODE_ENV: 'development',
        PORT: 3002,
        DEBUG: 'false'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3002,
        DEBUG: 'false'
      },
      
      // Backup server gets less memory
      max_memory_restart: '300M',
      node_args: '--max-old-space-size=256',
      
      // Logging
      log_file: '/var/log/pm2/gosei-backup-combined.log',
      out_file: '/var/log/pm2/gosei-backup-out.log',
      error_file: '/var/log/pm2/gosei-backup-error.log',
      
      // Restart settings
      restart_delay: 2000,
      max_restarts: 5,
      min_uptime: '5s',
      
      watch: false
    }
  ],
  
  // Deployment configuration (optional)
  deploy: {
    production: {
      user: 'gosei',
      host: 'gosei-svr-01.beaver.foundation',
      ref: 'origin/main',
      repo: 'https://github.com/yourusername/gosei-play.git',
      path: '/var/www/gosei',
      'post-deploy': 'cd heroku-server && npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'mkdir -p /var/log/pm2'
    }
  }
};
```

### Alternative High-Performance Configuration

For servers with more resources or higher traffic:

```javascript
// ecosystem.high-performance.config.js
module.exports = {
  apps: [{
    name: 'gosei-server-hp',
    script: './server.js',
    instances: 'max', // Uses all CPU cores
    exec_mode: 'cluster',
    
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001,
      UV_THREADPOOL_SIZE: 16 // Increase thread pool
    },
    
    // Higher memory limits
    max_memory_restart: '800M',
    node_args: '--max-old-space-size=768 --optimize-for-size',
    
    // Performance optimizations
    kill_timeout: 3000,
    listen_timeout: 5000,
    
    // Advanced restart options
    exponential_backoff_restart_delay: 100,
    max_restarts: 15,
    min_uptime: '30s'
  }]
};
```

## PM2 Management Commands

### Starting the Application

```bash
# Navigate to server directory
cd /var/www/gosei/heroku-server

# Start with production environment
pm2 start ecosystem.config.js --env production

# Start with specific configuration
pm2 start ecosystem.high-performance.config.js --env production

# Start single app
pm2 start server.js --name gosei-single --instances 1
```

### Monitoring and Status

```bash
# Check status of all processes
pm2 status

# Detailed process information
pm2 show gosei-server-cluster

# Real-time monitoring
pm2 monit

# CPU and memory usage
pm2 list --sort-by cpu
pm2 list --sort-by memory

# Process logs
pm2 logs
pm2 logs gosei-server-cluster
pm2 logs --lines 100
```

### Process Management

```bash
# Restart all processes
pm2 restart all

# Restart specific app
pm2 restart gosei-server-cluster

# Reload (0-downtime restart for cluster mode)
pm2 reload all
pm2 reload gosei-server-cluster

# Stop processes
pm2 stop all
pm2 stop gosei-server-cluster

# Delete processes
pm2 delete all
pm2 delete gosei-server-cluster
```

### Scaling Operations

```bash
# Scale cluster to 4 instances
pm2 scale gosei-server-cluster 4

# Scale down to 1 instance
pm2 scale gosei-server-cluster 1

# Auto-scale based on CPU/memory
pm2 start ecosystem.config.js --env production --watch-cpu-max 80
```

### Configuration Management

```bash
# Save current PM2 configuration
pm2 save

# Restore saved configuration
pm2 resurrect

# Generate startup script
pm2 startup
# Follow the command it provides

# Update environment variables
pm2 restart gosei-server-cluster --update-env
```

## Performance Optimization Commands

### Memory Management

```bash
# Force garbage collection
pm2 reload all

# Check memory usage
pm2 list --sort-by memory

# Set memory monitoring
pm2 set pm2:autodump true
pm2 set pm2:autodump-interval 30000
```

### Log Management

```bash
# Flush all logs
pm2 flush

# Rotate logs
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true

# View logs in real-time
pm2 logs --raw | grep ERROR
pm2 logs gosei-server-cluster --timestamp
```

## Health Checks and Monitoring

### Built-in Health Monitoring

```bash
# Enable health check endpoint
# Add to your server.js:
app.get('/health', (req, res) => {
  const memUsage = process.memoryUsage();
  const uptime = process.uptime();
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: uptime,
    memory: {
      rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB'
    },
    processId: process.pid,
    instanceId: process.env.INSTANCE_ID || 'unknown'
  });
});
```

### PM2 Plus Integration (Optional)

```bash
# Install PM2 Plus for advanced monitoring
pm2 install pm2-server-monit

# Link to PM2 Plus dashboard
pm2 link <secret_key> <public_key>

# Enable metrics
pm2 install pm2-auto-pull
```

## Troubleshooting Commands

### Common Issues

```bash
# Kill all PM2 processes (emergency stop)
pm2 kill

# Reset PM2 configuration
pm2 kill
pm2 start ecosystem.config.js --env production

# Check for zombie processes
ps aux | grep node
pkill -f "node.*server.js"

# Verify port usage
netstat -tulpn | grep :3001
lsof -i :3001

# Check system resources
free -h
df -h
top -p $(pgrep -f "PM2")
```

### Log Analysis

```bash
# Search for errors in logs
pm2 logs | grep -i error
grep -r "ERROR" /var/log/pm2/

# Monitor specific patterns
pm2 logs --raw | grep -E "(disconnect|timeout|error)"

# Real-time error monitoring
tail -f /var/log/pm2/gosei-error.log | grep -i critical
```

### Performance Debugging

```bash
# CPU profiling
pm2 start server.js --node-args="--prof"

# Memory heap snapshots
pm2 start server.js --node-args="--inspect"

# Debug mode
pm2 start server.js --node-args="--inspect=0.0.0.0:9229"
```

## Automated Scripts

### Health Check Script

Create `/var/www/gosei/pm2-health-check.sh`:

```bash
#!/bin/bash
HEALTH_ENDPOINT="http://localhost:3001/health"
LOG_FILE="/var/log/pm2-health.log"

response=$(curl -s -w "%{http_code}" -o /dev/null $HEALTH_ENDPOINT)

if [ "$response" -eq 200 ]; then
    echo "$(date): PM2 health check passed" >> $LOG_FILE
else
    echo "$(date): PM2 health check failed (HTTP $response)" >> $LOG_FILE
    pm2 reload all
    sleep 5
    pm2 status >> $LOG_FILE
fi
```

### Auto-restart Script

Create `/var/www/gosei/pm2-auto-restart.sh`:

```bash
#!/bin/bash
# Auto-restart based on memory usage

MEMORY_THRESHOLD=80  # Percentage
CURRENT_MEMORY=$(free | grep Mem | awk '{printf("%.0f"), $3/$2 * 100.0}')

if [ "$CURRENT_MEMORY" -gt "$MEMORY_THRESHOLD" ]; then
    echo "$(date): High memory usage ($CURRENT_MEMORY%), restarting PM2 processes"
    pm2 reload all
    echo "$(date): PM2 processes reloaded"
fi
```

## Best Practices

1. **Always use ecosystem files** for consistent deployments
2. **Monitor memory usage** regularly with `pm2 monit`
3. **Set up log rotation** to prevent disk space issues
4. **Use cluster mode** for better performance and reliability
5. **Test configuration changes** in development first
6. **Keep PM2 updated**: `npm install -g pm2@latest`
7. **Backup ecosystem configs** before making changes
8. **Use graceful shutdowns** with proper signal handling
9. **Monitor error logs** for application issues
10. **Scale based on actual traffic patterns**

Your PM2 setup should now provide robust process management with monitoring, automatic restarts, and load balancing for optimal performance! 