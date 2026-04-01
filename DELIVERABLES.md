# Vehicle Prospect System — Entregáveis e Critérios de Aceite

Este documento define exatamente o que será entregue ao final das melhorias para evoluir o sistema em direção a um fluxo de prospecção + conversação robusto e compliant com WhatsApp Cloud API.

## 1) Baseline de coleta
- **Entregável:** `reports/baseline-YYYYMMDD.md` com métricas por fonte (OLX, Webmotors, iCarros, Mercado Livre, SóCarrão): % de anúncios com preço, % com contato, latência média, links de amostra.
- **Aceite:** Amostra mínima de 20 anúncios reais por fonte; relatório versionado no repositório.

## 2) Scrapers com preço e contato confiáveis
- **Entregável:** Scrapers com fallback para preço e contato, normalização de telefone/WhatsApp, retries com backoff.
- **Aceite:** ≥95% dos anúncios de teste por fonte retornam `price` e `contactInfo`; anúncios sem esses campos entram como `isActive=false` e são logados para retry.

## 3) Deduplicação e histórico de preço
- **Entregável:** Persistência ajustada para atualizar anúncios existentes, gravar `price_history` em mudanças e manter `lastSeenAt`.
- **Aceite:** Reprocessar um anúncio existente não cria novo ID; mudança de preço gera linha em `price_history`.

## 4) Dashboard em dados reais
- **Entregável:** Dashboard consumindo tRPC/DB (sem mocks), auto-refresh de 30s, cartões com métricas reais, painel de completude (preço/contato) e novos anúncios 24h.
- **Aceite:** Todas as métricas renderizam a partir da base; ausência de dados mockados confirmada em revisão de código.

## 5) Scoring guiado por filtros
- **Entregável:** DSL/JSON de regras por filtro; reprocessamento em batch; exibição dos motivos do score no dashboard.
- **Aceite:** Alterar regra altera score/prioridade em ≤1 min e exibe razões; prioridades seguem thresholds (≥70 alta, 40–69 média).

## 6) Chat/WhatsApp com templates por segmento
- **Entregável:** Endpoint `chat.send` aplicando templates com placeholders (vendedor, modelo, preço, link, cidade, score, delta para alvo); logs de envio e limites de frequência.
- **Aceite:** Envio registrado com status; opt-out respeitado; limite/hora configurável; detalhe do lead mostra histórico de mensagens.

## 7) Monitoramento e alertas
- **Entregável:** Métricas por fonte/job em `/scrapers/health`, alertas quando completude <90% ou 3 falhas seguidas.
- **Aceite:** Alerta disparado em cenário simulado de falha; métricas visíveis no painel/endpoint.

## 8) Domínio de conversação e compliance WhatsApp
- **Entregável:** Novas entidades (contacts, conversations, messages, message_events, bot_sessions, outbound_queue, templates, manual_interactions, consent tracking) com migrações Drizzle.
- **Aceite:** Timeline unificada por lead; consentimento registrado; status de entrega/leitura armazenado; bot/humano com handoff explícito.

## 9) Documentação e handover
- **Entregável:** `docs/operacao.md` cobrindo: rodar coleta, ajustar regras de score, editar templates, interpretar métricas, limites de envio, fluxo de opt-in/consentimento.
- **Aceite:** Documento revisado e disponível no repo; passos reproduzíveis em ambiente de staging.
