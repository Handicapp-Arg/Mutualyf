import { registerAs } from '@nestjs/config';

export default registerAs('config', () => ({
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3001,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  // Agrega aquí otras variables de entorno relevantes
}));
