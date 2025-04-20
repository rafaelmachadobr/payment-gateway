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
export class UnusualAmountSpecification implements IFraudSpecification {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async detectFraud(
    context: FraudSpecificationContext,
  ): Promise<FraudDetectionResult> {
    const { account, amount } = context;
    const suspiciousVariationPercentage = this.configService.getOrThrow<number>(
      'SUSPICIOUS_VARIATION_PERCENTAGE',
    );
    const invoicesHistoryCount = this.configService.getOrThrow<number>(
      'INVOICES_HISTORY_COUNT',
    );

    const previousInvoices = await this.prisma.invoice.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: 'desc' },
      take: invoicesHistoryCount,
    });

    if (previousInvoices.length > 0) {
      const totalAmount = previousInvoices.reduce(
        (sum, invoice) => sum + invoice.amount,
        0,
      );
      const averageAmount = totalAmount / previousInvoices.length;

      if (amount > averageAmount * (1 + suspiciousVariationPercentage / 100)) {
        return {
          hasFraud: true,
          reason: FraudReason.UNUSUAL_PATTERN,
          description: `Amount ${amount} is ${((amount / averageAmount) * 100 - 100).toFixed(2)}% higher than account average of ${averageAmount.toFixed(2)}`,
        };
      }
    }

    return { hasFraud: false };
  }
}
