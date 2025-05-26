# Heroku Deployment Setup for Gosei Play Server

This document outlines the deployment setup for the Gosei Play server on Heroku, which will serve as the backend for the Netlify-deployed frontend.

## Prerequisites

1. [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli) installed
2. Heroku account
3. Git installed locally

## Server Preparation

1. Navigate to the server directory:
   ```
   cd server
   ```

2. Create a new Procfile in the server directory:
   ```
   echo "web: node server.js" > Procfile
   ```

3. Make sure your server.js listens on the Heroku-assigned port:
   ```javascript
   const PORT = process.env.PORT || 3001;
   server.listen(PORT, () => {
     console.log(`Socket server listening on port ${PORT}`);
   });
   ```

4. If your server needs environment variables, add a .env.example file to document them

## Heroku Deployment Steps

1. Initialize Git repository (if not already done):
   ```
   git init
   ```

2. Create a Heroku app:
   ```
   heroku create your-app-name
   ```
   Replace `your-app-name` with your desired application name. If you don't provide a name, Heroku will generate one.

3. Set up environment variables (if needed):
   ```
   heroku config:set KEY=VALUE
   ```

4. Deploy to Heroku:
   ```
   git add .
   git commit -m "Server ready for Heroku deployment"
   git push heroku master
   ```
   Note: If your main branch is named `main` instead of `master`, use:
   ```
   git push heroku main
   ```

5. Open your deployed application:
   ```
   heroku open
   ```

6. Check logs for any issues:
   ```
   heroku logs --tail
   ```

## Verifying Heroku Deployment

Here are several ways to verify your Heroku deployment is working properly:

1. **HTTP Request Check**:
   ```
   curl https://your-app-name.herokuapp.com
   ```
   You should get a response that indicates the server is running.

2. **Health Endpoint Check**:
   If your server has a health endpoint, access it directly in your browser:
   ```
   https://your-app-name.herokuapp.com/health
   ```

3. **Heroku Dashboard**:
   - Go to the [Heroku Dashboard](https://dashboard.heroku.com/apps)
   - Select your app
   - Check the "Activity" tab to see if the build/deployment succeeded
   - Check "More" → "View logs" to see real-time logs

4. **Command Line Status Check**:
   ```
   heroku ps -a your-app-name
   ```
   This will show you if your dynos are running.

5. **Ping Test**:
   ```
   ping your-app-name.herokuapp.com
   ```
   This will check if the server is reachable.

6. **Socket.IO Connection Test**:
   Create a simple HTML file with the following content and open it in your browser:
   ```html
   <!DOCTYPE html>
   <html>
   <head>
     <title>Socket.IO Test</title>
     <script src="https://cdn.socket.io/4.4.1/socket.io.min.js"></script>
     <script>
       document.addEventListener('DOMContentLoaded', () => {
         const statusDiv = document.getElementById('status');
         const messagesDiv = document.getElementById('messages');
         
         statusDiv.innerText = 'Connecting...';
         
         // Connect to your Heroku app
         const socket = io('https://your-app-name.herokuapp.com');
         
         socket.on('connect', () => {
           statusDiv.innerText = 'Connected to server!';
           statusDiv.style.color = 'green';
           messagesDiv.innerHTML += '<p>Connected with ID: ' + socket.id + '</p>';
         });
         
         socket.on('connect_error', (error) => {
           statusDiv.innerText = 'Connection failed!';
           statusDiv.style.color = 'red';
           messagesDiv.innerHTML += '<p style="color:red">Error: ' + error.message + '</p>';
         });
         
         socket.on('disconnect', (reason) => {
           statusDiv.innerText = 'Disconnected: ' + reason;
           statusDiv.style.color = 'orange';
           messagesDiv.innerHTML += '<p>Disconnected: ' + reason + '</p>';
         });
       });
     </script>
   </head>
   <body>
     <h1>Socket.IO Connection Tester</h1>
     <div id="status" style="font-weight:bold;">Not connected</div>
     <div id="messages"></div>
   </body>
   </html>
   ```
   Remember to replace `your-app-name.herokuapp.com` with your actual Heroku app URL.

If any of these checks fail, proceed to the troubleshooting section below.

## CORS Configuration

Since your frontend on Netlify will be connecting to this Heroku backend, you need to ensure CORS is properly configured:

```javascript
// In your server.js file
const io = socketIo(server, {
  cors: {
    origin: "*", // In production, change this to your Netlify URL
    methods: ["GET", "POST"]
  }
});
```

For production, it's better to specify your exact Netlify domain rather than allowing all origins with "*".

## Testing the Connection

1. After deployment, your socket server will be available at:
   ```
   https://your-app-name.herokuapp.com
   ```

2. Use this URL as the value for the `REACT_APP_SOCKET_URL` environment variable in Netlify.

3. Test the connection by:
   - Opening your browser console on the Netlify site
   - Looking for successful socket connection messages
   - Creating a game and testing real-time functionality

## Troubleshooting

- **Connection issues**: Check Heroku logs and make sure CORS allows your Netlify domain
- **H10 - App crashed**: Check for missing dependencies or environment variables
- **H12 - Request timeout**: Check for long-running operations
- **Socket disconnects**: You might need to adjust ping/timeout settings in Socket.IO

## Scaling Considerations

For free Heroku dynos:
- Your app will sleep after 30 minutes of inactivity
- It has limited hours per month
- Consider upgrading to a hobby or professional dyno for production use

For more information on Heroku's free dyno limitations, refer to the [Heroku Dev Center](https://devcenter.heroku.com/articles/free-dyno-hours). 