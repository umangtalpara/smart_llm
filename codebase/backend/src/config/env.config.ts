import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  PORT: Joi.number().default(3001),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'staging')
    .default('development'),
  MONGODB_URI: Joi.string().required().description('MongoDB connection URI'),
  REDIS_URL: Joi.string().required().description('Redis connection URL'),
  JWT_SECRET: Joi.string().min(32).required().description('JWT Secret Key'),
  JWT_ACCESS_EXPIRY: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRY: Joi.string().default('7d'),
  ENCRYPTION_KEY: Joi.string()
    .length(32)
    .required()
    .description('32-character encryption key for AES-256-GCM'),
  SMTP_HOST: Joi.string().optional(),
  SMTP_PORT: Joi.number().optional(),
  SMTP_USER: Joi.string().optional(),
  SMTP_PASS: Joi.string().optional(),
  SMTP_FROM: Joi.string().optional(),
  FRONTEND_URL: Joi.string().default('http://localhost:3000'),
});
