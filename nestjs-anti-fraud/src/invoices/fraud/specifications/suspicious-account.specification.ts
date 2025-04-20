import { Injectable } from '@nestjs/common';
import { FraudReason } from '@prisma/client';
import {
  FraudDetectionResult,
  FraudSpecificationContext,
  IFraudSpecification,
} from './fraud-specification.interface';

@Injectable()
export class SuspiciousAccountSpecification implements IFraudSpecification {
  detectFraud(context: FraudSpecificationContext): FraudDetectionResult {
    const { account } = context;

    if (account.isSuspicious) {
      return {
        hasFraud: true,
        reason: FraudReason.SUSPICIOUS_ACCOUNT,
        description: 'Account is flagged as suspicious',
      };
    }

    return { hasFraud: false };
  }
}
