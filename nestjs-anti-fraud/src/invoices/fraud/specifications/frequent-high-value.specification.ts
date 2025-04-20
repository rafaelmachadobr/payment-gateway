import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FraudReason } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  FraudDetectionResult,
  FraudSpecificationContext,
  IFraudSpecification,
} from './fraud-specification.interface';

@Injectable()
export class FrequentHighValueSpecification implements IFraudSpecification {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async detectFraud(
    context: FraudSpecificationContext,
  ): Promise<FraudDetectionResult> {
    const { account } = context;
    const suspiciousInvoicesCount = this.configService.getOrThrow<number>(
      'SUSPICIOUS_INVOICES_COUNT',
    );
    const suspiciousTimeframeHours = this.configService.getOrThrow<number>(
      'SUSPICIOUS_TIMEFRAME_HOURS',
    );

    const recentDate = new Date();
    recentDate.setHours(recentDate.getHours() - suspiciousTimeframeHours);

    const recentInvoices = await this.prisma.invoice.findMany({
      where: {
        accountId: account.id,
        createdAt: { gte: recentDate },
      },
    });

    if (recentInvoices.length >= suspiciousInvoicesCount) {
      // Mark account as suspicious
      await this.prisma.account.update({
        where: { id: account.id },
        data: { isSuspicious: true },
      });

      return {
        hasFraud: true,
        reason: FraudReason.FREQUENT_HIGH_VALUE,
        description: `${recentInvoices.length} high-value invoices in the last ${suspiciousTimeframeHours} hours`,
      };
    }

    return { hasFraud: false };
  }
}
