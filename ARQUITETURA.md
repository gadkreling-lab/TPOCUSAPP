# ARQUITETURA.md — App TPOCUS

Fase 0. Decisões técnicas antes de escrever qualquer componente. Este documento não
descreve UI — descreve como o conteúdo clínico entra no app, como os quatro módulos
compartilham motores genéricos, e como o acesso é controlado.

> **Atualização de 2026-09-08:** o requisito original de "100% funcional offline" foi
> **revogado pelo autor**, em favor de controle de acesso real (DRM): *"Acho que podemos
> abrir mão do offline para termos DRM."* Isso muda a arquitetura de forma estrutural —
> ver seção 4. Onde o resto deste documento ainda falar em "offline" como requisito, é
> texto histórico que a seção 4 substitui; não removi essas menções do meio do documento
> para não perder o raciocínio de por que a decisão original existia.

---

## 0. Estado de partida — o que já existe

Não recebi `Ebook.pdf`. Recebi, em vez disso, um **content pack já extraído e
reconciliado** contra o ebook (pasta `src/content/` + `docs/` + `CLAUDE.md`, agora
importados para a raiz do repo). Ele já faz boa parte do trabalho que a Fase 0
normalmente pediria de mim:

- 9 arquivos JSON (`windows`, `findings`, `pathologies`, `measurements`, `glossary`,
  `references`, `protocols`, `images`, `corrections`) + 54 figuras em WebP, todos
  validados por `scripts/validate-content.mjs` (rodei — passa, 0 erros).
- Tipos TypeScript (`src/content/types.ts`) e camada de consulta (`src/content/index.ts`)
  já escritos e consistentes com o JSON real.
- Toda medida de `measurements.json` conferida caractere a caractere contra o texto
  citado no spec do projeto (TSVE 1,7–2,3 cm, VTI 18–25 cm, VS 70–140 mL, DC 4–7 L/min,
  EPSS <7/7–13/>13, MAPSE ≥10/8–10/<8, TAPSE <17, VCI espontânea e mecânica com os
  4 pré-requisitos da pág. 34, Balik ×20, Brockelsby 1/2/>3 EIC) — bate exatamente com
  o que está descrito na especificação do produto. Tratei isso como confirmação
  independente dos valores, não como fonte adicional.
- `protocols.json` já tem BLUE com o `fluxograma` transcrito da Figura 16 (pág. 60,
  confirmei que a figura `fig-p060-01.webp` está no pacote de imagens), E-FAST com as
  8 janelas e a lógica instável→cirurgia / estável→TC, e RUSH com Pump/Tank/Pipes e os
  4 perfis de choque + conduta inicial (tabela pág. 68).
- Conteúdo de fonte externa (21 itens: perfis do BLUE, BLUE-points, técnica das 8
  janelas do E-FAST, 2 achados pulmonares) já vem marcado com `fonteExterna` — o mesmo
  mecanismo de rastreabilidade que o projeto pede.
- CASA **não estava no content pack original** — consistente com o app spec ("não está
  no ebook"). Desde 2026-09-08 tem uma entrada de rascunho em `protocols.json`, extraída
  dos dois artigos-fonte que você enviou — ver seção 2.3.

Tratei este content pack como o ponto de partida da Fase 0, não como um substituto para
ler o ebook: onde `gaps.md` já registra uma lacuna, listo abaixo em `PERGUNTAS.md` em vez
de fechá-la sozinho. Onde o pack já resolveu algo com fonte externa citada, mantive a
marcação e não revalidei contra o PDF (não tenho o PDF nesta sessão — ver PERGUNTAS.md).

**Decisão:** o schema de `types.ts` vira a base dos tipos de conteúdo do app. Vou
estendê-lo (protocolos genéricos, calculadoras, sessão) em vez de recomeçar.

---

## 1. Stack e estrutura de pastas

```
tpocus-app/
├── CLAUDE.md                      # regras do content pack (já existe, não mexer)
├── ARQUITETURA.md                 # este arquivo
├── PERGUNTAS.md                   # lacunas + materiais pendentes
├── VALIDACAO-CLINICA.md           # já existe — CASA aguardando revisão dos sócios
├── docs/
│   ├── content-pack-README.md     # spec do schema do content pack (já existe)
│   └── gaps.md                    # lacunas do ebook (já existe)
├── referencias/                   # PDFs/artigos complementares que o autor enviar
│   ├── gardner-2017-casa-exam.pdf
│   └── clattenburg-2018-casa-implementation.pdf
├── scripts/
│   └── validate-content.mjs       # validação estrutural do content/ (já existe)
├── api/                            # NOVO — backend real (auth + conteúdo), ver seções 4 e 6
│   ├── ativar.ts                  # ativação de código + emissão de sessão
│   ├── renovar.ts                 # renovação silenciosa do token de acesso
│   ├── admin/                     # tela administrativa (Fase 7) — gerar/listar/revogar códigos
│   └── content/                   # conteúdo clínico servido sob demanda, autenticado
│       ├── windows.ts
│       ├── findings.ts
│       ├── measurements.ts
│       ├── protocols.ts
│       ├── calculators.ts
│       ├── protocol-flows.ts
│       └── images/[arquivo].ts    # serve o binário da imagem, atrás do mesmo gate
├── public/
│   ├── manifest.webmanifest
│   └── icons/
├── src/
│   ├── content/                   # DADO, só de SERVIDOR — nunca importado pelo cliente, ver seção 4
│   │   ├── types.ts
│   │   ├── index.ts
│   │   ├── *.json                 # inclui protocols.json com os 4 protocolos, CASA já incluso
│   │   ├── images/                # 54 webp do ebook
│   │   ├── calculators/           # NOVO — definições declarativas das calculadoras
│   │   │   ├── types.ts
│   │   │   └── *.json
│   │   └── protocol-flows/        # NOVO, Fase 3/4 — grafo de nós de execução, um arquivo
│   │       └── *.json             # por protocolo (blue/efast/rush/casa), ver seção 2.2
│   ├── engine/                    # motores genéricos, ver seção 3
│   │   ├── protocol/              # máquina de estados do módulo 3
│   │   └── calculator/            # motor de formulário + fórmula do módulo 2
│   ├── queries/                   # NOVO — hooks de busca (fetch autenticado a /api/content/*),
│   │   │                          # a única forma dos módulos alcançarem conteúdo, ver seção 4
│   │   └── cache.ts               # cache em memória por sessão (nunca em disco)
│   ├── modules/
│   │   ├── atlas/                 # módulo 1
│   │   ├── calculators/           # módulo 2 (UI sobre o engine/calculator)
│   │   ├── protocols/             # módulo 3 (UI sobre o engine/protocol)
│   │   └── session/                # módulo 4
│   ├── storage/                   # IndexedDB (idb) — só sessões de exame salvas pelo aluno
│   ├── auth/                      # NOVO, Fase 1 — sessão (token de acesso + renovação), ver seção 6
│   ├── ui/                        # design system: Button, NumberField, Badge, Tabs...
│   ├── app/                       # rotas, layout, providers, disclaimer gate
│   └── sw/                        # service worker — só app shell, ver seção 4
├── tests/
│   └── engine/calculator/*.test.ts
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
└── package.json
```

**Stack confirmada pelo spec do produto**, sem desvio:
React 18 + TypeScript + Vite + Tailwind CSS. PWA via `vite-plugin-pwa` (Workbox por
baixo — evita escrever o service worker à mão e ainda dá controle fino de estratégia de
cache por rota de asset). `idb` para IndexedDB. Zod para validação de schema em build
time. Vitest para os testes de fórmula (roda nativo com Vite, sem config extra).

Sem React Router pesado — dado que o app é mobile-first e as 4 seções são bem definidas,
uso `wouter` (roteador de ~1.5 KB) ou um roteador manual baseado em `history` — decido na
Fase 1 comparando bundle real; qualquer um resolve. Nenhuma outra dependência de peso
(sem Redux, sem UI kit inteiro — Tailwind + componentes próprios).

---

## 2. Conteúdo é dado — como isso se aplica aos módulos novos

O content pack já implementa a regra central para janelas/achados/patologias/protocolos
descritivos. Falta a mesma disciplina para:

### 2.1 Calculadoras (`src/content/calculators/*.json`)

Cada calculadora é uma definição declarativa, não um componente. Schema proposto:

```ts
interface CalculatorDef {
  id: string                    // "debito-cardiaco"
  nome: string
  paginaEbook: number | null    // null só quando TODO campo do resultado for complementar
  campos: FieldDef[]
  resultados: ResultDef[]
  comoMedir: string[]           // aba "Como medir" — pode reusar passosAquisicao de measurements.json
  armadilhas: string[]          // aba "Armadilhas"
  dicas?: string[]
  gate?: GateDef                // ex.: VCI — seletor espontânea/mecânica muda a fórmula usada
}

interface FieldDef {
  id: string                    // "tsveDiametro"
  label: string
  unidade: string
  tipo: 'number'
  min?: number; max?: number; step?: number
  faixaReferencia?: { min: number; max: number }  // para o selo visual no próprio campo
  ajudaRapidaImpacto?: boolean  // liga o preview de ±1 mm em tempo real (só TSVE)
}

interface ResultDef {
  id: string
  label: string
  unidade: string
  formula: string                 // referência simbólica resolvida pelo motor (ver §3.2)
  faixaReferencia?: { min: number; max: number; unidade: string }
  interpretacao: (valor: number) => { texto: string; severidade: 'normal'|'limitrofe'|'alterado' }
  origem: 'ebook' | 'complementar'
  paginaEbook?: number
}
```

- `origem: 'complementar'` é o rótulo do **Índice Cardíaco** (Mosteller) — a fórmula em
  si (SC = √(altura_cm × peso_kg / 3600)) é padrão de literatura, citada explicitamente
  no seu spec, não inventada por mim; ainda assim ela não é do ebook e o app precisa
  dizer isso, com a mesma disciplina do `fonteExterna` do content pack.
- O gate do índice de distensibilidade da VCI (4 pré-requisitos, pág. 34) é dado, não
  lógica de componente: um array de `{ id, label }` marcados como obrigatórios; se
  qualquer um estiver desmarcado, o motor troca o `interpretacao` padrão por um texto de
  aviso fixo — ambos vêm do JSON, a UI só decide qual mostrar.
- `formula` como string simbólica (não código arbitrário nem `eval`) — motor descrito na
  próxima seção.

### 2.2 Protocolos (extensão do `Protocol` existente)

O `Protocol` do content pack já tem os campos de conteúdo textual do E-FAST/RUSH/BLUE,
mas **não tem, ainda, o grafo de nós pergunta→resposta→próximo** exigido pelo motor do
módulo 3 (o `fluxograma` do BLUE é uma transcrição da figura, não o schema de execução —
propositalmente, porque são coisas diferentes: um é fonte, o outro é o que a máquina de
estados percorre). Vou criar `src/content/protocol-flows/*.json`, um arquivo por
protocolo, com o schema de nós do spec do produto:

```ts
interface ProtocolFlow {
  id: string                    // mesmo id do Protocol correspondente
  noInicial: string
  nos: Record<string, NoProtocolo>
}

type NoProtocolo =
  | { tipo: 'pergunta'; janela: string; comoFazer?: string; pergunta: string
      opcoes: { label: string; proximo: string }[]
      indeterminadoProximo: string   // TODO nó tem "não consegui avaliar" — obrigatório no schema
      achadosDeApoio?: string[]; imagemId?: string }
  | { tipo: 'conclusao'; diagnostico: string | string[]  // string[] quando >1 perfil compatível (RUSH misto)
      confianca: 'alta'|'media'|'baixa'|'indeterminado'
      justificativa: string; proximosPassos: string[]; cuidado: string }
```

Esse arquivo referencia o `ProtocolFlow` correspondente por `id`, e a UI busca o
`Protocol` (conteúdo descritivo, achados de apoio, tabela de perfis) e o `ProtocolFlow`
(grafo de execução) juntos. Não fundo os dois arquivos porque servem a leitores
diferentes: `protocols.json` é o "manual", `protocol-flows/*.json` é o "roteiro" — e a
Regra do CLAUDE.md de não misturar `fluxograma` (fonte: figura do ebook) com
`regrasDecisao` (fonte: artigo) pede exatamente essa separação de responsabilidade.

`indeterminadoProximo` obrigatório em todo nó de pergunta implementa o requisito "janela
inadequada em TODO nó" — o zod falha o build se faltar.

### 2.3 CASA — conteúdo já extraído (2026-09-08), execução ainda na Fase 4

Você enviou os dois artigos-fonte (Gardner 2017 e Clattenburg 2018) antes da Fase 4, e o
conteúdo descritivo já está pronto: `protocols.json` ganhou um 4º item,
`id: "protocolo-casa"`, no mesmo formato dos outros três protocolos (objetivo, etapas,
limitações, `fonteExterna` cobrindo o protocolo inteiro), mais campos específicos —
`status: "pendente_validacao"`, `timerSegundos: 10`, `alertaRetomarCompressoes: true` —
que o motor de protocolos vai ler na Fase 4 para desenhar o timer e o alerta "retome as
compressões". `VALIDACAO-CLINICA.md` já existe, com a lista completa para os sócios
revisarem antes de o protocolo sair de rascunho.

O que **continua** para a Fase 3/4, porque depende do motor de protocolo genérico ainda
não existir: o grafo de execução (`src/content/protocol-flows/casa.json`, nós
pergunta→resposta→próximo, ver seção 2.2) que transforma as 3 `etapas` já descritas em
telas navegáveis com avançar/voltar. A UI desse grafo checa `status` no `Protocol`
correspondente e — antes de renderizar qualquer conclusão do CASA — mostra um aviso
permanente "conteúdo em validação clínica pelos sócios, não publicado", herdado
automaticamente de `protocolo-casa.avisoClinico`.

---

## 3. Motores genéricos

### 3.1 Motor de protocolo (`src/engine/protocol/`)

Máquina de estados pura, sem conhecimento de BLUE/RUSH/E-FAST especificamente:

```ts
interface ProtocolState {
  protocoloId: string
  noAtual: string
  trilha: { noId: string; escolhaLabel: string; escolhaProximo: string; timestamp: string }[]
}

function avancar(state, opcaoEscolhida): ProtocolState   // empilha na trilha
function voltar(state): ProtocolState                     // desempilha, não recalcula nada
function reiniciar(protocoloId): ProtocolState
function progresso(state, flow): number                   // heurística: profundidade atual / profundidade média até uma conclusão
```

`voltar` funciona por pilha (a trilha é a fonte de verdade), não por recomputar o grafo —
assim o aluno pode corrigir um passo sem side effects. A UI renderiza: barra de
progresso, trilha de achados já respondidos (cada item da trilha vira uma linha
resumida), e o nó atual. Exportar sessão de protocolo = serializar `trilha` +
`nos[trilha[i].noId]` para texto — mesma função usada pelo módulo 4.

RUSH multi-perfil ("choque misto"): quando o nó de conclusão tem `diagnostico: string[]`,
a UI lista os dois perfis lado a lado, cada um com sua própria conduta — não escolhe um.

### 3.2 Motor de calculadora (`src/engine/calculator/`)

Resolve `formula` (string simbólica do `CalculatorDef`) contra os valores dos campos.
**Sem `eval`, sem `new Function`**: um parser pequeno e restrito (grammar: `+ - * / ^
( ) sqrt() pi`, operandos = ids de `campos` ou resultados de outras `ResultDef` do mesmo
calculator — permite compor DC a partir de VS que depende de Área que depende de
Diâmetro, todos definidos em `measurements.json`/`CalculatorDef`). Cada fórmula é testada
unitariamente contra o exemplo numérico do próprio ebook antes de entrar em produção —
Fase 2.

Preview de sensibilidade do TSVE (±1 mm): não é uma fórmula nova, é o motor rodando a
mesma `formula` do resultado duas vezes a mais (diâmetro+0,1 cm e diâmetro−0,1 cm) e
mostrando a variação percentual no próprio campo — lógica de UI sobre o motor existente,
não conteúdo novo.

---

## 4. Sem offline — conteúdo clínico servido sob demanda, com DRM real

**Decisão de 2026-09-08, revoga a seção original deste documento.** O conteúdo clínico
(os 9 JSONs + as imagens de `src/content/`) **deixa de ir para o bundle do cliente**.
Ele passa a viver só no servidor (as mesmas funções serverless do controle de acesso) e
é servido tela a tela, autenticado a cada requisição. Sem download completo do conteúdo
para o dispositivo, não há o que extrair de um dispositivo autorizado — essa é a
diferença entre o gate de acesso da seção 6 (decide *quem entra*) e isto (decide *o que
esse alguém consegue tirar do app*).

### O que isso muda, tecnicamente

- **`src/content/*.json` e `src/content/images/` passam a ser conteúdo só de
  servidor.** As funções em `api/` importam esses arquivos diretamente (mesmo
  mecanismo de hoje — `import windows from '../src/content/windows.json'` — só que agora
  dentro de uma Vercel Function, nunca dentro do bundle Vite). **Nenhum código do
  cliente (`src/modules/`, `src/engine/`, `src/ui/`) importa `src/content/*` direto** —
  isso é uma regra de build, não só de convenção: vou configurar o Vite para falhar o
  build se algum módulo do cliente importar algo de `src/content/*.json`
  (`vite-plugin-*` de restrição de import, ou um teste estático simples que faz `grep`
  nos bundles gerados por padrões de string do conteúdo — decido o mecanismo exato na
  Fase 1, mas o objetivo é que um erro de import vire falha de build, não um vazamento
  descoberto depois).
- **Cada módulo busca o que precisa via API, autenticado pelo token de sessão** (o mesmo
  da seção 6): `GET /api/content/windows`, `/api/content/measurements/:id`,
  `/api/content/protocols/:id`, `/api/content/images/:arquivo` (esta última serve o
  binário da imagem, também atrás do gate — nunca um link estático público). O servidor
  recusa qualquer requisição sem sessão válida, com o mesmo tratamento de prazo e
  aparelho da seção 6.
- **Cache em memória, por sessão de app aberto — nunca em disco.** Uma vez buscado
  durante aquela sessão, o conteúdo fica em memória (estado do React/um cache client-side
  em RAM) para não refazer a mesma requisição a cada troca de tela — isso preserva
  fluidez de navegação dentro de um exame em andamento. Fechar o app (ou uma
  instabilidade de rede prolongada) limpa esse cache; a próxima abertura busca de novo.
  Nada disso vai para IndexedDB, `localStorage` ou cache do service worker.
- **`vite-plugin-pwa` continua existindo, só que reduzido ao *app shell*:** o manifest
  (ícone, "adicionar à tela inicial", `display: 'standalone'`) continua — o app continua
  instalável, isso não se perde. O service worker faz precache só do HTML/CSS/JS da
  interface (código, não dado clínico) para abrir rápido; **não** faz precache de
  `src/content/*` porque esse conteúdo não existe mais no cliente para ser cacheado.
- **Resiliência a instabilidade breve de rede (não é "offline"):** dentro de uma sessão
  já autenticada, uma queda de conexão de alguns segundos/minutos (elevador, parede
  grossa de UTI) não derruba um cálculo ou passo de protocolo em andamento, porque o
  conteúdo já buscado está em memória. O que não existe mais é abrir o app do zero, ou
  navegar para uma tela nunca visitada naquela sessão, sem rede. Isso é uma troca
  deliberada: menos resiliente a uma queda de rede prolongada do que a promessa original
  de offline completo, e mais forte em garantir que só quem tem acesso válido usa o
  conteúdo — na ordem de prioridade que você definiu.
- **IndexedDB (`idb`) continua existindo, só que exclusivamente para as sessões de exame
  salvas pelo aluno** (Módulo 4 — débito cardíaco calculado, achados de protocolo,
  texto de evolução). Isso é dado gerado pelo aluno, não conteúdo do curso — nunca
  precisou estar atrás do gate de DRM, e continua funcionando por completo mesmo sem
  rede (não há razão para exigir conexão para reabrir uma sessão que o próprio aluno já
  salvou no aparelho dele).

### O que eu preciso confirmar com você antes da Fase 1

Isso é a minha recomendação, não uma pergunta em aberto do tipo "escolha você" — mas é
grande o suficiente para eu registrar o raciocínio em vez de simplesmente assumir: o
cache em memória por sessão (em vez de zero cache, buscando tudo a cada troca de tela)
é o que torna o app usável em uso clínico real, sem reabrir a porta que você acabou de
fechar (nada persiste em disco, então não há bundle offline para extrair). Se você
preferir zero cache — toda tela sempre busca de novo, mesmo dentro da mesma sessão — o
app fica mais lento (mais requisições) sem ganho real de segurança adicional; não vou
fazer isso a menos que você peça.

---

## 5. Validação de conteúdo em build time

`scripts/validate-content.mjs` já existe e valida **estrutura** (ids, enums, FKs,
campos obrigatórios, imagens em disco) — mantenho, plugo em `pretest`/`prebuild`. Isso
não substitui a validação de **tipo** pedida no spec ("valide todo JSON contra os tipos
com zod ou similar e falhe o build se faltar campo obrigatório"): vou adicionar schemas
zod espelhando `types.ts` (`WindowSchema`, `FindingSchema`, ..., `CalculatorDefSchema`,
`ProtocolFlowSchema`) e um script `scripts/validate-schema.mjs` que roda `safeParse` em
cada JSON e falha com o path exato do campo faltante — zod dá isso de graça e é mais
específico que os `if` manuais do script atual. Os dois scripts convivem: um valida
domínio (enums, FKs — conhecimento específico deste content pack), o outro valida forma
(zod, genérico, pega o que a Fase 2+ for adicionando em `calculators/` e
`protocol-flows/`).

---

## 6. Controle de acesso (curso pago — decisão de 2026-09-08, revisada duas vezes)

Histórico das três instruções, porque cada uma mudou o desenho de forma real:

1. *"como é um curso pago, quero que somente pessoas autorizadas tenham acesso, escolha
   o melhor para essa situação"* → gate de código, app continuava 100% offline depois de
   ativado (token de longa duração, renovação silenciosa).
2. *"Mais inegociável que o offline é a garantia que somente quem for autorizado a usar
   use e pelo tempo limitado que vamos definir"* → token de longa duração descartado (não
   impunha prazo real); desenhei um esquema de tolerância offline de 7 dias com
   confirmação periódica, com 3 parâmetros que você confirmou (prazo por aluno desde a
   ativação, 1 aparelho por código, tolerância de 7 dias).
3. *"Acho que podemos abrir mão do offline para termos DRM"* → **isto torna o esquema de
   tolerância de 7 dias desnecessário**, não só possível de simplificar. Se o conteúdo
   nunca fica no dispositivo (seção 4), toda requisição de conteúdo já passa pelo
   servidor — o controle de acesso não precisa mais tolerar dias sem verificar; ele
   verifica a cada requisição, em tempo real. O resultado é ao mesmo tempo **mais simples
   de implementar** e **mais forte** do que o desenho da instrução 2.

Os 3 parâmetros de produto continuam exatamente os mesmos, só a mecânica de imposição
muda:

1. **Prazo por aluno, contado a partir da ativação.**
2. **1 aparelho ativo por código**, com transferência automática ao ativar em outro.
3. ~~Tolerância offline de 7 dias~~ — **superada**: como toda tela pede conteúdo ao
   servidor, o "prazo de tolerância" agora é o tempo de vida do token de sessão (curto,
   ver abaixo), não mais uma folga deliberada para uso sem rede.

### Nota de implementação (Fase 1)

Duas correções em relação ao que este documento descrevia antes de eu efetivamente
construir o backend:

- **"Vercel KV" foi descontinuado pela própria Vercel** durante a Fase 1 (o pacote
  `@vercel/kv` está marcado deprecated no npm, recomendando migrar para Upstash Redis
  direto). Troquei para **Upstash Redis via `@upstash/redis`**, sem mudar nada do
  desenho: é o mesmo Redis gerenciado que já ficava por trás do Vercel KV, só o cliente
  mudou. `api/_lib/kv.ts` isola essa escolha atrás de uma interface `KVStore` — se o
  provedor mudar de novo, só esse arquivo muda.
- **O token de sessão virou dois tokens**, não um: um **token de acesso** (~15 min,
  Bearer de toda chamada a `/api/content/*`) e um **token de renovação** (só para
  chamar `/api/renovar`, com `exp` igual a `expiraEm` do aluno — expira sozinho no
  prazo certo, por construção da assinatura, mesmo sem consultar o KV). Isso não muda
  a garantia descrita acima, só implementa com um token curto de fato circulando nas
  chamadas de conteúdo (mais barato de verificar — só assinatura, sem round-trip) e um
  token mais longo guardado localmente só para renovar. Testado em `tests/acesso.test.ts`.

**Limitação conhecida, não resolvida nesta fase:** não há hoje um jeito de *estender*
o prazo de um aluno já ativado sem tocar direto no KV — `duracaoDias` só é usado no
momento da primeira ativação; mudar `duracaoDias` depois não recalcula `expiraEm`. Para
a Fase 7 (tela administrativa), a extensão de prazo precisa ser uma operação própria
(atualizar `expiraEm` direto), não só editar `duracaoDias`.

### Modelo de dados (Upstash Redis, via `KVStore`)

```
codigo:<código>  →  {
  duracaoDias:          number   // definido por você ao gerar o código, ex.: 180
  ativadoEm:             timestamp | null
  expiraEm:               timestamp | null   // = ativadoEm + duracaoDias, calculado na ativação
  deviceId:               string  | null      // identificador aleatório gerado pelo app, não PII
  ultimaRenovacaoEm:    timestamp | null
  revogado:               boolean             // corte manual, ex.: aluno pediu reembolso
}
```

`deviceId`: UUID aleatório gerado pelo app na primeira execução, guardado localmente —
não identifica a pessoa, só o aparelho (mantém a Regra de sessão anônima do Módulo 4).

### Fluxo

**Ativação (`POST /api/ativar { codigo, deviceId }`):**
- Código inexistente ou revogado → recusa.
- Código nunca ativado → grava `ativadoEm = agora`, `expiraEm = agora + duracaoDias`,
  `deviceId = este aparelho`.
- Já ativado neste mesmo `deviceId` → só emite sessão nova.
- Já ativado em outro `deviceId` → **transfere** (o aparelho antigo perde acesso na
  próxima vez que precisar renovar — em minutos, não em dias, ver abaixo).
- Sucesso → devolve um **token de acesso de vida curta** (proponho 15 minutos — usado
  como Bearer em toda chamada a `/api/content/*`) e um **token de renovação** (vida mais
  longa, mas sempre limitado por `expiraEm`).

**A cada requisição de conteúdo (`/api/content/windows`, `/measurements/:id`,
`/protocols/:id`, `/images/:arquivo`, etc.):** o servidor valida a assinatura e a
expiração do token de acesso. Isso é barato (verificação de assinatura, sem ler o KV) e
acontece **em toda tela**, não só na abertura do app — é isso que torna o controle de
acesso real DRM, não só um gate na porta de entrada.

**Renovação silenciosa (`POST /api/renovar`), disparada pelo app pouco antes do token de
acesso expirar, enquanto o app está em uso:**
- `deviceId` do token de renovação bate com o gravado no servidor, código não revogado,
  `agora < expiraEm` → emite um novo token de acesso de 15 minutos. Transparente para o
  aluno.
- `agora >= expiraEm` → recusa definitivamente. App mostra "seu acesso expirou em
  [data]" e trava — sem ambiguidade, sem tolerância residual.
- `deviceId` não bate (ativado em outro aparelho depois) → recusa com "este código foi
  ativado em outro aparelho".
- Revogado manualmente → mesma recusa definitiva, efetiva na próxima renovação (no
  máximo ~15 minutos depois da revogação, o tempo de vida do token de acesso ainda
  válido).
- Sem conexão no momento da renovação → o app usa o que já está em memória daquela
  sessão (seção 4) até o token de acesso expirar; passado isso, qualquer tela nova exige
  reconectar. Não é uma "folga de dias", é resiliência a uma queda breve.

### Por que não as outras opções

- **Tolerância offline de dias com confirmação periódica** — o desenho da instrução 2.
  Superado, não porque estivesse errado, mas porque deixou de ser necessário: ele
  existia para cobrir uso sem rede prolongado, que não existe mais como requisito.
  Mantê-lo teria sido uma garantia mais fraca (~7 dias de janela) sem necessidade,
  quando o cenário sem offline permite um corte de minutos.
- **Só checagem client-side, sem servidor:** nunca foi real controle de acesso, e agora
  nem faz sentido cogitar — com o conteúdo já vivendo só no servidor (seção 4), a
  autenticação por requisição é a peça que faz o DRM funcionar.
- **Auth completo (Clerk/Supabase Auth/Auth0):** continua sendo mais integração do que o
  problema pede — o modelo de código + 1 dispositivo entrega prazo real, exclusividade
  de uso e agora também DRM de conteúdo, sem pedir dado pessoal do aluno. Upgrade natural
  se o negócio precisar de contas individuais depois; o modelo de dados não fecha essa
  porta.

### O que isso garante agora, com todas as letras

- **Quem não tem código válido não entra** — sem exceção, sem período de tolerância.
- **Quem tinha acesso e teve o prazo esgotado, ou foi revogado, perde a capacidade de
  buscar qualquer conteúdo novo em até ~15 minutos** — não mais dias.
- **O conteúdo clínico nunca fica persistido no dispositivo** — nada em IndexedDB,
  `localStorage` ou cache do service worker contém `windows.json`, `measurements.json`
  etc. O que existe é o que está em memória da sessão ativa (limpo ao fechar o app).
  Extrair conteúdo do app exigiria interceptar tráfego de rede autenticado em tempo
  real, não copiar um arquivo do dispositivo — um patamar de proteção bem mais alto do
  que a v1 original tinha, e o que "abrir mão do offline para termos DRM" comprou.

### Geração e revogação de códigos — decisão delegada a mim

Você não tem preferência ("o que for melhor"). Decido: **uma tela administrativa
simples, não um script.** Motivo: agora que o projeto já envolve backend real (KV +
Functions servindo conteúdo autenticado), o custo incremental de uma tela protegida por
senha de administrador é pequeno, e quem for gerar/revogar código no dia a dia
provavelmente não é eu nem alguém confortável rodando um script — pode ser você ou
alguém da operação do curso. A tela (Fase 7, junto do deploy) faz três coisas: gerar N
códigos novos com uma `duracaoDias` definida na hora, listar códigos com status
(não ativado / ativo até [data] / expirado / revogado), e revogar um código
individualmente. Fica atrás do mesmo mecanismo de auth, com uma senha de administrador
separada dos códigos de aluno (variável de ambiente, não fica no código-fonte).

### O que isso muda na Fase 1

- Novo: `api/ativar.ts` e `api/renovar.ts` (Vercel Functions) + o KV namespace de
  códigos — junto com os endpoints de conteúdo da seção 4 (`api/content/*`), que agora
  fazem parte do mesmo backend de autenticação.
- Novo, no app: tela de bloqueio (antes do disclaimer de uso do Módulo de segurança
  clínica) e a lógica de sessão (token de acesso + renovação silenciosa) em `src/auth/`.
- Nenhuma mudança nos módulos 1–4 nem no formato do content pack: o gate e a busca de
  conteúdo ficam nas camadas de acesso (`src/auth/`) e de dados (`src/content/` do lado
  do servidor + os *hooks* de fetch do lado do cliente), não dentro da lógica dos
  módulos.
- Continuo com **Vercel** como plataforma de deploy — Functions + KV no mesmo projeto.

**Status: construído nesta fase.** `api/ativar.ts`, `api/renovar.ts`, todos os
`api/content/*.ts` (incluindo o binário de imagem), `src/auth/` e `src/queries/`
existem, com 26 testes cobrindo o fluxo de acesso (ativação, renovação, transferência
de aparelho, revogação, expiração, e a defesa em profundidade quando o KV diverge do
token). A tela administrativa de códigos (geração/revogação) fica para a Fase 7, como
planejado — por ora, códigos são criados chamando `criarCodigo()` diretamente (ver
`api/_lib/acesso.ts`), sem UI.

---

## 7. Design system (Fase 1)

Tokens Tailwind mínimos: paleta escura por padrão (`dark:` como não-padrão seria
invertido — decisão: `class="dark"` no `<html>` por padrão, toggle remove a classe),
alvo de toque 44px como altura mínima de todo componente interativo, tipografia com
`clamp()` para "legível a meio metro". Sem biblioteca de componentes — `Button`,
`NumberField` (teclado numérico, `inputMode="decimal"`, sem spinner nativo),
`Slider` (só usado em telas marcadas `modoEstudo`), `Badge` (severidade: verde/amarelo/
vermelho com texto, não só cor — acessibilidade), `Tabs` (Como medir / Armadilhas),
`SourceTag` (o selo de `fonteExterna` — um componente só, reusado em todo o app onde
`veioDeFora()` for true).

---

## 8. O que decidi sem perguntar (e por quê)

- **Roteador leve em vez de nenhum roteador**: o app tem navegação profunda o bastante
  (janela → medida → calculadora) para precisar de URLs endereçáveis, mas não precisa de
  data loaders/nested layouts pesados. `wouter` ou manual — decido no código, não muda a
  arquitetura de conteúdo.
- **`generateSW` do vite-plugin-pwa em vez de service worker manual**: menos código
  nosso para manter correto; controle fino fica disponível via `injectManifest` se algo
  não servir.
- **Zod além do `validate-content.mjs` existente**: os dois scripts fazem coisas
  diferentes (forma vs. domínio) e o spec pede explicitamente validação de tipo em build
  time — mantenho os dois em vez de reescrever um no outro.
- **`src/content/calculators/` e `src/content/protocol-flows/` como pastas novas, em vez
  de estender `measurements.json`/`protocols.json` existentes**: esses dois arquivos já
  têm dono (o content pack, regido pelo CLAUDE.md) e already-validados; prefiro não
  adicionar campos de execução de UI num arquivo que os sócios revisam como fonte
  clínica. Os arquivos novos podem *referenciar* ids de `measurements`/`protocols` (ex.:
  `comoMedir` de uma calculadora reaproveita `passosAquisicao` de uma `Measurement` por
  id) sem herdar a estrutura.

Essas são decisões de engenharia, não de conteúdo clínico — não estão em PERGUNTAS.md.

---

## 9. Ordem de execução — Fase 1 cresceu, o resto não mudou

Fase 0 (este documento) → **Fase 1 (esqueleto + backend de acesso/conteúdo + app shell
instalável + design system + validação)** → Fase 2 (calculadoras + testes) → Fase 3
(motor de protocolo + E-FAST + RUSH) → Fase 4 (BLUE completo + CASA rascunho) →
Fase 5 (Atlas + busca) → Fase 6 (sessão de exame) → Fase 7 (tela administrativa de
códigos + polimento + deploy).

A Fase 1 ficou maior do que no spec original: além do esqueleto de navegação e design
system, agora precisa entregar o backend inteiro de controle de acesso e busca de
conteúdo (seções 4 e 6) antes de qualquer módulo fazer sentido — sem isso, não há como
um módulo buscar dado nenhum para mostrar. Tratei isso como a primeira entrega da
Fase 1, antes da navegação visual. **Status: concluída.**

### Fase 2 — status: concluída

O schema de `CalculatorDef` da seção 2.1 foi refinado durante a implementação, em
relação ao esboço original deste documento:

- `avisoCondicional` (singular) virou `avisosCondicionais` (array, avaliado em ordem,
  primeiro que disparar vence) — o EPSS precisa de duas mensagens diferentes
  (valvopatia vs. prótese mitral), não uma mensagem combinada.
- `interpretacao: (valor) => {...}` do esboço original **não é serializável em JSON**
  e violaria "conteúdo é dado, não código" — virou `faixas: FaixaInterpretacao[]`, cada
  uma com `condicoes` (uma ou mais, todas em E lógico — o caso composto da VCI
  espontânea cruza diâmetro E colapsabilidade) e `textoNaoClassificado` obrigatório
  para quando nenhuma faixa bate, em vez de aproximar para a mais próxima (CLAUDE.md
  Regra 1) — testado explicitamente para EPSS (7 e 13 mm exatos), VCI mecânica
  (exatamente 18%) e Brockelsby (exatamente 3 espaços, o exemplo citado no próprio
  CLAUDE.md).
- `GateDef` separado do esboço original não existia de verdade — o gate da VCI
  mecânica é só 4 campos `booleano` com `avisosCondicionais.modo: 'algumFalso'`, mesmo
  mecanismo do EPSS (`modo: 'qualquerVerdadeiro'`). Um mecanismo só, dois usos.
- Corrigido durante os testes: o motor arredonda cada resultado a 6 casas decimais
  antes de classificar — sem isso, ruído de ponto flutuante do IEEE754 podia jogar um
  valor clinicamente exato (ex.: exatamente 18%) para o lado errado de uma fronteira
  dependendo da ordem das operações. Descoberto por um teste que falhou, não por
  inspeção — ver tests/calculators.test.ts.
- Corrigido durante os testes: um campo do formulário ainda não preenchido lançava um
  erro que ia parar numa caixa vermelha na tela, antes mesmo do aluno terminar de
  digitar. `ErroVariavelAusente` (subclasse de `ErroFormula`) agora distingue
  "formulário incompleto" (omite o resultado em silêncio) de um erro de verdade.

72 testes cobrindo as 6 calculadoras, incluindo o exemplo do ebook (TSVE 2 cm/VTI 20
cm/FC 70 → VS 62,8 mL, DC ≈ 4,4 L/min) e as 3 lacunas reais do ebook (EPSS 7/13 mm,
VCI mecânica 18%, Brockelsby 3 EIC) confirmadas como "não classificado", não
interpoladas.

### Fase 3 — status: concluída

Motor de protocolo genérico (`src/engine/protocol/`) + `ProtocolFlow` (schema da seção
2.2, sem alterações em relação ao esboço) + conteúdo executável de E-FAST e RUSH.

- `avancar`/`voltar`/`reiniciar`/`progresso` implementados exatamente como esboçado: a
  `trilha` (pilha) é a fonte de verdade de `voltar` — desempilha e devolve `noAtual`
  para o `noId` gravado, nunca recalcula o grafo. `progresso` é a heurística proposta
  (profundidade atual / profundidade média até uma conclusão, calculada por DFS sobre
  o grafo do `ProtocolFlow`, com proteção contra ciclo acidental via um `Set` de
  visitados por caminho, não global — para não subcontar ramos que voltam a passar por
  um nó compartilhado).
- **E-FAST**: as 8 janelas viram 8 nós de pergunta sequenciais (mesma ordem de
  `protocolo-efast.janelas`), cada um com Sim/Não + `indeterminadoProximo` apontando
  para a próxima janela (uma janela indeterminada não interrompe o exame). "Sim" leva a
  uma conclusão específica (líquido livre — compartilhada entre as 3 janelas
  intraperitoneais —, tamponamento, hemotórax D/E, pneumotórax D/E); 8× "Não" leva a
  "E-FAST sem achados". Todo texto de pergunta/achadosDeApoio/justificativa/cuidado é
  citação literal de `windows.json` (`oQueAvaliar`) e `protocols.json`
  (`interpretacao`/`limitacoes`/`sinaisPulmonares`) — nenhum dos dois carrega
  `fonteExterna` nesses campos, então nada precisou de selo nesta tela.
- **RUSH**: segue a ordem Pump → Tank → Pipes de `protocolo-rush.elementos`, um nó por
  achado de `oQueObservar`, cada achado positivo levando direto à conclusão de
  `tiposDeChoque` correspondente (texto/condutaInicial citados literalmente); ao final
  de Pump/Tank/Pipes sem achado, a conclusão é Distributivo (séptico) por exclusão,
  com `confianca: 'baixa'` — é diagnóstico de exclusão do próprio RUSH, o exame não
  confirma foco infeccioso sozinho. **Choque misto** (o requisito de
  `diagnostico: string[]` da seção 3.1): modelado a partir do próprio exemplo citado em
  `protocolo-rush.limitacoes` ("séptico com disfunção miocárdica") — depois de
  confirmar hipocontratilidade, uma pergunta extra sobre contexto séptico associado
  leva a uma conclusão com `diagnostico: ["Cardiogênico", "Distributivo (séptico)"]`,
  que a UI mostra lado a lado, sem escolher um.
- BLUE e CASA continuam de fora do `protocol-flows/` (Fase 4, como já previsto) — a
  tela de Protocolos já busca `protocol-flows` e só oferece exame guiado para os ids
  presentes ali; os outros dois aparecem na lista com o conteúdo descritivo existente e
  um selo "Exame guiado em breve".
- 17 testes novos (`tests/protocol.test.ts`): máquina de estados isolada de conteúdo
  (flow sintético) + validação estrutural dos dois flows reais (todo `proximo`/
  `indeterminadoProximo` aponta para nó existente) + todos os ramos de conclusão
  alcançáveis do E-FAST real + os 4 caminhos-chave do RUSH real (negativo→distributivo,
  cardiogênico isolado, cardiogênico+séptico→misto, VCI colapsada→hipovolêmico).
  91 testes no total do projeto.
- Verificação de DRM repetida com o bundle desta fase: `grep` por termos exclusivos do
  novo conteúdo (ex.: "hepatorrenal", "Cardiogênico", "lung sliding", ids dos nós) no
  `dist/assets/*.js` — zero ocorrências. `dist/sw.js` confirmado precacheando só o app
  shell, com `denylist: [/^\/api\//]` na rota de navegação.

### Fase 4 — status: concluída

BLUE completo (execução guiada) + CASA rascunho (execução guiada), fechando os 4
protocolos do Módulo 3 com o mesmo motor genérico da Fase 3 — nenhuma mudança no
`src/engine/protocol/` nem no schema de `ProtocolFlow` foi necessária.

- **BLUE**: `src/content/protocol-flows/blue.json` é a tradução direta de
  `protocolo-blue.fluxograma` (a transcrição literal da Figura 16, pág. 60) em nós
  pergunta/conclusão — raiz "DESLIZAMENTO PLEURAL" → Presente/Diminuído/Abolido, com
  todos os sub-ramos e desfechos do próprio fluxograma preservados 1:1, inclusive a
  lacuna real do ebook (Linhas A + Lung Point ausente → "Aprofundar o diagnóstico com
  outros métodos", `confianca: 'baixa'`, sem inventar um diagnóstico). Deliberadamente
  **não** usei `regrasDecisao` (fonte externa, artigo de Lichtenstein) para montar o
  grafo — CLAUDE.md e a seção 2.2 são explícitos que as duas versões divergem e devem
  conviver sem uma "corrigir" a outra; toda justificativa do flow cita o próprio
  fluxograma do ebook, então nenhum selo de fonte externa foi necessário nesta tela.
- **CASA**: `src/content/protocol-flows/casa.json` executa as 3 etapas cronometradas
  (tamponamento → embolia pulmonar → atividade cardíaca) descritas em
  `protocolo-casa.etapas`, citando `prevalencia`/`prognostico`/`conduta` literalmente —
  incluindo o "cardiac tamponade" em inglês que já estava assim no `conduta` original
  (Regra 4: transcrição, não filtrei/reescrevi um campo que já existia no content pack).
  As `etapasAncilares` (pneumotórax hipertensivo, FAST) ficaram de fora do grafo porque
  o próprio ebook as descreve como situacionais, fora da checagem de pulso cronometrada
  — não fazem parte das "3 etapas" que a seção 2.3 pediu para virarem tela navegável.
  O branch mais grave (`casa-conclusao-atividade-ausente`, ausência de atividade
  cardíaca) repete no `cuidado` a frase do próprio artigo ("a ressuscitação inicial
  deve ser tentada em todos os pacientes independentemente da atividade cardíaca
  observada") — é o ponto do protocolo com maior risco de uma conclusão isolada de
  POCUS influenciar indevidamente a decisão de suspender reanimação, e o requisito do
  spec de nunca decidir isso sozinho já estava previsto desde a Fase 0.
- **UI**: `ProtocolFlowScreen` ganhou um cronômetro de pausa (`TimerPausa`) e o selo de
  fonte externa (`SourceTag`) para o protocolo inteiro quando `Protocol.fonteExterna`
  existe — hoje só o CASA. O cronômetro é acionado por dado (`Protocol.timerSegundos`/
  `alertaRetomarCompressoes`), não por um `if (id === 'protocolo-casa')` no código —
  mesma disciplina de "conteúdo é dado" das fases anteriores. Reinicia a cada nó de
  pergunta novo (cada etapa é uma pausa de checagem de pulso independente) e, ao
  estourar o tempo, mostra "Retome as compressões agora" sem bloquear a resposta.
- `ProtocolsScreen` não precisou de nenhuma mudança de código — já buscava
  `protocol-flows` para decidir quais protocolos oferecem exame guiado, então BLUE e
  CASA passaram a aparecer como executáveis assim que os JSONs entraram no ar.
- 10 testes novos (`tests/protocol.test.ts`, 27 no arquivo, 101 no projeto): validação
  estrutural dos dois flows reais, todos os 9 desfechos do fluxograma BLUE alcançáveis
  a partir do `noInicial` (inclusive o ramo mais profundo, PRESENTE→Perfil A→Trombose
  Venosa→TEP, e a lacuna do Lung Point ausente), e os 5 desfechos do CASA — incluindo o
  teste que trava a frase de segurança clínica no branch de ausência de atividade
  cardíaca.
- DRM verificado de novo: `grep` no `dist/assets/*.js` por termos exclusivos do BLUE e
  do CASA ("DESLIZAMENTO PLEURAL", "Lung Point", "PLAPS", "pericardiocentese",
  "standstill", "cardiac tamponade", "Gardner", "Clattenburg", ids dos nós) — zero
  ocorrências. `dist/sw.js` continua com `denylist: [/^\/api\//]`.

Paro aqui para revisão antes de seguir para a Fase 5.
