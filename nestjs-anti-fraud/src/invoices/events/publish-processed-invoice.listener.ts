import * as kafkaLib from '@confluentinc/kafka-javascript';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InvoiceProcessedEvent } from './invoice-processed.event';

@Injectable()
export class PublishProcessedInvoiceListener implements OnModuleInit {
  private logger = new Logger(PublishProcessedInvoiceListener.name);
  private kafkaProducer: kafkaLib.KafkaJS.Producer;

  constructor(private kafkaInst: kafkaLib.KafkaJS.Kafka) {}

  async onModuleInit() {
    this.kafkaProducer = this.kafkaInst.producer();
    await this.kafkaProducer.connect();
  }

  @OnEvent('invoice.processed')
  async handle(event: InvoiceProcessedEvent) {
    await this.kafkaProducer.send({
      topic: 'transactions_result',
      messages: [
        {
          value: JSON.stringify({
            invoice_id: event.invoice.id,
            status: event.fraudResult.hasFraud ? 'rejected' : 'approved',
          }),
        },
      ],
    });
    this.logger.log(`Invoice ${event.invoice.id} processed event published`);
  }
}
