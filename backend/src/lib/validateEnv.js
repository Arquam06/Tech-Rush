export function validateEnv() {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'GEMINI_API_KEY',
    'JWT_SECRET',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.warn('⚠️  Warning: Missing environment variables:');
    missing.forEach((key) => console.warn(`   - ${key}`));
    console.warn('Backend running in fallback/demo configuration mode. Update backend/.env with live credentials for production features.\n');
  } else {
    console.log('✅ Environment variables validated');
  }
}
