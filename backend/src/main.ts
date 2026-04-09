import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  // Garantir que JWT_SECRET seja definido antes de subir
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'dev') {
    throw new Error(
      '\n\n❌  ERRO DE SEGURANÇA: JWT_SECRET não definido ou inseguro.\n' +
      '    Defina JWT_SECRET no arquivo backend/.env com um valor aleatório longo.\n' +
      '    Exemplo: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"\n',
    );
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const allowedOrigins = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || /^http:\/\/localhost:\d+$/.test(origin)) {
        callback(null, true);
      } else if (allowedOrigins.includes(origin.replace(/\/$/, ''))) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  });
  app.setGlobalPrefix('api');
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = process.env.PORT ? Number(process.env.PORT) : 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`✅  Raccolto API em execução na porta ${port}`);
}

bootstrap();
