import fs from 'fs';

let content = fs.readFileSync('src/db/syncMemory.ts', 'utf8');

content = content.replace(
  `import { maintenanceTasks, activities, calendarEvents, needs, splitBills, users } from './schema.js';`,
  `import { maintenanceTasks, activities, calendarEvents, needs, splitBills, users, houseMembers } from './schema.js';`
);

const appendMembers = `
    const allMembers = await db.select().from(houseMembers);
    store.members = allMembers.map(m => ({
      id: m.id.toString(),
      houseId: m.houseId,
      userId: m.userId,
      role: m.role as any,
      joinedAt: m.joinedAt ? m.joinedAt.toISOString() : new Date().toISOString(),
    }));
`;

content = content.replace(
  `    // For now, this is enough to show Maintenance, Activities, and Users`,
  appendMembers + `\n    // For now, this is enough to show Maintenance, Activities, and Users`
);

fs.writeFileSync('src/db/syncMemory.ts', content);
