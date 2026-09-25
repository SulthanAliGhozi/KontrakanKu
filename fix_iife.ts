import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

const target = `  // Initialize Cloud SQL data and synchronize active state
  try {
    seedInitialCloudSqlData();
    syncDbToMemory();
    const [
      dbUsers,
      dbNeeds,
      dbPurchases,
      dbExpenses,
      dbMaintenance,
      dbSettlements,
      dbWalletTxs,
      dbActivities,
    ] = await Promise.all([
      dbGetAllUsers(),
      dbGetNeeds('house_harmoni'),
      dbGetPurchases('house_harmoni'),
      dbGetExpenses('house_harmoni'),
      dbGetMaintenance('house_harmoni'),
      dbGetSettlements('house_harmoni'),
      dbGetWalletTxs('house_harmoni'),
      dbGetActivities('house_harmoni'),
    ]);
    store.syncFromCloudSql({
      users: dbUsers,
      needs: dbNeeds,
      purchases: dbPurchases,
      expenses: dbExpenses,
      maintenance: dbMaintenance,
      settlements: dbSettlements,
      walletTxs: dbWalletTxs,
      activities: dbActivities,
    });
    console.log(\`Cloud SQL fully synchronized: \${dbUsers.length} users, \${dbNeeds.length} needs, \${dbExpenses.length} split bills.\`);
  } catch (err) {
    console.warn('Startup Cloud SQL sync notice (will retry on query):', err);
  }`;

const replacement = `  // Initialize Cloud SQL data and synchronize active state
  (async () => {
    try {
      seedInitialCloudSqlData();
      await syncDbToMemory();
      const [
        dbUsers,
        dbNeeds,
        dbPurchases,
        dbExpenses,
        dbMaintenance,
        dbSettlements,
        dbWalletTxs,
        dbActivities,
      ] = await Promise.all([
        dbGetAllUsers(),
        dbGetNeeds('house_harmoni'),
        dbGetPurchases('house_harmoni'),
        dbGetExpenses('house_harmoni'),
        dbGetMaintenance('house_harmoni'),
        dbGetSettlements('house_harmoni'),
        dbGetWalletTxs('house_harmoni'),
        dbGetActivities('house_harmoni'),
      ]);
      store.syncFromCloudSql({
        users: dbUsers,
        needs: dbNeeds,
        purchases: dbPurchases,
        expenses: dbExpenses,
        maintenance: dbMaintenance,
        settlements: dbSettlements,
        walletTxs: dbWalletTxs,
        activities: dbActivities,
      });
      console.log(\`Cloud SQL fully synchronized: \${dbUsers.length} users, \${dbNeeds.length} needs, \${dbExpenses.length} split bills.\`);
    } catch (err) {
      console.warn('Startup Cloud SQL sync notice (will retry on query):', err);
    }
  })();`;

content = content.replace(target, replacement);

fs.writeFileSync('server.ts', content);
