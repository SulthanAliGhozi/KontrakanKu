import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
  `        unreadNotificationsCount: unreadNotifs,
        currentUser: store.users.find((u) => u.id === currentUserId) || store.users[0],
      });`,
  `        unreadNotificationsCount: unreadNotifs,
        currentUser: store.users.find((u) => u.id === currentUserId) || { id: currentUserId, name: 'Pengguna Baru', email: '' },
      });`
);

fs.writeFileSync('server.ts', content);
