import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { FraudService } from './fraud/fraud.service';

export type PendingInvoicesMessage = {
  account_id: string;
  amount: number;
  invoice_id: string;
};

@Controller() //injeções
export class InvoicesConsumer {
  private logger = new Logger(InvoicesConsumer.name);

  constructor(private fraudService: FraudService) {}

  @EventPattern('pending_transactions')
  async handlePendingInvoices(@Payload() message: PendingInvoicesMessage) {
    this.logger.log(`Processing invoice: ${message.invoice_id}`);
    await this.fraudService.processInvoice({
      account_id: message.account_id,
      amount: message.amount,
      invoice_id: message.invoice_id,
    });
    this.logger.log(`Invoice processed: ${message.invoice_id}`);
  }
}

// juntamente com http
// em um processo separado
