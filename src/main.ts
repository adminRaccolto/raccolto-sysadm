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

  app.enableCors({
    origin: (origin, callback) => {
      // Em desenvolvimento aceita qualquer localhost
      if (!origin || /^http:\/\/localhost:\d+$/.test(origin)) {
        callback(null, true);
      } else if (process.env.CORS_ORIGIN && origin === process.env.CORS_ORIGIN) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} não permitida por CORS`));
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
  await app.listen(port);
  console.log(`✅  Raccolto API em execução na porta ${port}`);
}

bootstrap();
