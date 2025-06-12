# Socket.IO Server Deployment on AlmaLinux 9 VPS

This guide walks through setting up a Socket.IO server with database integration on an AlmaLinux 9 VPS.

## 🌐 **Production Instance: [https://play.gosei.xyz](https://play.gosei.xyz)** ✅

This deployment guide was used to successfully deploy the live production instance of Gosei Play.

## Server Setup

### Initial Setup

```bash
# Update system packages
sudo dnf update -y

# Install development tools
sudo dnf groupinstall "Development Tools" -y

# Install Node.js and npm
sudo dnf module install nodejs:18 -y

# Install required utilities
sudo dnf install git nginx -y
```

### Firewall Configuration

```bash
# Install and enable firewalld if not already present
sudo dnf install firewalld -y
sudo systemctl enable --now firewalld

# Allow HTTP, HTTPS, and SSH
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-service=ssh

# Custom port for Socket.IO (if needed)
sudo firewall-cmd --permanent --add-port=3000/tcp

# Reload firewall
sudo firewall-cmd --reload
```

## Database Setup

### PostgreSQL Installation

```bash
# Install PostgreSQL 14
sudo dnf module install postgresql:14 -y

# Initialize database
sudo postgresql-setup --initdb

# Start and enable PostgreSQL service
sudo systemctl enable --now postgresql

# Access PostgreSQL
sudo -u postgres psql
```

### Database Configuration

```sql
-- Create a dedicated database user with password
CREATE USER goseiuser WITH PASSWORD 'strong-password-here';

-- Create a database for your game
CREATE DATABASE goseidb;

-- Grant privileges to the user
GRANT ALL PRIVILEGES ON DATABASE goseidb TO goseiuser;

-- Exit PostgreSQL
\q
```

## Gosei Server Deployment

### Clone and Setup Gosei Repository

```bash
# Create application directory
mkdir -p /var/www/gosei
cd /var/www/gosei

# Clone your Gosei repository
git clone https://github.com/yourusername/Gosei-Play-Internal.git .

# Install dependencies
npm install

# Install PM2 for process management
npm install pm2 -g
```

### Configure Database Connection

Create or edit your database configuration file (e.g., `config/database.js`):

```javascript
module.exports = {
  development: {
    client: 'postgresql',
    connection: {
      host: 'localhost',
      database: 'goseidb',
      user: 'goseiuser',
      password: 'strong-password-here'
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations'
    }
  },
  production: {
    client: 'postgresql',
    connection: {
      host: 'localhost',
      database: 'goseidb',
      user: 'goseiuser',
      password: 'strong-password-here'
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations'
    }
  }
};
```

### Gosei Database Schema Setup

Create a migration file for the Gosei database schema:

```javascript
// migrations/gosei_schema.js
exports.up = function(knex) {
  return Promise.all([
    // Messages table for chat
    knex.schema.createTable('messages', table => {
      table.increments('id').primary();
      table.string('user_id').notNullable();
      table.text('content').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
    }),
    
    // Users table
    knex.schema.createTable('users', table => {
      table.increments('id').primary();
      table.string('username').notNullable().unique();
      table.string('email').unique();
      table.string('password_hash').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('last_login');
    }),
    
    // Game sessions table
    knex.schema.createTable('game_sessions', table => {
      table.increments('id').primary();
      table.string('session_id').notNullable().unique();
      table.timestamp('started_at').defaultTo(knex.fn.now());
      table.timestamp('ended_at');
      table.jsonb('game_state');
    }),
    
    // Game moves/actions table
    knex.schema.createTable('game_moves', table => {
      table.increments('id').primary();
      table.integer('session_id').references('id').inTable('game_sessions');
      table.integer('user_id').references('id').inTable('users');
      table.string('action_type').notNullable();
      table.jsonb('action_data');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    })
  ]);
};

exports.down = function(knex) {
  return Promise.all([
    knex.schema.dropTable('game_moves'),
    knex.schema.dropTable('game_sessions'),
    knex.schema.dropTable('messages'),
    knex.schema.dropTable('users')
  ]);
};
```

Run the migration:

```bash
npx knex migrate:latest --env production
```

### Create Gosei Socket.IO Server

Create or update your server file (e.g., `server.js`):

```javascript
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const knex = require('knex');
const dbConfig = require('./config/database');

// Initialize database connection
const db = knex(dbConfig.production);

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Serve static files
app.use(express.static('public'));

// Active game sessions
const activeSessions = new Map();

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  let currentUser = null;
  let currentSession = null;
  
  // User authentication
  socket.on('auth', async (userData) => {
    try {
      // Simple authentication - in production use proper auth
      const user = await db('users')
        .where('username', userData.username)
        .first();
      
      if (user) {
        currentUser = user;
        socket.emit('auth_success', { userId: user.id, username: user.username });
        
        // Update last login
        await db('users')
          .where('id', user.id)
          .update({ last_login: new Date() });
      } else {
        socket.emit('auth_error', { message: 'Authentication failed' });
      }
    } catch (error) {
      console.error('Auth error:', error);
      socket.emit('auth_error', { message: 'Server error during authentication' });
    }
  });
  
  // Chat message handling
  socket.on('chat_message', async (msg) => {
    if (!currentUser) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }
    
    try {
      // Save message to database
      const [messageId] = await db('messages').insert({
        user_id: currentUser.id,
        content: msg.content
      }, 'id');
      
      // Broadcast to all connected clients
      io.emit('chat_message', {
        id: messageId,
        user_id: currentUser.id,
        username: currentUser.username,
        content: msg.content,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Message error:', error);
      socket.emit('error', { message: 'Failed to save message' });
    }
  });
  
  // Game session management
  socket.on('create_game', async () => {
    if (!currentUser) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }
    
    try {
      // Create new game session
      const sessionId = `game_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const initialState = { players: [currentUser.id], status: 'waiting' };
      
      const [gameId] = await db('game_sessions').insert({
        session_id: sessionId,
        game_state: initialState
      }, 'id');
      
      // Join socket to session room
      socket.join(sessionId);
      currentSession = sessionId;
      
      // Store session in memory
      activeSessions.set(sessionId, {
        id: gameId,
        state: initialState,
        players: [socket.id]
      });
      
      socket.emit('game_created', { 
        sessionId, 
        gameId,
        state: initialState
      });
    } catch (error) {
      console.error('Game creation error:', error);
      socket.emit('error', { message: 'Failed to create game' });
    }
  });
  
  // Game move/action handling
  socket.on('game_action', async (action) => {
    if (!currentUser || !currentSession) {
      socket.emit('error', { message: 'Not in an active game session' });
      return;
    }
    
    try {
      // Get current session
      const session = activeSessions.get(currentSession);
      if (!session) {
        socket.emit('error', { message: 'Game session not found' });
        return;
      }
      
      // Save game move to database
      await db('game_moves').insert({
        session_id: session.id,
        user_id: currentUser.id,
        action_type: action.type,
        action_data: action.data
      });
      
      // Process game logic (simplified)
      // In a real game, you'd have more complex game state updates
      session.state = processGameAction(session.state, action, currentUser.id);
      
      // Update game state in database
      await db('game_sessions')
        .where('id', session.id)
        .update({ game_state: session.state });
      
      // Broadcast updated state to all players in the session
      io.to(currentSession).emit('game_update', {
        sessionId: currentSession,
        state: session.state,
        lastAction: action
      });
    } catch (error) {
      console.error('Game action error:', error);
      socket.emit('error', { message: 'Failed to process game action' });
    }
  });
  
  // Join existing game
  socket.on('join_game', async (data) => {
    if (!currentUser) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }
    
    try {
      // Check if session exists
      const session = await db('game_sessions')
        .where('session_id', data.sessionId)
        .first();
      
      if (!session) {
        socket.emit('error', { message: 'Game session not found' });
        return;
      }
      
      // Join socket to session room
      socket.join(data.sessionId);
      currentSession = data.sessionId;
      
      // Update session in memory
      const memSession = activeSessions.get(data.sessionId) || {
        id: session.id,
        state: session.game_state,
        players: []
      };
      
      memSession.players.push(socket.id);
      memSession.state.players.push(currentUser.id);
      activeSessions.set(data.sessionId, memSession);
      
      // Update game state in database
      await db('game_sessions')
        .where('id', session.id)
        .update({ game_state: memSession.state });
      
      // Notify all players in session
      io.to(data.sessionId).emit('player_joined', {
        userId: currentUser.id,
        username: currentUser.username,
        state: memSession.state
      });
    } catch (error) {
      console.error('Join game error:', error);
      socket.emit('error', { message: 'Failed to join game' });
    }
  });
  
  // Disconnect handling
  socket.on('disconnect', async () => {
    console.log('User disconnected:', socket.id);
    
    // Handle player leaving game sessions
    if (currentSession && currentUser) {
      try {
        const session = activeSessions.get(currentSession);
        if (session) {
          // Remove player from session
          session.players = session.players.filter(id => id !== socket.id);
          session.state.players = session.state.players.filter(id => id !== currentUser.id);
          
          if (session.players.length === 0) {
            // No players left, end the session
            await db('game_sessions')
              .where('id', session.id)
              .update({ 
                ended_at: new Date(),
                game_state: session.state
              });
            
            activeSessions.delete(currentSession);
          } else {
            // Update session with player removed
            await db('game_sessions')
              .where('id', session.id)
              .update({ game_state: session.state });
            
            // Notify remaining players
            io.to(currentSession).emit('player_left', {
              userId: currentUser.id,
              state: session.state
            });
          }
        }
      } catch (error) {
        console.error('Disconnect handling error:', error);
      }
    }
  });
});

// Game logic processor (simplified example)
function processGameAction(state, action, userId) {
  // This would contain your game's specific logic
  // Example:
  switch (action.type) {
    case 'start_game':
      return { ...state, status: 'in_progress' };
    case 'end_game':
      return { ...state, status: 'completed' };
    case 'player_move':
      // Process player move based on your game rules
      return { 
        ...state, 
        lastMove: { 
          userId, 
          move: action.data.move,
          timestamp: new Date()
        }
      };
    default:
      return state;
  }
}

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Gosei server running on port ${PORT}`);
});
```

### Configure package.json for Gosei Server

Make sure your package.json has the correct dependencies and scripts:

```json
{
  "name": "gosei-server",
  "version": "1.0.0",
  "description": "Gosei Play Game Server",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.6.1",
    "knex": "^2.4.2",
    "pg": "^8.11.0"
  },
  "devDependencies": {
    "nodemon": "^2.0.22"
  }
}
```

## Deploying the Gosei Server

### Process Management with PM2

```bash
# Start the Gosei application
cd /var/www/gosei
pm2 start server.js --name "gosei-server"

# Enable startup script
pm2 startup
# Follow instructions provided by PM2

# Save current processes
pm2 save
```

### Nginx Configuration as Reverse Proxy

Create an Nginx configuration file:

```bash
sudo nano /etc/nginx/conf.d/gosei.conf
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name your-gosei-domain.com;  # Replace with your domain

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and restart Nginx:

```bash
sudo nginx -t  # Test configuration
sudo systemctl restart nginx
```

## SSL/TLS Configuration for Gosei Server

```bash
# Get SSL certificate for your domain
sudo certbot --nginx -d your-gosei-domain.com

# Verify auto-renewal is set up
sudo systemctl status certbot-renew.timer
```

## Client Connection to Gosei Server

Update your client-side Socket.IO connection in your front-end code:

```javascript
const socket = io("https://your-gosei-domain.com", {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  timeout: 10000
});

// Connection status listeners
socket.on('connect', () => {
  console.log('Connected to Gosei server!');
});

socket.on('connect_error', (error) => {
  console.error('Connection to Gosei server failed:', error.message);
});

// Example authentication
function authenticateUser(username, password) {
  socket.emit('auth', { username, password });
}

// Example event listeners for Gosei game
socket.on('auth_success', (userData) => {
  console.log('Authentication successful', userData);
});

socket.on('chat_message', (message) => {
  console.log('New chat message:', message);
});

socket.on('game_update', (gameData) => {
  console.log('Game update:', gameData);
});

// Example game action emitter
function sendGameAction(actionType, actionData) {
  socket.emit('game_action', {
    type: actionType,
    data: actionData
  });
}
```

## Monitoring and Maintenance

### Monitoring the Gosei Server

```bash
# Check server status
pm2 status gosei-server

# View logs
pm2 logs gosei-server

# Monitor in real-time
pm2 monit
```

### Database Backup for Gosei

Update your backup script:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Execute backup for Gosei database
sudo -u postgres pg_dump goseidb > $BACKUP_DIR/goseidb_$TIMESTAMP.sql

# Keep only the last 7 backups
ls -t $BACKUP_DIR/goseidb_*.sql | tail -n +8 | xargs rm -f
```

## Server Scaling Considerations

As your Gosei application grows, consider:

1. **Database Scaling**:
   - Implement connection pooling
   - Consider read replicas for high-traffic scenarios

2. **Horizontal Scaling**:
   - Use Redis for Socket.IO adapter to handle multiple server instances
   - Add load balancer for multiple Node.js instances

3. **Performance Monitoring**:
   - Install monitoring tools like Prometheus and Grafana
   - Set up alerts for system resource usage 