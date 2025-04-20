import { Injectable } from '@nestjs/common';
import { InvoiceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  async findAll(filter?: { withFraud?: boolean; accountId?: string }) {
    const where = {
      ...(filter?.accountId && { accountId: filter.accountId }),
      ...(filter?.withFraud && { status: InvoiceStatus.REJECTED }),
    };

    return this.prisma.invoice.findMany({
      where,
      include: { account: true },
    });
  }

  async findOne(id: string) {
    return this.prisma.invoice.findUnique({
      where: { id },
      include: { account: true },
    });
  }
}
