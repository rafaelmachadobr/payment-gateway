package service

import (
	"context"

	"github.com/rafaelmachadobr/payment-gateway/go-gateway/internal/domain"
	"github.com/rafaelmachadobr/payment-gateway/go-gateway/internal/domain/events"
	"github.com/rafaelmachadobr/payment-gateway/go-gateway/internal/dto"
)

type InvoiceService struct {
	invoiceRepository domain.InvoiceRepository
	accountService    AccountService
	kafkaProducer     KafkaProducerInterface
}

func NewInvoiceService(
	invoiceRepository domain.InvoiceRepository,
	accountService AccountService,
	kafkaProducer KafkaProducerInterface,
) *InvoiceService {
	return &InvoiceService{
		invoiceRepository: invoiceRepository,
		accountService:    accountService,
		kafkaProducer:     kafkaProducer,
	}
}

func (s *InvoiceService) Create(input dto.CreateInvoiceInput) (*dto.InvoiceOutput, error) {
	accountOutput, err := s.accountService.FindByAPIKey(input.APIKey)
	if err != nil {
		return nil, err
	}

	invoice, err := dto.ToInvoice(input, accountOutput.ID)
	if err != nil {
		return nil, err
	}

	if err := invoice.Process(); err != nil {
		return nil, err
	}

	// Se o status for pending, significa que é uma transação de alto valor
	if invoice.Status == domain.StatusPending {
		// Criar e publicar evento de transação pendente
		pendingTransaction := events.NewPendingTransaction(
			invoice.AccountID,
			invoice.ID,
			invoice.Amount,
		)

		if err := s.kafkaProducer.SendingPendingTransaction(context.Background(), *pendingTransaction); err != nil {
			return nil, err
		}
	}

	// Para transações aprovadas, atualizar o saldo
	if invoice.Status == domain.StatusApproved {
		_, err = s.accountService.UpdateBalance(input.APIKey, invoice.Amount)
		if err != nil {
			return nil, err
		}
	}

	if err := s.invoiceRepository.Save(invoice); err != nil {
		return nil, err
	}

	return dto.FromInvoice(invoice), nil
}

func (s *InvoiceService) GetByID(id, apiKey string) (*dto.InvoiceOutput, error) {
	invoice, err := s.invoiceRepository.FindByID(id)
	if err != nil {
		return nil, err
	}

	accountOutput, err := s.accountService.FindByAPIKey(apiKey)
	if err != nil {
		return nil, err
	}

	if invoice.AccountID != accountOutput.ID {
		return nil, domain.ErrUnauthorizedAccess
	}

	return dto.FromInvoice(invoice), nil
}

func (s *InvoiceService) ListByAccount(accountID string) ([]*dto.InvoiceOutput, error) {
	invoices, err := s.invoiceRepository.FindByAccountID(accountID)
	if err != nil {
		return nil, err
	}

	output := make([]*dto.InvoiceOutput, len(invoices))
	for i, invoice := range invoices {
		output[i] = dto.FromInvoice(invoice)
	}
	return output, nil
}

// ListByAccountAPIKey lista as faturas de uma conta através de uma API Key
func (s *InvoiceService) ListByAccountAPIKey(apiKey string) ([]*dto.InvoiceOutput, error) {
	accountOutput, err := s.accountService.FindByAPIKey(apiKey)
	if err != nil {
		return nil, err
	}

	return s.ListByAccount(accountOutput.ID)
}

// ProcessTransactionResult processa o resultado de uma transação após análise de fraude
func (s *InvoiceService) ProcessTransactionResult(invoiceID string, status domain.Status) error {
	invoice, err := s.invoiceRepository.FindByID(invoiceID)
	if err != nil {
		return err
	}

	if err := invoice.UpdateStatus(status); err != nil {
		return err
	}

	if err := s.invoiceRepository.UpdateStatus(invoice); err != nil {
		return err
	}

	if status == domain.StatusApproved {
		account, err := s.accountService.FindByID(invoice.AccountID)
		if err != nil {
			return err
		}

		if _, err := s.accountService.UpdateBalance(account.APIKey, invoice.Amount); err != nil {
			return err
		}
	}

	return nil
}
