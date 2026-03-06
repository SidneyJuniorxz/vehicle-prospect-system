# Vehicle Prospect System - MVP

Um sistema completo de prospecção de anúncios de veículos que monitora múltiplas fontes, qualifica leads automaticamente e fornece um painel intuitivo para gestão de oportunidades comerciais.

## 🎯 Objetivo

Criar uma base estruturada de oportunidades comerciais a partir de anúncios públicos de veículos, filtrando por critérios de interesse e priorizando os melhores leads para abordagem comercial posterior.

## ✨ Funcionalidades Principais

### 1. Coleta de Anúncios
- Suporte para múltiplas fontes (OLX, Mercado Livre)
- Coleta manual sob demanda
- Agendamento automático com cron jobs
- Captura de dados estruturados: marca, modelo, ano, preço, quilometragem, localização, etc.
- Deduplicação inteligente baseada em hash e similaridade

### 2. Filtro Inteligente
- Filtros configuráveis por:
  - Faixa de preço
  - Ano (mínimo e máximo)
  - Quilometragem máxima
  - Região/cidade/estado
  - Marca/modelo
  - Tipo de anunciante (particular, loja, revenda)
  - Presença de palavras-chave
  - Tempo de publicação
- Múltiplas configurações de filtro salvas

### 3. Scoring e Priorização
- Motor de score com múltiplos fatores:
  - Preço abaixo da média
  - Recência do anúncio
  - Sinais de urgência (urgente, preciso vender, etc.)
  - Quilometragem baixa
  - Tipo de vendedor
  - Quantidade de fotos
- Classificação automática em: alta, média, baixa prioridade
- Motivo do score explicado

### 4. Gestão de Leads
- Status do lead: novo, filtrado, revisado, aprovado, rejeitado, em acompanhamento, concluído
- Notas e observações
- Data de contato
- Histórico de mudanças

### 5. Painel Web
- Dashboard com estatísticas em tempo real
- Tabela de leads com sorting e filtros dinâmicos
- Visualização detalhada de cada lead
- Exportação para CSV e Excel
- Notificações de leads de alta prioridade

### 6. Multi-usuário
- Três níveis de acesso:
  - **Admin**: Acesso total, gerenciamento de usuários
  - **Analyst**: Acesso completo aos leads e configurações
  - **Viewer**: Apenas visualização de leads

### 7. Logs e Auditoria
- Registro de todas as ações
- Histórico de coletas
- Rastreamento de mudanças

## 🏗️ Arquitetura

```
vehicle_prospect_system/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── pages/         # Páginas (Home, Dashboard)
│   │   ├── components/    # Componentes reutilizáveis
│   │   ├── lib/           # Utilitários (tRPC client)
│   │   └── App.tsx        # Roteamento principal
│   └── public/            # Assets estáticos
├── server/                # Backend Express + tRPC
│   ├── routers.ts         # Definição de procedures tRPC
│   ├── db.ts              # Query helpers
│   ├── scrapers/          # Módulos de coleta
│   ├── filters/           # Motor de filtros
│   ├── scoring/           # Motor de scoring
│   ├── dedup/             # Deduplicação
│   └── services/          # Serviços de negócio
├── drizzle/               # Schema e migrações
│   └── schema.ts          # Definição de tabelas
└── package.json           # Dependências
```

## 📊 Schema do Banco de Dados

### Tabelas Principais

**vehicle_ads**: Anúncios coletados
- id, externalId, source, url, title, brand, model, year, price, mileage, city, state, sellerType, description, photoCount, photoUrls, adPostedAt, collectedAt, lastSeenAt, hash

**leads**: Leads qualificados
- id, adId, score, priority, scoreReason, status, notes, contactedAt

**filter_configs**: Configurações de filtro
- id, userId, name, description, isActive, config (JSON)

**scoring_rules**: Regras de scoring
- id, userId, name, description, isActive, rules (JSON)

**collection_jobs**: Coletas agendadas
- id, userId, name, source, cronExpression, isActive, config, lastRunAt, nextRunAt

**activity_logs**: Auditoria
- id, userId, action, entityType, entityId, details, createdAt

**notifications**: Notificações
- id, userId, type, title, message, leadId, isRead, sentAt

**price_history**: Histórico de preços
- id, adId, price, recordedAt

## 🚀 Começando

### Pré-requisitos
- Node.js 18+
- MySQL/TiDB
- pnpm ou npm

### Instalação

1. **Clonar o repositório**
```bash
git clone <repo-url>
cd vehicle_prospect_system
```

2. **Instalar dependências**
```bash
pnpm install
```

3. **Configurar ambiente**
Crie um arquivo `.env` com:
```env
DATABASE_URL=mysql://user:password@localhost:3306/vehicle_prospect
JWT_SECRET=seu-secret-aqui
VITE_APP_ID=seu-app-id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://manus.im/oauth
```

4. **Executar migrações**
```bash
pnpm db:push
```

5. **Iniciar desenvolvimento**
```bash
pnpm dev
```

A aplicação estará disponível em `http://localhost:3000`

## 📝 Uso

### Fluxo Básico

1. **Autenticação**: Faça login com Manus OAuth
2. **Configurar Filtros**: Acesse Settings > Filters para criar suas regras de filtro
3. **Configurar Scoring**: Defina os pesos dos fatores de scoring
4. **Coletar Anúncios**: Clique em "Coletar Anúncios" ou agende coletas automáticas
5. **Gerenciar Leads**: Visualize, filtre e acompanhe seus leads no painel
6. **Exportar**: Exporte leads em CSV ou Excel para análise externa

### API tRPC

Todos os endpoints estão disponíveis via tRPC:

```typescript
// Listar leads
const leads = await trpc.leads.list.query({
  priority: 'high',
  status: 'new',
  limit: 50
});

// Coletar anúncios
const result = await trpc.collection.collect.mutate({
  searchParams: { state: 'SP', maxPrice: 100000 },
  filterCriteria: { minYear: 2015 }
});

// Atualizar lead
await trpc.leads.update.mutate({
  id: 1,
  status: 'reviewed',
  notes: 'Contato feito'
});
```

## 🔧 Configuração

### Filtros

Exemplo de configuração de filtro:
```json
{
  "minPrice": 20000,
  "maxPrice": 60000,
  "minYear": 2015,
  "maxMileage": 100000,
  "states": ["SP", "RJ"],
  "sellerTypes": ["individual"],
  "requiredKeywords": ["urgente", "abaixo da fipe"],
  "excludedKeywords": ["leilão", "sinistrado"]
}
```

### Regras de Scoring

Exemplo de configuração de scoring:
```json
{
  "priceBelow": {
    "name": "Price Below Average",
    "weight": 25,
    "enabled": true,
    "config": { "targetPrice": 50000 }
  },
  "recentAd": {
    "name": "Recent Advertisement",
    "weight": 20,
    "enabled": true,
    "config": { "maxDaysOld": 3 }
  },
  "urgencySignals": {
    "name": "Urgency Signals",
    "weight": 20,
    "enabled": true
  }
}
```

## 📧 Notificações

O sistema envia notificações automáticas para:
- Novos leads de alta prioridade
- Coletas completadas
- Alertas do sistema

Notificações são entregues via:
- Painel (in-app)
- Email (configurável)

## 🔐 Segurança

- Autenticação via Manus OAuth
- Controle de acesso baseado em roles
- Logs de auditoria de todas as ações
- Dados sensíveis nunca são expostos
- Sem bypass de proteções de plataformas

## 📈 Escalabilidade

O sistema é projetado para crescimento:
- Suporte para múltiplas fontes de dados
- Índices de banco de dados otimizados
- Processamento assíncrono de coletas
- Cache de deduplicação
- Paginação eficiente

## 🛠️ Desenvolvimento

### Estrutura de Código

**Backend (tRPC + Express)**
- `server/routers.ts`: Definição de procedures
- `server/db.ts`: Query helpers
- `server/services/`: Lógica de negócio
- `server/scrapers/`: Coleta de dados
- `server/filters/`: Filtragem
- `server/scoring/`: Scoring
- `server/dedup/`: Deduplicação

**Frontend (React + Tailwind)**
- `client/src/pages/`: Páginas principais
- `client/src/components/`: Componentes reutilizáveis
- `client/src/lib/trpc.ts`: Cliente tRPC

### Testes

```bash
# Executar testes
pnpm test

# Testes em watch mode
pnpm test:watch
```

### Build

```bash
# Build para produção
pnpm build

# Iniciar servidor de produção
pnpm start
```

## 📚 Documentação

- **API**: Veja `server/routers.ts` para documentação de endpoints
- **Schema**: Veja `drizzle/schema.ts` para estrutura de dados
- **Componentes**: Veja `client/src/components/` para componentes reutilizáveis

## 🐛 Troubleshooting

### Erro de conexão com banco de dados
- Verifique `DATABASE_URL` no `.env`
- Certifique-se de que o MySQL está rodando
- Execute `pnpm db:push` para criar tabelas

### Erro de autenticação
- Verifique `VITE_APP_ID` e `OAUTH_SERVER_URL`
- Limpe cookies do navegador
- Verifique se a URL de callback está configurada

### Coleta não funciona
- Verifique logs em `server/_core/index.ts`
- Teste manualmente com `pnpm dev` e clique em "Coletar Anúncios"
- Verifique se as fontes estão acessíveis

## 📞 Suporte

Para questões, bugs ou sugestões:
1. Abra uma issue no repositório
2. Entre em contato com o time de desenvolvimento
3. Consulte a documentação em `docs/`

## 📄 Licença

MIT

## 🎉 Próximos Passos

- [ ] Integração com APIs oficiais de OLX e Mercado Livre
- [ ] Machine learning para detecção de fraude
- [ ] Integração com CRM (Salesforce, HubSpot)
- [ ] Webhooks para integrações externas
- [ ] Dashboard avançado com gráficos
- [ ] Mobile app
- [ ] Análise de tendências de mercado

---

**Desenvolvido com ❤️ para otimizar sua prospecção de veículos**
