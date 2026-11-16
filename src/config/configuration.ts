export default () => ({
  port: parseInt(process.env.PORT || '4000', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/haven',
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'haven_default_jwt_access_secret_key_2026',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'haven_default_jwt_refresh_secret_key_2026',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
  superAdmin: {
    name: process.env.SUPER_ADMIN_NAME || 'Haven Super Admin',
    email: process.env.SUPER_ADMIN_EMAIL || 'admin@haven.local',
    password: process.env.SUPER_ADMIN_PASSWORD || 'HavenAdmin2026!Secure#Access',
  },
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10),
});

