import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { mkdirSync, writeFileSync } from 'fs';
import { join, extname } from 'path';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3: S3Client | null;

  constructor() {
    const endpoint = process.env.R2_ENDPOINT;
    if (endpoint) {
      this.s3 = new S3Client({
        region: 'auto',
        endpoint,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
        },
      });
      this.logger.log('Storage: Cloudflare R2 configurado');
    } else {
      this.s3 = null;
      this.logger.warn('Storage: R2_ENDPOINT não definido — usando disco local (não recomendado em produção)');
    }
  }

  async uploadFile(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    folder: string,
  ): Promise<string> {
    const safeBase = originalName
      .replace(/\.[^/.]+$/, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();
    const ext = extname(originalName);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const filename = `${safeBase || 'file'}-${unique}${ext}`;

    if (this.s3) {
      const bucket = process.env.R2_BUCKET_NAME ?? '';
      const publicUrl = (process.env.R2_PUBLIC_URL ?? '').replace(/\/$/, '');
      const key = `${folder}/${filename}`;

      this.logger.log(`R2 upload → bucket=${bucket} key=${key} mime=${mimeType} size=${buffer.length}`);

      if (!bucket) throw new Error('R2_BUCKET_NAME não configurado.');
      if (!publicUrl) throw new Error('R2_PUBLIC_URL não configurado.');

      await this.s3.send(
        new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: mimeType }),
      );

      const url = `${publicUrl}/${key}`;
      this.logger.log(`R2 upload concluído → ${url}`);
      return url;
    }

    // Fallback: salva no disco (desenvolvimento local)
    this.logger.warn('R2 não configurado — salvando em disco local.');
    const dir = join(process.cwd(), 'uploads', folder);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, filename), buffer);
    const baseUrl = (process.env.PUBLIC_BASE_URL ?? 'http://localhost:3001').replace(/\/$/, '');
    return `${baseUrl}/uploads/${folder}/${filename}`;
  }
}
