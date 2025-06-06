# Client Production Configuration Guide

This guide covers updating your Gosei client application to connect to the production server at `gosei-svr-01.beaver.foundation`.

## Socket.IO Client Configuration

### Update Connection URL

Find your Socket.IO connection configuration in your client code and update it:

**Before (Development):**
```javascript
const socket = io("http://localhost:3001");
```

**After (Production):**
```javascript
const socket = io("https://gosei-svr-01.beaver.foundation", {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  maxReconnectionAttempts: 5,
  timeout: 10000,
  forceNew: false,
  upgrade: true,
  secure: true
});
```

### Environment-Based Configuration

Create environment-specific configurations:

```javascript
// config/socket.js
const getSocketConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return {
    url: isProduction 
      ? 'https://gosei-svr-01.beaver.foundation'
      : 'http://localhost:3001',
    options: {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: isProduction ? 10 : 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: isProduction ? 10000 : 5000,
      timeout: isProduction ? 15000 : 10000,
      forceNew: false,
      upgrade: true,
      secure: isProduction,
      autoConnect: true,
      
      // Production optimizations
      ...(isProduction && {
        pingTimeout: 60000,
        pingInterval: 25000,
        maxHttpBufferSize: 1e6,
        transports: ['websocket', 'polling']
      })
    }
  };
};

export default getSocketConfig;
```

## Environment Variables

### Create Environment Files

**`.env.production`:**
```
REACT_APP_SOCKET_URL=https://gosei-svr-01.beaver.foundation
REACT_APP_NODE_ENV=production
REACT_APP_DEBUG=false
REACT_APP_API_TIMEOUT=15000
```

**`.env.development`:**
```
REACT_APP_SOCKET_URL=http://localhost:3001
REACT_APP_NODE_ENV=development
REACT_APP_DEBUG=true
REACT_APP_API_TIMEOUT=10000
```

## CORS Configuration

Ensure your client can connect to the production server by updating the server CORS settings:

```javascript
// In your server.js, update CORS configuration
const io = socketIo(server, {
  cors: {
    origin: [
      'https://gosei-play.netlify.app',
      'https://*.netlify.app',
      'https://svr-01.gosei.xyz',
      'https://*.gosei.xyz',
      'https://gosei-svr-01.beaver.foundation',
      // Add your client domain here
      'https://your-client-domain.com'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  }
});
```

## Build and Deployment

### Netlify Configuration

**`netlify.toml`:**
```toml
[build]
  command = "npm run build"
  publish = "build"

[build.environment]
  REACT_APP_SOCKET_URL = "https://gosei-svr-01.beaver.foundation"
  REACT_APP_NODE_ENV = "production"

[[redirects]]
  from = "/socket.io/*"
  to = "https://gosei-svr-01.beaver.foundation/socket.io/:splat"
  status = 200
  force = true

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

## Testing Connection

### Manual Testing Script

Create a simple test to verify the connection works:

```javascript
// Test in browser console:
const testSocket = io("https://gosei-svr-01.beaver.foundation");

testSocket.on('connect', () => {
  console.log('✅ Connected to production server!');
  testSocket.disconnect();
});

testSocket.on('connect_error', (error) => {
  console.error('❌ Connection failed:', error);
});
```

Your client should now be properly configured to connect to the production Gosei server! 
