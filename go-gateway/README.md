# Go Gateway

API REST central do sistema de pagamentos. Gerencia contas e faturas, processa pagamentos e orquestra a comunicação com o serviço de anti-fraude via Kafka.

## Stack

- **Go** 1.24
- **chi** — HTTP router
- **PostgreSQL** 16
- **Apache Kafka** (KRaft, sem Zookeeper)

## Como executar

### 1. Variáveis de ambiente

```bash
cp .env.example .env
```

O `.env.example` já está configurado para o ambiente Docker (host `db`, broker `kafka:29092`).

### 2. Subir os containers

```bash
docker compose up -d
```

Isso inicia: PostgreSQL, Kafka, Kafka Init (cria os tópicos) e Confluent Control Center.

> A rede `go-gateway_default` é criada aqui e compartilhada com os demais serviços.

### 3. Instalar dependências e rodar

```bash
docker exec go-gateway-app-1 sh -c "cd /app && go mod download"
docker exec -d go-gateway-app-1 sh -c "cd /app && go run ./cmd/app/main.go > /tmp/app.log 2>&1"
```

A API ficará disponível em `http://localhost:8080`.

## Variáveis de ambiente

| Variável | Padrão (Docker) | Descrição |
|---|---|---|
| `HTTP_PORT` | `8080` | Porta do servidor |
| `DB_HOST` | `db` | Host do PostgreSQL |
| `DB_PORT` | `5432` | Porta do PostgreSQL |
| `DB_USER` | `postgres` | Usuário |
| `DB_PASSWORD` | `postgres` | Senha |
| `DB_NAME` | `gateway` | Nome do banco |
| `DB_SSL_MODE` | `disable` | Modo SSL |
| `KAFKA_BROKER` | `kafka:29092` | Endereço do broker |
| `KAFKA_PRODUCER_TOPIC` | `pending_transactions` | Tópico de saída |
| `KAFKA_CONSUMER_TOPIC` | `transactions_result` | Tópico de entrada |
| `KAFKA_CONSUMER_GROUP_ID` | `gateway-group` | Consumer group |

## API Endpoints

Todos os endpoints de fatura exigem o header `X-API-Key`.

### `POST /accounts` — Criar conta

```http
POST /accounts
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com"
}
```

**Resposta `201`:**
```json
{
  "id": "uuid",
  "name": "John Doe",
  "email": "john@example.com",
  "balance": 0,
  "api_key": "a3f2...32 chars hex",
  "created_at": "2026-01-01T00:00:00Z",
  "updated_at": "2026-01-01T00:00:00Z"
}
```

### `GET /accounts` — Consultar conta autenticada

```http
GET /accounts
X-API-Key: {api_key}
```

**Resposta `200`:**
```json
{
  "id": "uuid",
  "name": "John Doe",
  "email": "john@example.com",
  "balance": 1250.50,
  "api_key": "a3f2...32 chars hex",
  "created_at": "2026-01-01T00:00:00Z",
  "updated_at": "2026-01-01T00:00:00Z"
}
```

**Erros:** `401` quando `X-API-Key` ausente ou inválida.

### `POST /invoice` — Criar fatura

```http
POST /invoice
Content-Type: application/json
X-API-Key: {api_key}

{
  "amount": 150.00,
  "description": "Compra de produto",
  "payment_type": "credit_card",
  "card_number": "4111111111111111",
  "cvv": "123",
  "expiry_month": 12,
  "expiry_year": 2027,
  "cardholder_name": "John Doe"
}
```

**Resposta `201`:**
```json
{
  "id": "uuid",
  "account_id": "uuid",
  "amount": 150.00,
  "status": "approved",
  "description": "Compra de produto",
  "payment_type": "credit_card",
  "card_last_digits": "1111",
  "created_at": "2026-01-01T00:00:00Z",
  "updated_at": "2026-01-01T00:00:00Z"
}
```

**Lógica de processamento:**

| Valor | Comportamento | Status retornado |
|---|---|---|
| ≤ R$10.000 | Processado imediatamente com resultado aleatório (70% aprovado / 30% rejeitado) | `approved` ou `rejected` |
| > R$10.000 | Enviado para análise de fraude via Kafka | `pending` (atualizado de forma assíncrona) |

Quando aprovada, o valor é somado ao saldo da conta.

### `GET /invoice` — Listar faturas da conta

```http
GET /invoice
X-API-Key: {api_key}
```

**Resposta `200`:** array de objetos no mesmo formato acima.

**Erros:** `401` quando `X-API-Key` ausente ou inválida.

### `GET /invoice/{id}` — Consultar fatura por ID

```http
GET /invoice/{id}
X-API-Key: {api_key}
```

**Resposta `200`:** objeto no mesmo formato acima.

**Erros:**

| Código | Situação |
|---|---|
| `400` | `id` ou `X-API-Key` ausente |
| `401` | API Key não encontrada no banco |
| `403` | Fatura pertence a outra conta |
| `404` | Fatura não encontrada |

## Kafka

### Mensagem produzida — `pending_transactions`

Enviada quando uma fatura com valor > R$10.000 é criada.

```json
{
  "account_id": "uuid",
  "invoice_id": "uuid",
  "amount": 15000.0
}
```

### Mensagem consumida — `transactions_result`

Recebida após o serviço de anti-fraude processar a transação.

```json
{
  "invoice_id": "uuid",
  "status": "approved"
}
```

`status` pode ser `"approved"` ou `"rejected"`. O gateway atualiza o status da fatura e, se aprovada, credita o valor na conta.

## Banco de dados

As migrations ficam em `migrations/` e são aplicadas com `golang-migrate`:

```bash
migrate -path migrations \
  -database "postgresql://postgres:postgres@localhost:5432/gateway?sslmode=disable" up
```

### Schema

```sql
CREATE TABLE accounts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(255) NOT NULL,
  email        VARCHAR(255) NOT NULL UNIQUE,
  api_key      VARCHAR(255) NOT NULL UNIQUE,
  balance      DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE invoices (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id       UUID NOT NULL REFERENCES accounts(id),
  amount           DECIMAL(10,2) NOT NULL,
  status           VARCHAR(50) NOT NULL DEFAULT 'pending',
  description      TEXT NOT NULL,
  payment_type     VARCHAR(50) NOT NULL,
  card_last_digits VARCHAR(4),
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

## Testando com REST Client

O arquivo `test.http` contém todos os exemplos de requisições e pode ser usado com a extensão [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) do VS Code. A variável `{{apiKey}}` é capturada automaticamente após a criação de conta.
