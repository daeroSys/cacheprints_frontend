import { SAMPLE_MATERIALS, SAMPLE_TRANSACTIONS } from '../src/utils/sampleData.js';

// Replicating the logic from getInventoryMetrics
const usageMap = {};
SAMPLE_TRANSACTIONS.forEach(txn => {
  if (txn.type === 'Stock-Out') {
    txn.items.forEach(item => {
      const mid = item.materialId;
      usageMap[mid] = (usageMap[mid] || 0) + Number(item.qty);
    });
  }
});

console.log('--- REORDER LEVELS (Based on Sample Data) ---');
SAMPLE_MATERIALS.filter(m => !m.isArchived).forEach(m => {
  const mid = m.id;
  // Assume transactions cover a 30 day period for simplicity
  const avgDailyUsage = (usageMap[mid] || 0) / 30;
  
  const leadTime = m.leadTime || 7;
  const reorderQty = m.reorderQuantity || 0;
  
  const reorderLevel = avgDailyUsage * leadTime;
  
  console.log(`Material: ${m.name}`);
  console.log(`  Current Stock: ${m.quantity} ${m.unit}`);
  console.log(`  Lead Time: ${leadTime} days`);
  console.log(`  Avg Daily Usage: ${avgDailyUsage.toFixed(2)} ${m.unit}/day`);
  console.log(`  Computed Reorder Level: ${Math.round(reorderLevel)} ${m.unit}`);
  console.log('-----------------------------------');
});
