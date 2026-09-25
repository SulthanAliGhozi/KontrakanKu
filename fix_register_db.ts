import fs from 'fs';

let content = fs.readFileSync('src/db/users.ts', 'utf8');

content = content.replace(
  `    const rows = await db.select().from(users).where(eq(users.uid, params.uid));
    return rows[0];
  } catch (error) {`,
  `    const rows = await db.select().from(users).where(eq(users.uid, params.uid));
    
    // Auto-join house_harmoni
    try {
      const { houseMembers } = await import('./schema.js');
      await db.insert(houseMembers)
        .values({
          houseId: 'house_harmoni',
          userId: params.uid,
          role: params.role || 'member',
          status: 'active',
        })
        .onDuplicateKeyUpdate({ set: { role: params.role || 'member' } });
    } catch (err) {
      console.error('Failed to auto-join house:', err);
    }

    return rows[0];
  } catch (error) {`
);

fs.writeFileSync('src/db/users.ts', content);
