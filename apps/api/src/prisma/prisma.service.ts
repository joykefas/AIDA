import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const rawUrl = process.env.DATABASE_URL ?? '';
    const isCloudDb = Boolean(
      rawUrl.includes('sslmode=') ||
      rawUrl.includes('aivencloud.com') ||
      rawUrl.includes('neon.tech') ||
      rawUrl.includes('supabase.co'),
    );

    const connectionString = isCloudDb
      ? rawUrl.includes('sslmode=')
        ? rawUrl.replace(
            /sslmode=(require|prefer|verify-ca)/,
            'sslmode=no-verify',
          )
        : rawUrl.includes('?')
          ? `${rawUrl}&sslmode=no-verify`
          : `${rawUrl}?sslmode=no-verify`
      : rawUrl;

    super({
      adapter: new PrismaPg({
        connectionString,
        ssl: isCloudDb ? { rejectUnauthorized: false } : undefined,
      }),
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
