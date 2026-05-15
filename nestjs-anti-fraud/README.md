# NestJS Anti-Fraud

Serviço de detecção de fraude em tempo real. Consome transações pendentes do Kafka, aplica regras de análise e publica o resultado de volta.

## Stack

- **NestJS** 11 + TypeScript
- **Prisma** 6 — ORM
- **PostgreSQL** 16
- **@confluentinc/kafka-javascript** — cliente Kafka nativo

## Arquitetura interna

Este serviço roda como **dois processos independentes**:

| Processo | Entrypoint | Função |
|---|---|---|
| Servidor HTTP | `src/main.ts` | API REST na porta `3001` |
| Microserviço Kafka | `src/cmd/kafka.cmd.ts` | Consome `pending_transactions`, publica em `transactions_result` |

Ambos precisam estar rodando para o fluxo de fraude funcionar.

## Como executar

### Pré-requisito

O Go Gateway deve estar no ar (ele cria a rede `go-gateway_default` e o Kafka).

### 1. Variáveis de ambiente

Crie o arquivo `.env` na raiz do serviço:

```env
DATABASE_URL=postgresql://postgres:root@nestjs-db:5432/mydb

SUSPICIOUS_VARIATION_PERCENTAGE=50
INVOICES_HISTORY_COUNT=10
SUSPICIOUS_INVOICES_COUNT=3
SUSPICIOUS_TIMEFRAME_HOURS=24
```

### 2. Subir os containers

```bash
docker compose up -d
```

### 3. Instalar dependências e aplicar migrations

```bash
docker exec nestjs-anti-fraud-nestjs-1 sh -c "cd /home/node/app && npm install"

# Instalar Prisma CLI (não incluso nas deps de produção)
docker exec nestjs-anti-fraud-nestjs-1 sh -c "cd /home/node/app && npm install prisma@6.6.0 --save-dev"

# Gerar client e aplicar migrations
docker exec nestjs-anti-fraud-nestjs-1 sh -c "cd /home/node/app && \
  ./node_modules/.bin/prisma generate && \
  ./node_modules/.bin/prisma migrate deploy"
```

### 4. Instalar binário nativo do Kafka

O módulo `@confluentinc/kafka-javascript` usa um binário nativo que precisa ser baixado separadamente:

```bash
docker exec nestjs-anti-fraud-nestjs-1 sh -c "
  cd /home/node/app/node_modules/@confluentinc/kafka-javascript &&
  node ../../.bin/node-pre-gyp install --fallback-to-build"
```

### 5. Iniciar os dois processos

```bash
# Processo 1 — servidor HTTP (porta 3001)
docker exec -d nestjs-anti-fraud-nestjs-1 sh -c \
  "cd /home/node/app && npm run start:dev > /tmp/nestjs.log 2>&1"

# Processo 2 — consumidor Kafka
docker exec -d nestjs-anti-fraud-nestjs-1 sh -c \
  "cd /home/node/app && node -e \"require('tsconfig-paths/register'); \
  require('ts-node').register({transpileOnly:true}); \
  require('./src/cmd/kafka.cmd.ts')\" > /tmp/nestjs-kafka.log 2>&1"
```

## Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | Connection string do PostgreSQL |
| `SUSPICIOUS_VARIATION_PERCENTAGE` | Variação % acima da média que aciona alerta de valor incomum (ex: `50` = 50%) |
| `INVOICES_HISTORY_COUNT` | Nº de faturas históricas usadas para calcular a média |
| `SUSPICIOUS_INVOICES_COUNT` | Nº mínimo de faturas recentes para acionar alerta de frequência |
| `SUSPICIOUS_TIMEFRAME_HOURS` | Janela de tempo em horas para a análise de frequência |

## Regras de detecção de fraude

As três regras são aplicadas em sequência. Basta uma retornar fraude para a transação ser **rejeitada** e o histórico de fraude ser registrado.

### 1. SuspiciousAccount

Verifica se a conta já está marcada como suspeita no banco do anti-fraude.

```
Se account.isSuspicious = true → REJEITADO (SUSPICIOUS_ACCOUNT)
```

### 2. UnusualAmount

Compara o valor da transação com a média histórica da conta.

```
invoices = últimas INVOICES_HISTORY_COUNT faturas da conta
média = soma dos valores / quantidade

Se amount > média × (1 + SUSPICIOUS_VARIATION_PERCENTAGE / 100):
  → REJEITADO (UNUSUAL_PATTERN)
```

> Essa regra só é avaliada se a conta já tiver faturas anteriores.

### 3. FrequentHighValue

Detecta muitas transações de alto valor em curto intervalo de tempo.

```
recentes = faturas da conta nos últimos SUSPICIOUS_TIMEFRAME_HOURS horas

Se recentes.length >= SUSPICIOUS_INVOICES_COUNT:
  → marca account.isSuspicious = true
  → REJEITADO (FREQUENT_HIGH_VALUE)
```

## API Endpoints

### `GET /invoices` — Listar faturas processadas

```http
GET /invoices
GET /invoices?account_id={uuid}
GET /invoices?with_fraud=true
GET /invoices?with_fraud=true&account_id={uuid}
```

- `account_id` filtra por conta
- `with_fraud=true` retorna apenas faturas com status `REJECTED`

**Resposta `200`:**
```json
[
  {
    "id": "uuid",
    "accountId": "uuid",
    "amount": 15000.0,
    "status": "APPROVED",
    "createdAt": "2026-01-01T00:00:00Z",
    "updatedAt": "2026-01-01T00:00:00Z",
    "account": {
      "id": "uuid",
      "isSuspicious": false,
      "createdAt": "2026-01-01T00:00:00Z",
      "updatedAt": "2026-01-01T00:00:00Z"
    }
  }
]
```

### `GET /invoices/:id` — Consultar fatura por ID

```http
GET /invoices/{uuid}
```

**Resposta `200`:** mesmo formato acima (objeto único). Retorna `null` se não encontrada.

## Banco de dados

Schema gerenciado pelo Prisma (`prisma/schema.prisma`). As IDs de `Account` e `Invoice` espelham as do Go Gateway — são os mesmos UUIDs.

```
Account      — espelho das contas do gateway, com flag isSuspicious
Invoice      — transações processadas (status: APPROVED | REJECTED)
FraudHistory — registrado apenas quando hasFraud = true, contém razão e descrição
```

**Razões de fraude:** `SUSPICIOUS_ACCOUNT` | `UNUSUAL_PATTERN` | `FREQUENT_HIGH_VALUE`
