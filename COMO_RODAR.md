# Como Rodar o Sistema - Vehicle Prospect System

Este documento explica passo a passo como ligar o sistema no seu computador local usando o PostgreSQL.

## 🛠️ Pré-requisitos
- **Node.js**: Versão 18 ou superior.
- **pnpm**: Recomendado (instalado via `npm install -g pnpm`).
- **PostgreSQL**: Instalado e rodando (porta padrão 5432).
- **Base de Dados**: Criar um banco chamado `vehicle_prospect`.

## 🚀 Passo a Passo para Ligar

### 1. Configurar o arquivo .env
Certifique-se de que o arquivo `.env` na raiz do projeto está configurado corretamente com seu usuário e senha do PostgreSQL:
```env
DATABASE_URL=postgresql://postgres:4263@localhost:5432/vehicle_prospect
```

### 2. Instalar as dependências
Abra o terminal na pasta do projeto e rode:
```bash
pnpm install
```

### 3. Sincronizar o Banco de Dados
Para criar todas as tabelas e índices necessários no PostgreSQL:
```bash
pnpm db:push
```

### 4. Iniciar o Sistema
Para ligar o servidor (Backend + Frontend juntos):
```bash
pnpm dev
```

## 🌐 Acesso
Após rodar o comando `pnpm dev`, o terminal mostrará uma mensagem como:
`Server running on http://0.0.0.0:3000/`

Abra seu navegador e acesse:
**[http://localhost:3000](http://localhost:3000)**

---

## 📌 Comandos Úteis
- `pnpm dev`: Liga o sistema em modo de desenvolvimento.
- `pnpm db:push`: Atualiza a estrutura do banco de dados.
- `pnpm test`: Roda os testes unitários.
- `pnpm build`: Cria a versão de produção.
