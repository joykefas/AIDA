import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const isCloudDb = Boolean(
      process.env.DATABASE_URL &&
      (process.env.DATABASE_URL.includes('sslmode=') ||
        process.env.DATABASE_URL.includes('aivencloud.com') ||
        process.env.DATABASE_URL.includes('neon.tech') ||
        process.env.DATABASE_URL.includes('supabase.co')),
    );

    super({
      adapter: new PrismaPg({
        connectionString: process.env.DATABASE_URL,
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
