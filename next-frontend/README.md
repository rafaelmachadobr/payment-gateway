# Next.js Frontend

Interface web para acompanhamento e submissão de faturas.

## Stack

- **Next.js** 15 + React 19
- **TypeScript**
- **Tailwind CSS** 4
- **Radix UI** — componentes acessíveis

## Como executar

### Pré-requisito

O Go Gateway deve estar no ar em `http://app:8080` dentro da rede Docker (hostname `app` é o serviço definido no `docker-compose.yaml` do go-gateway).

### 1. Subir o container

```bash
docker compose up -d
```

### 2. Instalar dependências e iniciar

```bash
docker exec next-frontend-nextjs-1 sh -c "cd /home/node/app && npm install && npm run dev"
```

Acesse em `http://localhost:3000`.

## Rotas

| Rota | Descrição | Middleware |
|---|---|---|
| `/` | Redireciona para `/login` | — |
| `/login` | Autenticação via API Key | — |
| `/invoices` | Listar faturas da conta | Requer cookie `apiKey` |
| `/invoices/create` | Criar nova fatura | Requer cookie `apiKey` |
| `/invoices/[id]` | Detalhe de uma fatura | Requer cookie `apiKey` |

Rotas sob `/invoices/*` são protegidas pelo middleware Next.js (`src/middleware.ts`): se o cookie `apiKey` não existir, o usuário é redirecionado para `/login`.

## Autenticação

O frontend não cria contas. O fluxo de login é:

1. Usuário acessa `/login` e informa sua **API Key** (obtida ao criar uma conta via `POST /accounts` no Go Gateway)
2. O frontend valida a API Key chamando `GET /accounts` com o header `X-API-Key`
3. Se válida, a API Key é armazenada no cookie `apiKey`
4. Todas as requisições seguintes leem o cookie e o enviam como header `X-API-Key` para o Go Gateway

## Comunicação com o backend

Todas as chamadas são feitas para o Go Gateway. Dentro da rede Docker, o host é `app:8080`:

| Ação | Chamada |
|---|---|
| Validar API Key no login | `GET http://app:8080/accounts` |
| Listar faturas | `GET http://app:8080/accounts` (dados da conta) |
| Criar fatura | `POST http://app:8080/invoice` |
| Detalhe de fatura | `GET http://app:8080/invoice/{id}` |
