import { Injectable, NotFoundException } from '@nestjs/common';
import { ContactSubmissionDto } from '@aida/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';

@Injectable()
export class ContactService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateContactDto): Promise<{ ok: true }> {
    await this.prisma.contactSubmission.create({
      data: {
        name: dto.name.trim(),
        email: dto.email.trim(),
        message: dto.message.trim(),
      },
    });
    return { ok: true };
  }

  async findAll(): Promise<ContactSubmissionDto[]> {
    const rows = await this.prisma.contactSubmission.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      message: r.message,
      isRead: r.isRead,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async markRead(id: string): Promise<{ ok: true }> {
    const existing = await this.prisma.contactSubmission.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Submission not found');
    await this.prisma.contactSubmission.update({
      where: { id },
      data: { isRead: true },
    });
    return { ok: true };
  }
}
