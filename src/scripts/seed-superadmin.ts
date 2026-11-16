import mongoose from 'mongoose';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const isStaging = (process.env.DEV_MODE || process.env.NODE_ENV || '').toLowerCase() === 'staging';
const MONGODB_URI = isStaging
  ? (process.env.MONGODB_URI_STAGING || process.env.MONGODB_URI || 'mongodb+srv://yoyosahoo319_db_user:1EhQEBfCuNaiadie@cluster0.tu8rpov.mongodb.net')
  : (process.env.MONGODB_URI_LOCAL || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/haven');
const DB_NAME = process.env.MONGODB_DATABASE || 'haven';
const ADMIN_NAME = process.env.SUPER_ADMIN_NAME || 'Haven Super Admin';
const ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL || 'admin@haven.local').toLowerCase().trim();
const ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'HavenAdmin2026!Secure#Access';

interface IUser {
  organizationId: mongoose.Types.ObjectId | null;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
}

const UserSchema = new mongoose.Schema<IUser>(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null },
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    role: { type: String, required: true },
    status: { type: String, default: 'ACTIVE' },
  },
  { timestamps: true, collection: 'users' },
);

const UserModel = mongoose.models.User
  ? (mongoose.models.User as mongoose.Model<IUser>)
  : mongoose.model<IUser>('User', UserSchema);

async function bootstrap() {
  console.log(`Connecting to MongoDB at: ${MONGODB_URI} (db: ${DB_NAME})...`);
  await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
  console.log('Connected to MongoDB.');

  const existingSuperAdmin = await UserModel.findOne({ role: 'SUPER_ADMIN' }).exec();

  if (existingSuperAdmin) {
    console.log(`[BOOTSTRAP] Super Admin already exists: ${existingSuperAdmin.email}`);
    console.log('[BOOTSTRAP] Skipping creation to preserve existing credentials.');
    await mongoose.disconnect();
    return;
  }

  const nameParts = ADMIN_NAME.split(' ');
  const firstName = nameParts[0] || 'Super';
  const lastName = nameParts.slice(1).join(' ') || 'Admin';

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  const superAdmin = await UserModel.create({
    organizationId: null,
    email: ADMIN_EMAIL,
    passwordHash,
    firstName,
    lastName,
    role: 'SUPER_ADMIN',
    status: 'ACTIVE',
  });

  console.log('=====================================================');
  console.log('🎉 HAVEN INITIAL SUPER ADMIN CREATED SUCCESSFULLY 🎉');
  console.log('=====================================================');
  console.log(`Name:     ${superAdmin.firstName} ${superAdmin.lastName}`);
  console.log(`Email:    ${superAdmin.email}`);
  console.log(`Password: ${ADMIN_PASSWORD}`);
  console.log(`Role:     ${superAdmin.role}`);
  console.log('=====================================================');

  await mongoose.disconnect();
  console.log('Database disconnected.');
}

bootstrap().catch((err) => {
  console.error('[BOOTSTRAP ERROR]:', err);
  process.exit(1);
});
