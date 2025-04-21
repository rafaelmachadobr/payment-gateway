package service

import (
	"context"
	"encoding/json"
	"log/slog"
	"os"
	"strings"

	"github.com/rafaelmachadobr/payment-gateway/go-gateway/internal/domain/events"
	"github.com/segmentio/kafka-go"
)

type KafkaProducerInterface interface {
	SendingPendingTransaction(ctx context.Context, event events.PendingTransaction) error
	Close() error
}

type KafkaConsumerInterface interface {
	Consume(ctx context.Context) error
	Close() error
}

type KafkaConfig struct {
	Brokers []string
	Topic   string
}

// WithTopic cria uma nova configuração com um tópico diferente
func (c *KafkaConfig) WithTopic(topic string) *KafkaConfig {
	return &KafkaConfig{
		Brokers: c.Brokers,
		Topic:   topic,
	}
}

func NewKafkaConfig() *KafkaConfig {
	broker := os.Getenv("KAFKA_BROKER")
	if broker == "" {
		broker = "localhost:9092"
	}

	topic := os.Getenv("KAFKA_PRODUCER_TOPIC")
	if topic == "" {
		topic = "pending_transactions"
	}

	return &KafkaConfig{
		Brokers: strings.Split(broker, ","),
		Topic:   topic,
	}
}

type KafkaProducer struct {
	writer  *kafka.Writer
	topic   string
	brokers []string
}

func NewKafkaProducer(config *KafkaConfig) *KafkaProducer {
	writer := &kafka.Writer{
		Addr:     kafka.TCP(config.Brokers...),
		Topic:    config.Topic,
		Balancer: &kafka.LeastBytes{},
	}

	slog.Info("kafka producer iniciado", "brokers", config.Brokers, "topic", config.Topic)
	return &KafkaProducer{
		writer:  writer,
		topic:   config.Topic,
		brokers: config.Brokers,
	}
}

func (s *KafkaProducer) SendingPendingTransaction(ctx context.Context, event events.PendingTransaction) error {
	value, err := json.Marshal(event)
	if err != nil {
		slog.Error("erro ao converter evento para json", "error", err)
		return err
	}

	msg := kafka.Message{
		Value: value,
	}

	slog.Info("enviando mensagem para o kafka",
		"topic", s.topic,
		"message", string(value))

	if err := s.writer.WriteMessages(ctx, msg); err != nil {
		slog.Error("erro ao enviar mensagem para o kafka", "error", err)
		return err
	}

	slog.Info("mensagem enviada com sucesso para o kafka", "topic", s.topic)
	return nil
}

func (s *KafkaProducer) Close() error {
	slog.Info("fechando conexao com o kafka")
	return s.writer.Close()
}

type KafkaConsumer struct {
	reader         *kafka.Reader
	topic          string
	brokers        []string
	groupID        string
	invoiceService *InvoiceService
}

func NewKafkaConsumer(config *KafkaConfig, groupID string, invoiceService *InvoiceService) *KafkaConsumer {
	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers: config.Brokers,
		Topic:   config.Topic,
		GroupID: groupID,
	})

	slog.Info("kafka consumer iniciado",
		"brokers", config.Brokers,
		"topic", config.Topic,
		"group_id", groupID)

	return &KafkaConsumer{
		reader:         reader,
		topic:          config.Topic,
		brokers:        config.Brokers,
		groupID:        groupID,
		invoiceService: invoiceService,
	}
}

func (c *KafkaConsumer) Consume(ctx context.Context) error {
	for {
		msg, err := c.reader.ReadMessage(ctx)
		if err != nil {
			slog.Error("erro ao ler mensagem do kafka", "error", err)
			return err
		}

		var result events.TransactionResult
		if err := json.Unmarshal(msg.Value, &result); err != nil {
			slog.Error("erro ao converter mensagem para TransactionResult", "error", err)
			continue
		}

		slog.Info("mensagem recebida do kafka",
			"topic", c.topic,
			"invoice_id", result.InvoiceID,
			"status", result.Status)

		// Processa o resultado da transação
		if err := c.invoiceService.ProcessTransactionResult(result.InvoiceID, result.ToDomainStatus()); err != nil {
			slog.Error("erro ao processar resultado da transação",
				"error", err,
				"invoice_id", result.InvoiceID,
				"status", result.Status)
			continue
		}

		slog.Info("transação processada com sucesso",
			"invoice_id", result.InvoiceID,
			"status", result.Status)
	}
}

func (c *KafkaConsumer) Close() error {
	slog.Info("fechando conexao com o kafka consumer")
	return c.reader.Close()
}
