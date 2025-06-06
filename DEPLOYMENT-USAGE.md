# 🚀 Gosei Server Deployment - User Setup Guide

The deployment script now includes automatic user creation and management for enhanced security.

## 📋 User Creation Options

### **Option 1: Run as Root (Recommended for new servers)**
The script will create a dedicated user for deployment:

```bash
# Run as root - script will create a deployment user
sudo ./deploy-gosei-production.sh
```

**What happens:**
1. 👤 Prompts for username (default: `gosei`)
2. 🔐 Prompts for password (minimum 8 characters)
3. ✅ Creates user with sudo privileges
4. 🔄 Switches to new user and continues deployment
5. 🧹 Cleans up temporary permissions after deployment

### **Option 2: Run as Existing User**
If you already have a non-root user with sudo privileges:

```bash
# Run as existing user
./deploy-gosei-production.sh
```

**Requirements:**
- User must have sudo privileges
- User must be able to run `sudo` commands

## 🛡️ Security Features

### **User Creation Process**
```
1. Username input (default: gosei)
   ├─ Checks if user exists
   ├─ Prompts for different name if desired
   └─ Uses existing user or creates new one

2. Password setup (new users only)
   ├─ Minimum 8 characters required
   ├─ Password confirmation
   └─ Secure password hashing

3. Sudo privileges
   ├─ Adds user to sudo group
   ├─ Temporary full sudo access during deployment
   └─ Restricted sudo access after deployment
```

### **Post-Deployment Security**
After deployment, the script creates a secure sudo configuration that only allows:
- Nginx management (`systemctl restart/reload/status nginx`)
- SSL certificate management (`certbot`)
- Firewall management (`ufw`)
- Nginx configuration testing (`nginx -t`)

## 📝 Example Usage Sessions

### **New Server Setup (as root)**
```bash
root@server:~# ./deploy-gosei-production.sh

🔍 CHECKING PREREQUISITES AND USER SETUP
[WARNING] Running as root. We'll create a dedicated user for the deployment.

👤 CREATING DEPLOYMENT USER
Creating a dedicated user for Gosei deployment...
This user will be used to run the application and manage the server.

Enter username for deployment user (default: gosei): gosei
Enter password for user 'gosei': ********
Confirm password: ********
[SUCCESS] User 'gosei' created successfully

[INFO] Switching to user 'gosei' for deployment...
[INFO] Continuing deployment as user 'gosei'...
```

### **Existing User (with sudo)**
```bash
myuser@server:~$ ./deploy-gosei-production.sh

🔍 CHECKING PREREQUISITES AND USER SETUP
[INFO] Running as user: myuser
[SUCCESS] User has sudo privileges
[SUCCESS] Prerequisites check passed
```

## 🔧 Post-Deployment User Management

### **Switch to Deployment User**
```bash
# From root or another user
su - gosei

# Or via SSH
ssh gosei@gosei-svr-01.beaver.foundation
```

### **Useful Commands for Deployment User**
```bash
# Check server status
pm2 status
pm2 monit

# Manage services (allowed without password)
sudo systemctl status nginx
sudo systemctl reload nginx
sudo certbot renew

# View logs
pm2 logs
tail -f /var/log/gosei-health.log

# Change user password
passwd
```

### **Security Management**
```bash
# View current sudo permissions
sudo -l

# Check user groups
groups

# View active SSH connections
who
```

## 🛠️ Troubleshooting

### **Permission Issues**
```bash
# If PM2 commands fail
sudo chown -R gosei:gosei /home/gosei/.pm2

# If application directory access fails
sudo chown -R gosei:gosei /var/www/gosei

# Check file permissions
ls -la /var/www/gosei
```

### **User Management Issues**
```bash
# Check if user exists
id gosei

# Check sudo privileges
sudo -l -U gosei

# Reset user password (as root)
passwd gosei

# Add user to additional groups if needed
sudo usermod -aG docker gosei  # Example: Docker group
```

### **SSH Access Setup**
```bash
# Generate SSH key for the gosei user
ssh-keygen -t rsa -b 4096 -C "gosei@gosei-svr-01.beaver.foundation"

# Copy public key to authorized_keys
mkdir -p ~/.ssh
chmod 700 ~/.ssh
# Add your public key to ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

## ✅ Best Practices

1. **Use a Strong Password**: Minimum 8 characters with mixed case, numbers, and symbols
2. **Regular Updates**: Keep the deployment user password updated
3. **SSH Key Authentication**: Set up SSH keys instead of password-only authentication
4. **Monitor Access**: Regularly check login logs with `last` command
5. **Principle of Least Privilege**: The script provides minimal required sudo access

## 🎯 Quick Start Checklist

- [ ] Run script as root on fresh server
- [ ] Choose username (or use default: `gosei`)
- [ ] Set strong password (8+ characters)
- [ ] Wait for deployment to complete
- [ ] Test login: `ssh gosei@gosei-svr-01.beaver.foundation`
- [ ] Verify services: `pm2 status` and `sudo systemctl status nginx`

Your Gosei server is now deployed with proper user security! 🚀 