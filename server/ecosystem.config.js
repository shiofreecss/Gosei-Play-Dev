module.exports = {
  apps: [{
    name: 'gosei-play-server',
    script: './cluster.js',
    instances: 1, // Single cluster manager
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'development',
      PORT: 3001,
      REDIS_HOST: 'localhost',
      REDIS_PORT: 6379
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001,
      REDIS_HOST: 'localhost',
      REDIS_PORT: 6379
    },
    // Memory and CPU limits for 2GB VPS
    max_memory_restart: '1500M', // Restart if memory exceeds 1.5GB (fixed format)
    node_args: '--max-old-space-size=1536', // Set Node.js heap limit
    
    // Logging
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm Z',
    
    // Auto restart settings
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    
    // Monitoring
    monitoring: true,
    pmx: true,
    
    // Advanced PM2 features
    kill_timeout: 5000,
    listen_timeout: 8000,
    
    // Environment-specific overrides
    env_staging: {
      NODE_ENV: 'staging',
      PORT: 3001
    }
  }],

  deploy: {
    production: {
      user: 'deploy',
      host: 'gosei-svr-01.beaver.foundation',
      ref: 'origin/main',
      repo: 'your-repo-url',
      path: '/var/www/gosei-play',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run pm2:restart',
      'pre-setup': ''
    }
  }
}; 