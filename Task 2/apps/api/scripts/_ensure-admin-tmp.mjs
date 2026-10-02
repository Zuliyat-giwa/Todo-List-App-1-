// Local test setup helper: makes sure the admin account exists with the password
// from ADMIN_PASSWORD, so the admin checks in the QA harness can sign in.
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config({ quiet: true });

const email = (process.env.ADMIN_EMAIL || 'admin@modeza.test').toLowerCase();
const pw = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
const prisma = new PrismaClient();
const passwordHash = await bcrypt.hash(pw, 12);
await prisma.user.upsert({
  where: { email },
  create: { email, name: 'Store Admin', role: 'ADMIN', emailVerified: true, passwordHash },
  update: { role: 'ADMIN', passwordHash },
});
console.log(`admin ready: ${email}`);
await prisma.$disconnect();