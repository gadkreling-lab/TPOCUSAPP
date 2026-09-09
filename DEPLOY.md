# DEPLOY.md — checklist para colocar o TPOCUS no ar

Este arquivo é um checklist, não um deploy já feito. Quem escreveu o código (eu, via
Claude Code) não tem acesso à conta Vercel nem às credenciais do curso — a execução
dos passos abaixo é de quem tiver essa conta (você, ou alguém da operação do curso).

Plataforma: **Vercel** (Functions + integração com Upstash Redis), decidido em
ARQUITETURA.md §4/§6 e nunca revisto depois.

---

## 1. Variáveis de ambiente (obrigatórias antes do primeiro deploy real)

Configurar em **Vercel → Project Settings → Environment Variables**, para os ambientes
Production (e Preview, se for testar antes de promover):

| Variável | O que é | Como gerar |
|---|---|---|
| `TOKEN_SECRET` | Assina os tokens de sessão do aluno (acesso + renovação). | String aleatória, **≥16 caracteres**. Ex.: `openssl rand -base64 32`. |
| `ADMIN_PASSWORD` | Senha da tela `/admin` (geração/revogação de códigos). | String aleatória, **≥8 caracteres**. Ex.: `openssl rand -base64 16`. Combine com quem for operar a tela. |
| `UPSTASH_REDIS_REST_URL` | Endpoint REST do Redis gerenciado (Upstash). | Provisionar um banco Upstash Redis pelo **Vercel Marketplace** (aba Storage do projeto) — ele já preenche isso automaticamente ao conectar o projeto. Alternativa: criar direto em upstash.com e colar aqui. |
| `UPSTASH_REDIS_REST_TOKEN` | Token do mesmo banco Redis. | Vem junto com a URL acima, mesma origem. |

`api/_lib/kv.ts` também aceita `KV_REST_API_URL`/`KV_REST_API_TOKEN` como nomes
alternativos (compatibilidade com a integração antiga "Vercel KV") — não precisa
definir os dois pares, um basta.

**Sem `UPSTASH_REDIS_REST_URL`/`TOKEN` configuradas, o backend cai para `MemoryKV`** —
um mapa em memória por instância de função serverless, que **não persiste entre
requisições reais** (cada invocação pode rodar num processo isolado). Isso é
suficiente para `npm test`/dev local, mas **nunca para produção**: códigos gerados
pela tela `/admin` sumiriam. Confirme que as duas variáveis do Upstash estão
definidas antes de gerar o primeiro lote de códigos de verdade.

## 2. Passos

1. Importar este repositório no Vercel (New Project → escolher o repo).
2. Na aba **Storage** do projeto, conectar/criar um banco **Upstash Redis** pelo
   Marketplace — isso já popula `UPSTASH_REDIS_REST_URL`/`_TOKEN` sozinho.
3. Em **Settings → Environment Variables**, adicionar `TOKEN_SECRET` e
   `ADMIN_PASSWORD` manualmente (não vêm de nenhuma integração).
4. Deploy (push para a branch de produção, ou `vercel --prod` pela CLI).
5. Abrir `/admin` no domínio publicado, entrar com `ADMIN_PASSWORD`, gerar o primeiro
   lote de códigos de acesso para os alunos.
6. Testar o fluxo completo uma vez, de ponta a ponta, num aparelho de teste: abrir o
   app pela URL pública → tela de bloqueio → ativar com um código gerado no passo 5 →
   aceitar o disclaimer → confirmar que os 4 módulos carregam conteúdo (Atlas,
   Calculadoras, Protocolos, Sessão).
7. Revogar esse código de teste depois (`/admin`, ação "Revogar") — ele não deve ser
   distribuído a um aluno de verdade.

## 3. Depois do deploy

- **Vazamento de conteúdo clínico**: repita a checagem que já rodou em toda fase —
  abrir o app publicado, no DevTools → Network, confirmar que `windows.json`,
  `measurements.json` etc. nunca aparecem como arquivo estático, só como resposta
  JSON de `/api/content/*` com o header `Authorization` presente na requisição.
- **PWA instalável**: confirmar "Adicionar à tela inicial" funciona no domínio de
  produção (o manifest só é servido com o domínio HTTPS real, não localhost).
- **Renovação de sessão**: deixar o app aberto e em uso por mais de 15 minutos uma vez,
  confirmar que a renovação silenciosa (`POST /api/renovar`) não derruba a sessão no
  meio de um cálculo ou protocolo em andamento.

## 4. Limitações conhecidas, não resolvidas nesta fase

- Sem alerta automático quando o prazo de um aluno está para vencer — a tela `/admin`
  lista o status, mas ninguém é avisado proativamente. Ficaria para uma fase futura,
  se o curso precisar disso.
- `criarCodigos` (lote) tenta até 10 vezes evitar colisão de código gerado — na prática
  não deveria disparar (8 caracteres, alfabeto de 32 símbolos), mas não há alerta se
  as 10 tentativas esgotarem (o código simplesmente sai duplicado, sobrescrevendo o
  registro anterior). Não é um risco de segurança — é uma perda de dado silenciosa
  num cenário astronomicamente improvável — mas vale registrar.
