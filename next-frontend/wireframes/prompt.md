# Gateway de Pagamentos

Sistema educacional que simula o funcionamento de um gateway de pagamentos real, demonstrando conceitos fundamentais de processamento de transações financeiras.

## Visão Geral

Este sistema atua como uma ponte entre comerciantes e instituições financeiras (simuladas), permitindo o processamento seguro e eficiente de transações. O projeto foi desenvolvido com propósito educacional, demonstrando conceitos essenciais de:

- Arquitetura de APIs RESTful
- Persistência de dados transacionais
- Autenticação e autorização
- Controle de concorrência em operações financeiras
- Containerização de aplicações
- Tratamento de dados sensíveis
- Integração com Apache Kafka para processamento assíncrono

## Conceitos Fundamentais

### Contas (Accounts)
- Representam os comerciantes no sistema
- Possuem identificação única e informações básicas
- Autenticação via API Key exclusiva
- Mantêm saldo das transações aprovadas
- Rastreamento temporal de criação e atualizações

### Faturas (Invoices)
- Representam solicitações de pagamento
- Contêm informações do produto/serviço e valor
- Armazenam dados parciais do método de pagamento
- Status reflete o estado atual do processamento
- Vinculadas a uma conta específica

### Regras de Negócio

#### Processamento de Pagamentos
- Transações até 10.000: processamento imediato (70% de chance de aprovação, 30% de rejeição - simulado)
- Transações acima de 10.000: permanecem pendentes para análise e são enviadas para fila Kafka
- Pagamentos aprovados incrementam automaticamente o saldo da conta
- Apenas informações não-sensíveis são armazenadas (ex: últimos 4 dígitos do cartão)

#### Segurança
- Autenticação obrigatória via API Key para operações protegidas
- Validação de propriedade de recursos (faturas pertencem a contas específicas)
- Dados sensíveis de cartão não são armazenados

## Como Executar o Projeto

### Pré-requisitos
- Docker e Docker Compose
- Go 1.24 ou superior (opcional, apenas para desenvolvimento local)
- VSCode com extensão REST Client (para testes manuais)

### Setup Inicial

1. Clone o repositório
```bash
git clone https://github.com/rafaelmachadobr/payment-gateway.git
cd go-gateway
```

2. Configure as variáveis de ambiente
```bash
# Copie o arquivo de exemplo para criar o arquivo .env
cp .env.example .env
```

3. Inicie os serviços com Docker Compose
```bash
docker compose up -d
```

Este comando iniciará:
- O container da aplicação Go (em modo de espera)
- PostgreSQL como banco de dados
- Kafka e Zookeeper para mensageria
- Control Center para administração do Kafka

4. Execute as migrations do banco de dados
```bash
docker compose exec app migrate -path migrations -database "postgresql://postgres:postgres@localhost:5432/gateway?sslmode=disable" up
```

5. Execute o servidor da aplicação
```bash
docker compose exec app go run cmd/app/main.go
```

Agora o servidor estará disponível em `http://localhost:8080`.

### Criação dos Tópicos Kafka

Os tópicos são criados automaticamente quando necessário, mas você pode criá-los manualmente:

```bash
# Acesse o container do Kafka
docker compose exec kafka bash

# Crie o tópico para transações pendentes
kafka-topics --bootstrap-server localhost:9092 --create --topic pending_transactions --partitions 1 --replication-factor 1

# Crie o tópico para resultados de transações
kafka-topics --bootstrap-server localhost:9092 --create --topic transactions_result --partitions 1 --replication-factor 1
```

## Fluxo da Aplicação

### 1. Criação de Conta
1. O usuário envia uma requisição POST para `/accounts` com nome e e-mail
2. O sistema gera um ID único e uma API Key exclusiva
3. A conta é criada com saldo inicial zero
4. Os dados são armazenados no banco de dados
5. A resposta inclui o ID da conta e a API Key gerada

### 2. Criação de Fatura (Invoice)
1. O cliente envia uma requisição POST para `/invoice` incluindo:
   - API Key no header `X-API-Key`
   - Dados do pagamento (valor, descrição, dados do cartão)
2. O sistema valida a API Key e identifica a conta associada
3. O sistema processa a fatura de acordo com o valor:

#### Para valores até 10.000:
1. Processamento imediato ocorre com 70% de chance de aprovação
2. Se aprovada:
   - Status da fatura é definido como "approved"
   - O saldo da conta é incrementado
   - Apenas os últimos 4 dígitos do cartão são armazenados
3. Se rejeitada:
   - Status da fatura é definido como "rejected"
   - Nenhuma alteração no saldo da conta

#### Para valores acima de 10.000:
1. A fatura é criada com status "pending"
2. Um evento é publicado no tópico Kafka `pending_transactions` contendo:
   - ID da conta
   - ID da fatura
   - Valor da transação
3. A fatura é salva no banco de dados com status pendente
4. O cliente recebe a resposta com status "pending"

### 3. Processamento Assíncrono (Antifraude Simulado)
1. Um microsserviço externo (não incluído no projeto) deve consumir as mensagens do tópico `pending_transactions`
2. Após análise (simulada), o serviço deve publicar o resultado no tópico `transactions_result` com:
   - ID da fatura
   - Status ("approved" ou "rejected")

### 4. Atualização do Status da Fatura
1. O gateway consome mensagens do tópico `transactions_result`
2. Ao receber um resultado:
   - Localiza a fatura correspondente no banco de dados
   - Atualiza o status da fatura
   - Se aprovada, incrementa o saldo da conta associada
   - Registra a atualização no banco de dados

### Formato dos Payloads Kafka

#### JSON Enviado ao Kafka (pending_transactions)
Quando uma transação de alto valor é detectada, o seguinte JSON é enviado ao tópico `pending_transactions`:

```json
{
  "account_id": "uuid-da-conta",
  "invoice_id": "uuid-da-fatura",
  "amount": 15000.00
}
```

#### JSON Recebido do Kafka (transactions_result)
Após o processamento externo, o sistema espera receber o seguinte formato no tópico `transactions_result`:

```json
{
  "invoice_id": "uuid-da-fatura",
  "status": "approved"
}
```

O campo `status` pode conter um dos valores: `"approved"` ou `"rejected"`.

## API Reference

### Autenticação

O sistema utiliza autenticação via API-KEY que deve ser incluída no header `X-API-Key` em todas as requisições protegidas.

**Códigos de Erro de Autenticação**:
- 401 Unauthorized: API-KEY não fornecida ou inválida
- 403 Forbidden: API-KEY válida, mas sem permissão para o recurso

### Endpoints

#### Contas

##### Criar Conta
```bash
POST /accounts
Content-Type: application/json

{
    "name": "Nome do Merchant",
    "email": "merchant@email.com"
}
```

**Response** (201 Created):
```json
{
    "id": "uuid-da-conta",
    "name": "Nome do Merchant",
    "email": "merchant@email.com",
    "api_key": "chave-api-gerada",
    "balance": 0,
    "created_at": "2024-03-30T10:00:00Z",
    "updated_at": "2024-03-30T10:00:00Z"
}
```

##### Consultar Conta
```bash
GET /accounts
X-API-Key: chave-api-do-merchant
```

**Response** (200 OK):
```json
{
    "id": "uuid-da-conta",
    "name": "Nome do Merchant",
    "email": "merchant@email.com",
    "api_key": "chave-api-gerada",
    "balance": 0,
    "created_at": "2024-03-30T10:00:00Z",
    "updated_at": "2024-03-30T10:00:00Z"
}
```

#### Faturas

##### Criar Fatura
```bash
POST /invoice
X-API-Key: chave-api-do-merchant
Content-Type: application/json

{
    "amount": 100.50,
    "description": "Descrição da fatura",
    "payment_type": "credit_card",
    "card_number": "4111111111111111",
    "cvv": "123",
    "expiry_month": 12,
    "expiry_year": 2025,
    "cardholder_name": "Nome do Titular"
}
```

**Response** (201 Created):
```json
{
    "id": "uuid-da-fatura",
    "account_id": "uuid-da-conta",
    "amount": 100.50,
    "status": "approved",
    "description": "Descrição da fatura",
    "payment_type": "credit_card",
    "card_last_digits": "1111",
    "created_at": "2024-03-30T10:00:00Z",
    "updated_at": "2024-03-30T10:00:00Z"
}
```

**Importante**: Para valores acima de 10.000, o status retornado será "pending".

##### Consultar Fatura
```bash
GET /invoice/{id}
X-API-Key: chave-api-do-merchant
```

**Response** (200 OK):
```json
{
    "id": "uuid-da-fatura",
    "account_id": "uuid-da-conta", 
    "amount": 100.50,
    "status": "approved",
    "description": "Descrição da fatura",
    "payment_type": "credit_card",
    "card_last_digits": "1111",
    "created_at": "2024-03-30T10:00:00Z",
    "updated_at": "2024-03-30T10:00:00Z"
}
```

##### Listar Faturas
```bash
GET /invoice
X-API-Key: chave-api-do-merchant
```

**Response** (200 OK):
```json
[
    {
        "id": "uuid-da-fatura-1",
        "account_id": "uuid-da-conta",
        "amount": 100.50,
        "status": "approved",
        "description": "Descrição da fatura 1",
        "payment_type": "credit_card",
        "card_last_digits": "1111",
        "created_at": "2024-03-30T10:00:00Z",
        "updated_at": "2024-03-30T10:00:00Z"
    },
    {
        "id": "uuid-da-fatura-2",
        "account_id": "uuid-da-conta",
        "amount": 15000.00,
        "status": "pending",
        "description": "Descrição da fatura 2",
        "payment_type": "credit_card",
        "card_last_digits": "1111",
        "created_at": "2024-03-30T11:00:00Z",
        "updated_at": "2024-03-30T11:00:00Z"
    }
]
```

### Status de Fatura

- **pending**: Aguardando processamento ou análise (valores > 10.000)
- **approved**: Pagamento processado com sucesso
- **rejected**: Pagamento rejeitado


Crie 4 telas

- Uma com um campo para colocar a API-Key
- Uma para listar as invoices
- Outra para mostrar os detalhes de uma invoice
- Uma para mostrar o pagamento, que seria a criação da invoice

todas as telas devem ter um navbar superior que do lado esquerdo vai mostrar Full Cycle Gateway e do lado direito vai mostrar "Olá, usuário" e um botão de logout

- o tema da páginas devem ser dark
- cada página deve ocupar um frame
