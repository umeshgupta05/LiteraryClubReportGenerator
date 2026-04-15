import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import supabase from './config/db.js';

const users = [
  {
    username: 'admin',
    password: 'admin123',
    fullName: 'SAHE Admin',
    role: 'admin'
  },
  {
    username: 'anupama',
    password: 'anupama123',
    fullName: 'Anupama',
    role: 'admin'
  },
  {
    username: 'LCConvener',
    password: 'convener123',
    fullName: 'Dr.B.Neelambaram',
    role: 'admin'
  }
];

async function seed() {
  console.log('🌱 Starting database seeding...');

  for (const userData of users) {
    try {
      const hashedPassword = bcrypt.hashSync(userData.password, 10);
      const user = {
        id: uuidv4(),
        username: userData.username,
        password: hashedPassword,
        fullName: userData.fullName,
        role: userData.role
      };

      const { error } = await supabase.from('users').upsert([user], { onConflict: 'username' });

      if (error) {
        console.error(`❌ Error seeding user ${userData.username}:`, error.message);
      } else {
        console.log(`✅ User ${userData.username} seeded successfully.`);
      }
    } catch (err) {
      console.error(`❌ Caught error seeding user ${userData.username}:`, err.message);
    }
  }

  console.log('🏁 Seeding complete.');
  process.exit(0);
}

seed();
