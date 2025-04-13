# Gateway de Pagamento - API Gateway (Go)

Este é o microsserviço da API Gateway desenvolvido em Go, parte do projeto Gateway de Pagamento.

## Sobre o Projeto

O Gateway de Pagamento é um sistema distribuído composto por:

- Frontend em Next.js
- API Gateway em Go (este repositório)
- Sistema de Antifraude em Nest.js
- Apache Kafka para comunicação assíncrona

## Status atual do projeto

Até o momento, conta com as seguintes funcionalidades implementadas:

- Setup e estrutura base do projeto
- Endpoints de gerenciamento de accounts (criação e consulta)

Funcionalidades pendentes:

- Sistema completo de faturas (invoices) com:
  - Criação e processamento automático de pagamentos
  - Validação de limites (faturas > R$ 10.000 ficam pendentes)
  - Consulta individual e listagem de faturas
  - Atualização automática de saldo da conta
- Integração com Apache Kafka para:
  - Envio de transações para o microsserviço de antifraude
  - Consumo de respostas do serviço de antifraude
- Processamento de pagamentos baseado na análise de fraude

## Arquitetura da aplicação

![Arquitetura](../docs/images/architecture.png)

## Pré-requisitos

- [Go](https://golang.org/doc/install) 1.24 ou superior
- [Docker](https://www.docker.com/get-started)
  - Para Windows: [WSL2](https://docs.docker.com/desktop/windows/wsl/) é necessário
- [golang-migrate](https://github.com/golang-migrate/migrate)
  - Instalação: `go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest`
- [Extensão REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) (opcional, para testes)

## Setup do Projeto

1. Clone o repositório:

```bash
git clone https://github.com/rafaelmachadobr/payment-gateway.git
cd payment-gateway/go-gateway
```

2. Configure as variáveis de ambiente:

```bash
cp .env.example .env
```

3. Inicie o banco de dados:

```bash
docker compose up -d
```

4. Execute as migrations:

```bash
migrate -path migrations -database "postgresql://postgres:postgres@localhost:5432/gateway?sslmode=disable" up
```

5. Execute a aplicação:

```bash
go run cmd/app/main.go
```

## API Endpoints

### Criar Conta

```http
POST /accounts
Content-Type: application/json

{
    "name": "John Doe",
    "email": "john@doe.com"
}
```

Retorna os dados da conta criada, incluindo o API Key para autenticação.

### Consultar Conta

```http
GET /accounts
X-API-Key: {api_key}
```

Retorna os dados da conta associada ao API Key.

### Criar Fatura

```http
POST /invoice
Content-Type: application/json
X-API-Key: {api_key}

{
    "amount": 100.50,
    "description": "Compra de produto",
    "payment_type": "credit_card",
    "card_number": "4111111111111111",
    "cvv": "123",
    "expiry_month": 12,
    "expiry_year": 2025,
    "cardholder_name": "John Doe"
}
```

Cria uma nova fatura e processa o pagamento. Faturas acima de R$ 10.000 ficam pendentes para análise manual.

### Consultar Fatura

```http
GET /invoice/{id}
X-API-Key: {api_key}
```

Retorna os dados de uma fatura específica.

### Listar Faturas

```http
GET /invoice
X-API-Key: {api_key}
```

Lista todas as faturas da conta.

## Testando a API

O projeto inclui um arquivo `test.http` que pode ser usado com a extensão REST Client do VS Code. Este arquivo contém:

- Variáveis globais pré-configuradas
- Exemplos de todas as requisições
- Captura automática do API Key após criação da conta

Para usar:

1. Instale a extensão REST Client no VS Code
2. Abra o arquivo `test.http`
3. Clique em "Send Request" acima de cada requisição
