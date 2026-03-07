# Guia de Scrapers - Vehicle Prospect System

## 📚 Visão Geral

O sistema de scrapers do Vehicle Prospect System foi projetado com foco em **ética**, **escalabilidade** e **facilidade de manutenção**. Cada fonte de dados é um plugin independente que pode ser ativado, desativado e configurado sem afetar outras fontes.

## 🏗️ Arquitetura

### Componentes Principais

```
server/scrapers/
├── baseScraper.ts           # Classe base com funcionalidades comuns
├── scraperRegistry.ts       # Gerenciador central de scrapers
└── sources/
    ├── olxScraper.ts        # Implementação OLX
    ├── mercadoLivreScraper.ts
    ├── webmotorsScraper.ts
    ├── icarrosScraper.ts
    └── socarraoScraper.ts
```

### Fluxo de Dados

```
1. Usuário inicia coleta
   ↓
2. ScraperRegistry seleciona fontes ativas
   ↓
3. Cada scraper faz requisições com delays éticos
   ↓
4. Dados são parseados e normalizados
   ↓
5. Deduplicação por hash
   ↓
6. Salvos no banco de dados
   ↓
7. Leads são gerados e scored
```

## 🤖 Comportamento Ético

### Delays Aleatórios

Cada scraper aguarda entre 2-5 segundos entre requisições:

```typescript
protected async respectDelay(): Promise<void> {
  const delay = randomInt(this.config.minDelayMs, this.config.maxDelayMs);
  await new Promise(resolve => setTimeout(resolve, delay));
}
```

**Benefícios:**
- Não sobrecarrega servidores
- Evita detecção de bots
- Simula comportamento humano

### User-Agent Rotation

Alterna entre 5 navegadores diferentes:

```typescript
protected userAgents: string[] = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...",
  // ... mais 3 variações
];
```

### Respeito a robots.txt

Verifica permissões antes de coletar:

```typescript
protected async checkRobotsTxt(path: string): Promise<boolean> {
  // Verifica se o caminho é permitido
  // Retorna false se desautorizado
}
```

### Retry com Backoff Exponencial

Em caso de erro, aguarda progressivamente antes de tentar novamente:

```typescript
protected async fetchWithRetry(url: string, retries: number = 0) {
  try {
    return await this.client.get(url);
  } catch (error) {
    if (retries < this.config.maxRetries) {
      const backoffDelay = Math.pow(2, retries) * 1000; // 1s, 2s, 4s...
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
      return this.fetchWithRetry(url, retries + 1);
    }
  }
}
```

## 📝 Implementando um Novo Scraper

### 1. Criar a Classe

```typescript
import { BaseScraper, ScraperConfig, ScrapedVehicleAd } from "../baseScraper";

export class NovoSiteScraper extends BaseScraper {
  constructor(config: ScraperConfig) {
    super(config);
  }

  async search(criteria: Record<string, any>): Promise<ScrapedVehicleAd[]> {
    try {
      const searchUrl = this.buildSearchUrl(criteria);
      const html = await this.fetchWithRetry(searchUrl);
      const ads = this.parseAds(html);
      return ads;
    } catch (error) {
      console.error("Scraper error:", error);
      return [];
    }
  }

  private buildSearchUrl(criteria: Record<string, any>): string {
    // Construir URL de busca com parâmetros
    return `/busca?...`;
  }

  private parseAds(html: string): ScrapedVehicleAd[] {
    // Parsear HTML e extrair anúncios
    // Usar cheerio ou similar para DOM parsing
    return [];
  }
}
```

### 2. Registrar no Registry

```typescript
// Em scraperRegistry.ts
this.register(
  new NovoSiteScraper({
    name: "Novo Site",
    source: "novo_site",
    baseUrl: "https://www.novosite.com.br",
    enabled: true,
    minDelayMs: 2000,
    maxDelayMs: 5000,
    timeout: 15000,
    maxRetries: 3,
    respectRobotsTxt: true,
  })
);
```

### 3. Implementar Parsing

Use a biblioteca `cheerio` para parsing HTML:

```typescript
import cheerio from "cheerio";

private parseAds(html: string): ScrapedVehicleAd[] {
  const $ = cheerio.load(html);
  const ads: ScrapedVehicleAd[] = [];

  $(".ad-item").each((_, element) => {
    const ad: ScrapedVehicleAd = {
      externalId: $(element).attr("data-id") || "",
      source: this.config.source,
      url: $(element).find("a").attr("href") || "",
      title: $(element).find(".title").text(),
      price: $(element).find(".price").text(),
      // ... mais campos
    };
    ads.push(ad);
  });

  return ads;
}
```

## 🔧 Configuração

### Configurações Globais

```typescript
interface ScraperConfig {
  name: string;                    // Nome exibível
  source: string;                  // ID único
  baseUrl: string;                 // URL base do site
  enabled: boolean;                // Ativo/inativo
  minDelayMs: number;              // Delay mínimo entre requisições
  maxDelayMs: number;              // Delay máximo
  timeout: number;                 // Timeout da requisição
  maxRetries: number;              // Máximo de tentativas
  respectRobotsTxt: boolean;       // Respeitar robots.txt
}
```

### Alterar Configuração em Runtime

```typescript
const registry = getScraperRegistry();

// Desabilitar um scraper
registry.disableScraper("olx");

// Alterar configuração
registry.updateScraperConfig("webmotors", {
  minDelayMs: 3000,
  maxDelayMs: 8000,
});
```

## 📊 Dados Coletados

Cada anúncio coletado contém:

```typescript
interface ScrapedVehicleAd {
  externalId: string;              // ID no site original
  source: string;                  // Fonte (olx, webmotors, etc)
  url: string;                     // Link do anúncio
  title: string;                   // Título
  brand?: string;                  // Marca
  model?: string;                  // Modelo
  version?: string;                // Versão
  year?: number;                   // Ano
  mileage?: number;                // Quilometragem
  price?: string;                  // Preço
  city?: string;                   // Cidade
  state?: string;                  // Estado
  sellerType?: "individual" | "dealer" | "reseller";
  sellerName?: string;             // Nome do vendedor
  description?: string;            // Descrição
  photoCount?: number;             // Quantidade de fotos
  photoUrls?: string[];            // URLs das fotos
  adPostedAt?: Date;               // Data de publicação
}
```

## 🚀 Usando o Sistema

### Coletar de Todas as Fontes

```typescript
const service = new ScraperManagementService();

const result = await service.collectFromAllSources({
  state: "SP",
  minPrice: 20000,
  maxPrice: 60000,
  minYear: 2015,
});

console.log(`Total: ${result.total}, Criados: ${result.created}, Atualizados: ${result.updated}`);
```

### Coletar de Fonte Específica

```typescript
const result = await service.collectFromSource("olx", {
  state: "SP",
  maxPrice: 50000,
});
```

### Gerenciar Scrapers

```typescript
// Listar todos os scrapers
const scrapers = await service.getScrapers();

// Desabilitar um scraper
await service.disableScraper("olx");

// Atualizar configuração
await service.updateScraperConfig("webmotors", {
  minDelayMs: 3000,
});

// Obter estatísticas
const stats = service.getStats();
console.log(`${stats.enabled} de ${stats.total} scrapers ativos`);
```

## 📈 Monitoramento

### Logs

Todos os scrapers registram em logs:

```
[2026-03-06T23:45:00.000Z] OLX scraper: Iniciando coleta
[2026-03-06T23:45:02.500Z] OLX scraper: 45 anúncios encontrados
[2026-03-06T23:45:05.000Z] Webmotors scraper: 32 anúncios encontrados
[2026-03-06T23:45:07.500Z] Coleta concluída: 77 total, 65 novos, 12 atualizados
```

### Métricas

Acompanhe:
- Total de anúncios coletados
- Taxa de sucesso/erro por fonte
- Tempo médio de coleta
- Quantidade de duplicatas encontradas

## ⚠️ Boas Práticas

### ✅ Faça

- ✓ Respeite delays entre requisições
- ✓ Verifique robots.txt
- ✓ Use User-Agent apropriado
- ✓ Trate erros graciosamente
- ✓ Implemente retry com backoff
- ✓ Monitore taxa de erro
- ✓ Documente mudanças no site

### ❌ Não Faça

- ✗ Fazer requisições simultâneas em massa
- ✗ Ignorar robots.txt
- ✗ Usar User-Agent falso ou genérico
- ✗ Coletar dados pessoais sem consentimento
- ✗ Sobrecarregar servidores
- ✗ Violar termos de serviço
- ✗ Coletar dados protegidos por login

## 🔍 Troubleshooting

### Scraper retorna 0 anúncios

1. Verifique se a URL está correta
2. Verifique se o site mudou sua estrutura HTML
3. Teste manualmente a URL no navegador
4. Verifique logs de erro

### Timeout frequente

1. Aumente o valor de `timeout`
2. Aumente o `maxDelayMs` entre requisições
3. Verifique a conexão de internet
4. Verifique se o site está respondendo lentamente

### Bloqueio de IP

1. Implemente proxy rotation
2. Aumente delays entre requisições
3. Reduza a frequência de coleta
4. Considere usar API oficial se disponível

## 📚 Recursos Adicionais

- [Cheerio - jQuery para Node.js](https://cheerio.js.org/)
- [Puppeteer - Automação de navegador](https://pptr.dev/)
- [Robots.txt Specification](https://www.robotstxt.org/)
- [User-Agent List](https://www.useragentstring.com/)

## 🤝 Contribuindo

Para adicionar um novo scraper:

1. Crie a classe estendendo `BaseScraper`
2. Implemente o método `search()`
3. Registre no `ScraperRegistry`
4. Adicione testes
5. Documente a implementação
6. Faça um pull request

---

**Desenvolvido com ❤️ para scraping responsável**
