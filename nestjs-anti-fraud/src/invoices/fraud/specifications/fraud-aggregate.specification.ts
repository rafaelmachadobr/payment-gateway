import { Inject, Injectable } from '@nestjs/common';
import {
  FraudDetectionResult,
  FraudSpecificationContext,
  IFraudSpecification,
} from './fraud-specification.interface';

@Injectable()
export class FraudAggregateSpecification implements IFraudSpecification {
  constructor(
    @Inject('FRAUD_SPECIFICATIONS')
    private specifications: IFraudSpecification[],
  ) {}

  async detectFraud(
    context: FraudSpecificationContext,
  ): Promise<FraudDetectionResult> {
    for (const specification of this.specifications) {
      const result = await specification.detectFraud(context);
      if (result.hasFraud) {
        return result;
      }
    }

    return { hasFraud: false };
  }
}
