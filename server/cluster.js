const cluster = require('cluster');
const os = require('os');
const path = require('path');

// Memory monitoring and management
const MEMORY_THRESHOLD = 1.5 * 1024 * 1024 * 1024; // 1.5GB threshold for 2GB VPS
const CHECK_INTERVAL = 30000; // Check every 30 seconds

// Get optimal number of workers for 2GB RAM
// Conservative approach: 2-4 workers to avoid memory issues
const numCPUs = os.cpus().length;
const maxWorkers = Math.min(numCPUs, 4); // Cap at 4 workers for 2GB RAM
const numWorkers = process.env.NODE_ENV === 'production' ? maxWorkers : 2;

console.log(`🚀 Starting Gosei Play Server Cluster`);
console.log(`📊 System Info:`);
console.log(`   - CPUs: ${numCPUs}`);
console.log(`   - Workers: ${numWorkers}`);
console.log(`   - Memory: ${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB total`);
console.log(`   - Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔧 Domain: gosei-svr-01.beaver.foundation`);

if (cluster.isMaster) {
  console.log(`🎯 Master process ${process.pid} is running`);
  
  // Track worker health
  const workers = new Map();
  
  // Fork workers
  for (let i = 0; i < numWorkers; i++) {
    const worker = cluster.fork();
    workers.set(worker.id, {
      process: worker,
      startTime: Date.now(),
      restarts: 0
    });
    console.log(`👷 Worker ${worker.process.pid} started (ID: ${worker.id})`);
  }
  
  // Handle worker deaths and restart
  cluster.on('exit', (worker, code, signal) => {
    const workerInfo = workers.get(worker.id);
    const uptime = workerInfo ? Date.now() - workerInfo.startTime : 0;
    
    console.log(`💀 Worker ${worker.process.pid} died (code: ${code}, signal: ${signal})`);
    console.log(`   - Uptime: ${Math.round(uptime / 1000)}s`);
    
    if (workerInfo) {
      workerInfo.restarts++;
      console.log(`   - Restart count: ${workerInfo.restarts}`);
      
      // Prevent infinite restart loops
      if (workerInfo.restarts < 5) {
        console.log(`🔄 Restarting worker...`);
        const newWorker = cluster.fork();
        workers.set(newWorker.id, {
          process: newWorker,
          startTime: Date.now(),
          restarts: workerInfo.restarts
        });
        workers.delete(worker.id);
      } else {
        console.log(`❌ Worker ${worker.id} exceeded max restarts (5), not restarting`);
        workers.delete(worker.id);
      }
    } else {
      // Start new worker if we don't have restart info
      const newWorker = cluster.fork();
      workers.set(newWorker.id, {
        process: newWorker,
        startTime: Date.now(),
        restarts: 0
      });
    }
  });
  
  // Monitor system resources
  setInterval(() => {
    const used = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    console.log(`📊 System Stats:`);
    console.log(`   - Total Memory: ${Math.round(totalMem / 1024 / 1024)}MB`);
    console.log(`   - Used Memory: ${Math.round(usedMem / 1024 / 1024)}MB (${Math.round((usedMem / totalMem) * 100)}%)`);
    console.log(`   - Free Memory: ${Math.round(freeMem / 1024 / 1024)}MB`);
    console.log(`   - Active Workers: ${Object.keys(cluster.workers).length}`);
    
    // Check if we're approaching memory limits
    if (usedMem > MEMORY_THRESHOLD) {
      console.log(`⚠️  High memory usage detected! Consider restarting workers.`);
      
      // Gracefully restart workers one by one to free memory
      const workerIds = Object.keys(cluster.workers);
      if (workerIds.length > 0) {
        const workerId = workerIds[0]; // Restart oldest worker first
        console.log(`🔄 Restarting worker ${workerId} due to high memory usage`);
        cluster.workers[workerId].kill('SIGTERM');
      }
    }
    
    // Log worker-specific memory usage
    Object.values(cluster.workers).forEach(worker => {
      worker.send({ type: 'memory-check' });
    });
    
  }, CHECK_INTERVAL);
  
  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.log('🛑 Received SIGTERM, shutting down gracefully...');
    
    Object.values(cluster.workers).forEach(worker => {
      worker.kill('SIGTERM');
    });
    
    setTimeout(() => {
      console.log('🔌 Forcing shutdown...');
      process.exit(0);
    }, 10000); // Force shutdown after 10 seconds
  });
  
  process.on('SIGINT', () => {
    console.log('🛑 Received SIGINT, shutting down gracefully...');
    
    Object.values(cluster.workers).forEach(worker => {
      worker.kill('SIGTERM');
    });
    
    setTimeout(() => {
      console.log('🔌 Forcing shutdown...');
      process.exit(0);
    }, 5000); // Force shutdown after 5 seconds
  });
  
} else {
  // Worker process - run the actual server
  console.log(`👷 Worker ${process.pid} starting...`);
  
  // Handle memory check requests from master
  process.on('message', (msg) => {
    if (msg.type === 'memory-check') {
      const used = process.memoryUsage();
      console.log(`   Worker ${process.pid}: RSS=${Math.round(used.rss / 1024 / 1024)}MB, Heap=${Math.round(used.heapUsed / 1024 / 1024)}MB`);
    }
  });
  
  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.log(`👷 Worker ${process.pid} received SIGTERM, shutting down gracefully...`);
    
    // Give ongoing operations time to complete
    setTimeout(() => {
      process.exit(0);
    }, 5000);
  });
  
  // Start the actual server
  require('./server-clustered.js');
}

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
}); 