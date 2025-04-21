package events

type PendingTransaction struct {
	AccountID string  `json:"account_id"`
	InvoiceID string  `json:"invoice_id"`
	Amount    float64 `json:"amount"`
}

func NewPendingTransaction(accountID, invoiceID string, amount float64) *PendingTransaction {
	return &PendingTransaction{
		AccountID: accountID,
		InvoiceID: invoiceID,
		Amount:    amount,
	}
}
