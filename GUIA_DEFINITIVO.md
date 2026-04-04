# Guia Definitivo - Sistema de Prospecção de Veículos

Este documento centraliza todas as informações necessárias para entender, executar, acessar e dar manutenção no sistema de Prospecção de Veículos.

---

## 1. Visão Geral do Sistema
O sistema é uma plataforma automatizada para garimpar (fazer scraping), qualificar e gerenciar anúncios de veículos em diferentes portais (OLX, Mercado Livre, Webmotors, etc.). Ele conta com inteligência para evitar duplicidades, filtrar oportunidades e integrar com o WhatsApp para contato rápido com o vendedor.

**Principais Tecnologias:**
- **Frontend:** React, Vite, TailwindCSS, shadcn/ui.
- **Backend:** Node.js, Express, tRPC.
- **Banco de Dados:** PostgreSQL com Drizzle ORM.
- **Scraping:** Playwright (com suporte a IA do Gemini para limpeza de dados).
- **Mensageria:** `whatsapp-web.js` para automação via WhatsApp (leitura de QR Code).

---

## 2. Como Rodar o Sistema

A forma mais recomendada e estável de rodar o sistema (especialmente em produção/uso diário) é através do **Docker**.

### Opção A: Usando Docker (Recomendado)
Certifique-se de ter o Docker e o Docker Compose instalados.

1. Na raiz do projeto, execute:
   ```bash
   docker compose up -d --build
   ```
2. Para parar o sistema:
   ```bash
   docker compose down
   ```
3. Para ver os logs da aplicação em tempo real:
   ```bash
   docker compose logs -f app
   ```

### Opção B: Modo Desenvolvimento (Nativo / Local)
Ideal para quando você for modificar o código fonte.

1. Instale as dependências:
   ```bash
   pnpm install
   ```
2. Suba **apenas** o banco de dados no Docker:
   ```bash
   docker compose up db pgadmin -d
   ```
3. Rode as migrações/push do banco (se necessário):
   ```bash
   pnpm db:push
   ```
4. Inicie o servidor de desenvolvimento:
   ```bash
   pnpm dev
   ```

---

## 3. Acessos aos Serviços (Docker)

Quando rodado via `docker compose up -d`, os seguintes serviços estarão disponíveis:

### 🖥️ Aplicação Principal (Dashboard)
- **URL:** [http://localhost:3000](http://localhost:3000)
- **Login:** Crie uma conta ou use o login configurado. Aqui você gerencia a prospecção e inicia os robôs.

### 🐘 pgAdmin (Gerenciador do Banco de Dados)
- **URL:** [http://localhost:8080](http://localhost:8080)
- **Email:** `admin@admin.com`
- **Senha:** `admin`

**Como conectar o pgAdmin ao Banco de Dados da aplicação:**
1. Acesse o pgAdmin e faça login.
2. Clique com o botão direito em **Servers** > **Register** > **Server...**
3. Na aba **General**, dê um nome (ex: `VehicleDB`).
4. Na aba **Connection**, preencha:
   - **Host name/address:** `db`  *(atenção: use a palavra 'db', pois é o nome do container na rede do Docker)*. Se estiver rodando o app nativamente mas o banco no docker, use `localhost`.
   - **Port:** `5432`
   - **Maintenance database:** `vehicle_prospect`
   - **Username:** `postgres`
   - **Password:** `4263`
5. Clique em **Save**. Você já pode visualizar a tabela `vehicle_ads`, `leads`, etc.

---

## 4. Integração com o WhatsApp

O sistema possui integração profunda com o WhatsApp para agilizar o contato.

1. **Conectando o WhatsApp:**
   No menu lateral da aplicação, acesse "Conexão WhatsApp". Um QR Code será gerado. Abra o aplicativo do WhatsApp no celular > Aparelhos Conectados > Ler QR Code.
2. **Templates de Mensagem:**
   Acesse a aba de Templates. Você pode configurar a mensagem inicial utilizando variáveis (tags) como `{{veiculo}}`, `{{preco}}`, `{{cidade}}`.
3. **Uso no Dashboard:**
   Na tabela principal do Dashboard, caso o robô tenha conseguido extrair o número de telefone, o botão verde **"Chamar no Whats"** aparecerá. Ele já prepara o link e a mensagem com base no anúncio clicado.

---

## 5. Arquitetura e Manutenção dos Scrapers

Os robôs (scrapers) estão localizados na pasta `server/scrapers/sources/`.

**O que fazer quando um site parar de coletar dados?**
Sites como OLX e Webmotors mudam sua estrutura HTML com frequência.
1. Abra o site alvo (ex: olx.com.br) e faça uma busca.
2. Inspecione os elementos (F12) e verifique se as classes ou IDs (ex: `.sc-1fcmfeb-2`, `#ad-list`) mudaram.
3. Se mudaram, você ou o desenvolvedor precisa atualizar os seletores no respectivo arquivo, por exemplo: `server/scrapers/sources/olxScraper.ts`.

**Bloqueios (Captcha):**
Se muitas requisições forem feitas rapidamente, o portal pode bloquear o IP. O sistema utiliza *delays* para simular comportamento humano. Se necessário, ajuste os `delays` no arquivo `server/scrapers/vehicleScraper.ts` ou utilize proxies no futuro.

---

## 6. Comandos Úteis e Troubleshooting

- **O banco de dados não está sincronizado / Erro de tabela não existe:**
  Rode dentro da pasta do projeto:
  ```bash
  npx drizzle-kit push
  ```

- **Limpar o banco de dados (CUIDADO - apaga todos os dados):**
  Se quiser zerar o banco e os dados armazenados no PostgreSQL do Docker:
  ```bash
  docker compose down -v
  ```

- **Para testar scrapers individualmente sem rodar a UI completa:**
  Use os scripts de teste no terminal:
  ```bash
  npx tsx scripts/test-scraper.ts
  ```

## 7. Estrutura de Diretórios Importante

- `/client/src/pages/` - Páginas da interface (React).
  - `Dashboard.tsx` - Onde estão os botões de controle e tabela de prospecção.
- `/server/scrapers/` - O "cérebro" dos roubôs de coleta.
- `/server/services/` - Lógicas de negócios, deduplicação (`deduplicationEngine.ts`) e integração de Whatsapp (`whatsAppBotService.ts`).
- `/drizzle/schema.ts` - A estrutura de todas as tabelas do banco de dados. Se adicionar um campo novo (ex: contato), é aqui que deve ser declarado.
