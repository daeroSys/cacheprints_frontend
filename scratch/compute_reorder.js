import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../cacheprints-backend/.env') });

import { getInventoryMetrics } from '../../cacheprints-backend/services/inventoryService.js';

async function run() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cacheprints';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
    
    const metrics = await getInventoryMetrics();
    
    console.log('--- REORDER LEVELS COMPILATION ---');
    metrics.forEach(m => {
      console.log(`Material: ${m.name}`);
      console.log(`  Current Stock: ${m.effectiveStock} ${m.unit}`);
      console.log(`  Lead Time: ${m.leadTime || 7} days`);
      console.log(`  Avg Daily Usage: ${m.avgDailyUsage.toFixed(2)} ${m.unit}/day`);
      console.log(`  Computed Reorder Level: ${Math.round(m.reorderLevel)} ${m.unit}`);
      console.log(`  Status: ${m.status}`);
      console.log('-----------------------------------');
    });
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
