import * as kafkaLib from '@confluentinc/kafka-javascript';
import { Module } from '@nestjs/common';
import { PublishProcessedInvoiceListener } from './events/publish-processed-invoice.listener';
import { FraudService } from './fraud/fraud.service';
import { FraudAggregateSpecification } from './fraud/specifications/fraud-aggregate.specification';
import { FrequentHighValueSpecification } from './fraud/specifications/frequent-high-value.specification';
import { SuspiciousAccountSpecification } from './fraud/specifications/suspicious-account.specification';
import { UnusualAmountSpecification } from './fraud/specifications/unusual-amount.specification';
import { InvoicesConsumer } from './invoices.consumer';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
@Module({
  providers: [
    FraudService,
    FrequentHighValueSpecification,
    SuspiciousAccountSpecification,
    UnusualAmountSpecification,
    FraudAggregateSpecification,
    {
      provide: 'FRAUD_SPECIFICATIONS',
      useFactory: (
        frequentHighValueSpec: FrequentHighValueSpecification,
        suspiciousAccountSpec: SuspiciousAccountSpecification,
        unusualAmountSpec: UnusualAmountSpecification,
      ) => {
        return [
          frequentHighValueSpec,
          suspiciousAccountSpec,
          unusualAmountSpec,
        ];
      },
      inject: [
        FrequentHighValueSpecification,
        SuspiciousAccountSpecification,
        UnusualAmountSpecification,
      ],
    },
    InvoicesService,
    {
      provide: kafkaLib.KafkaJS.Kafka,
      useValue: new kafkaLib.KafkaJS.Kafka({
        'bootstrap.servers': 'kafka:29092',
      }),
    },
    PublishProcessedInvoiceListener,
  ],
  controllers: [InvoicesController, InvoicesConsumer],
})
export class InvoicesModule {}
