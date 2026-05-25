process.env.JWT_SECRET = 'test-secret-key-do-not-use-in-production';
process.env.STRAVA_CLIENT_ID = '123456';
process.env.STRAVA_CLIENT_SECRET = 'test-client-secret';
process.env.STRAVA_REDIRECT_URI = 'http://localhost:3000/api/auth/strava/callback';
process.env.STRAVA_AUTH_URL = 'https://www.strava.com/oauth/authorize';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';
process.env.NODE_ENV = 'test';
