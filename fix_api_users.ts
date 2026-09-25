import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

// Replace /api/users endpoint
content = content.replace(
  `  app.get('/api/users', (req, res) => {
    res.json({ users: store.users });
  });`,
  `  app.get('/api/users', async (req, res) => {
    try {
      const dbUsersList = await dbGetAllUsers();
      res.json({ users: dbUsersList.length > 0 ? dbUsersList : store.users });
    } catch (e) {
      res.json({ users: store.users });
    }
  });`
);

fs.writeFileSync('server.ts', content);
