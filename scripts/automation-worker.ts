#!/usr/bin/env tsx

/**
 * Automation Worker Process
 * This script runs the Bull queue processor for marketplace automation
 * 
 * Usage:
 *   npm run worker
 *   OR
 *   tsx scripts/automation-worker.ts
 * 
 * Production:
 *   pm2 start "npm run worker" --name "listing-automation"
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import express from 'express';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Import the queue (this will start processing)
import { listingQueue, getQueueStats } from '../lib/automation/queue';

console.log('🚀 Automation Worker Started');
console.log('📋 Processing marketplace automation jobs...');
console.log(`🔗 Redis: ${process.env.REDIS_URL || 'redis://127.0.0.1:6379'}`);
console.log('');

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n⚠️  SIGTERM received, closing worker gracefully...');
  await listingQueue.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n⚠️  SIGINT received, closing worker gracefully...');
  await listingQueue.close();
  process.exit(0);
});

// Health check endpoint
const app = express();

app.get('/health', async (req: any, res: any) => {
  try {
    const stats = await getQueueStats();
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      queue: stats,
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});

const PORT = process.env.WORKER_PORT || 3001;
app.listen(PORT, () => {
  console.log(`💚 Health check available at http://localhost:${PORT}/health`);
  console.log('');
});

// Periodic stats logging
setInterval(async () => {
  try {
    const stats = await getQueueStats();
    console.log(`
📊 Queue Stats (${new Date().toLocaleTimeString()})
   Waiting: ${stats.waiting}
   Active: ${stats.active}
   Completed: ${stats.completed}
   Failed: ${stats.failed}
   Delayed: ${stats.delayed}
    `);
  } catch (error: any) {
    console.error('Error fetching stats:', error.message);
  }
}, 60000); // Every minute

console.log('✅ Worker is ready and waiting for jobs!');
console.log('Press Ctrl+C to stop\n');
