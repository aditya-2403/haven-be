export default () => {
  const devMode = (process.env.DEV_MODE || process.env.NODE_ENV || 'development').toLowerCase();
  const isStaging = devMode === 'staging';

  // Determine active database URI based on DEV_MODE
  let databaseUri: string;
  if (isStaging) {
    databaseUri =
      process.env.MONGODB_URI_STAGING ||
      process.env.MONGODB_URI ||
      'mongodb+srv://yoyosahoo319_db_user:1EhQEBfCuNaiadie@cluster0.tu8rpov.mongodb.net';
  } else {
    databaseUri =
      process.env.MONGODB_URI_LOCAL ||
      process.env.MONGODB_URI ||
      'mongodb://127.0.0.1:27017/haven';
  }

  return {
    port: parseInt(process.env.PORT || '4000', 10),
    devMode,
    isStaging,
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    database: {
      uri: databaseUri,
      dbName: process.env.MONGODB_DATABASE || 'haven',
      username: process.env.MONGODB_USERNAME || 'yoyosahoo319_db_user',
      password: process.env.MONGODB_PASSWORD || '1EhQEBfCuNaiadie',
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
  };
};
