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
      const key = `${folder}/${filename}`;
      await this.s3.send(
        new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: mimeType }),
      );
      const publicUrl = (process.env.R2_PUBLIC_URL ?? '').replace(/\/$/, '');
      return `${publicUrl}/${key}`;
    }

    // Fallback: salva no disco (desenvolvimento local)
    const dir = join(process.cwd(), 'uploads', folder);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, filename), buffer);
    const baseUrl = (process.env.PUBLIC_BASE_URL ?? 'http://localhost:3001').replace(/\/$/, '');
    return `${baseUrl}/uploads/${folder}/${filename}`;
  }
}
