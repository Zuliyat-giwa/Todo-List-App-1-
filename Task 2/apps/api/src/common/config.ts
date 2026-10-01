export const config = {
  get isProd() {
    return process.env.NODE_ENV === 'production';
  },
  get webUrl() {
    return (process.env.WEB_URL || 'http://localhost:3000').replace(/\/$/, '');
  },
  get apiUrl() {
    return (process.env.API_URL || 'http://localhost:4000').replace(/\/$/, '');
  },
  get jwtSecret() {
    const s = process.env.JWT_SECRET;
    if (!s || s === 'change-me') {
      if (process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET must be set in production');
      return 'dev-insecure-secret';
    }
    return s;
  },
  get cookieDomain() {
    return process.env.COOKIE_DOMAIN || undefined;
  },
};

export const SESSION_COOKIE = 'modeza_session';
