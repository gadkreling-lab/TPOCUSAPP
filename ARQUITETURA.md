# ARQUITETURA.md — App TPOCUS

Fase 0. Decisões técnicas antes de escrever qualquer componente. Este documento não
descreve UI — descreve como o conteúdo clínico entra no app, como os quatro módulos
compartilham motores genéricos, e o que precisa existir para o offline funcionar de
verdade.

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
├── api/
│   ├── ativar.ts                  # NOVO, Fase 1 — Vercel Edge Function, ver seção 6
│   └── confirmar.ts               # NOVO, Fase 1 — Vercel Edge Function, ver seção 6
├── public/
│   ├── manifest.webmanifest
│   └── icons/
├── src/
│   ├── content/                   # DADO — já existe, ver seção 2
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
│   ├── modules/
│   │   ├── atlas/                 # módulo 1
│   │   ├── calculators/           # módulo 2 (UI sobre o engine/calculator)
│   │   ├── protocols/             # módulo 3 (UI sobre o engine/protocol)
│   │   └── session/                # módulo 4
│   ├── storage/                   # IndexedDB (idb) — sessões salvas
│   ├── auth/                      # NOVO, Fase 1 — token de acesso local, ver seção 6
│   ├── ui/                        # design system: Button, NumberField, Badge, Tabs...
│   ├── app/                       # rotas, layout, providers, disclaimer gate
│   └── sw/                        # service worker (ou vite-plugin-pwa config)
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

## 4. PWA offline — como isso fica 100% funcional

Decisão: **`vite-plugin-pwa`**, modo `injectManifest` só se o Workbox padrão
(`generateSW`) não cobrir algum caso; começo por `generateSW`, que já resolve:

- Precache de todo o build (JS/CSS/HTML) + `src/content/images/*.webp` (2,8 MB — cabe
  tranquilamente no precache; nada de cache sob demanda para essas imagens, porque a
  primeira vez que o aluno abre uma janela em plantão precisa funcionar mesmo sem ter
  visitado aquela tela antes).
- `registerType: 'autoUpdate'` com um toast discreto "nova versão disponível" — não forço
  reload no meio de um exame.
- Manifest com ícones (192/512, maskable), `display: 'standalone'`, `theme_color` escuro
  (modo escuro é o padrão do produto).
- Teste de aceitação da Fase 1: build, `vite preview`, DevTools → Offline, navegar pelos
  4 módulos e abrir uma calculadora sem erro de rede.

IndexedDB (`idb`) fica isolado do content pack: sessões salvas (`db: tpocus-sessoes`,
store `sessoes`, chave `id` uuid) nunca tocam `src/content/*.json`, que é somente-leitura
em runtime.

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

## 6. Controle de acesso (curso pago — decisão de 2026-09-08, revisada em seguida)

Adicionado depois da Fase 0 original. Primeira instrução: *"como é um curso pago, quero
que somente pessoas autorizadas tenham acesso, escolha o melhor para essa situação."*
Segunda instrução, que **substitui a ordem de prioridade** da primeira versão deste
desenho: *"Mais inegociável que o offline é a garantia que somente quem for autorizado a
usar use e pelo tempo limitado que vamos definir."*

Isso muda o desenho de forma real, não cosmética. A primeira versão deste documento
tratava o acesso como uma camada fina na frente de um app que continuava 100% offline
por padrão (token que renova sozinho enquanto online, nunca bloqueia se a rede falhar).
Isso não dá a garantia que você pediu agora: um token que "renova pra sempre enquanto
online" não impõe prazo nenhum, e um app que "nunca bloqueia offline" não consegue negar
acesso a alguém cujo prazo terminou mas que simplesmente nunca mais abriu o app perto de
um wi-fi. Com acesso > offline na ordem de prioridade, o desenho abaixo aceita que o app
**pode, em situações específicas e limitadas, exigir rede para continuar funcionando** —
o que antes eu tinha descartado.

Três decisões de produto que você confirmou (recomendações que eu havia proposto):

1. **Prazo por aluno, contado a partir da ativação** (não por turma com data fixa nem
   um híbrido) — cada código, ao ser ativado pela primeira vez, define seu próprio prazo
   individual.
2. **Tolerância offline de 7 dias** — o app funciona sem rede por até 7 dias seguidos
   sem confirmar que o acesso continua válido; passado isso, exige reconectar antes de
   continuar.
3. **1 aparelho ativo por código** — ativar em um aparelho novo desloga o anterior (o
   aparelho antigo perde acesso na próxima vez que tentar confirmar, dentro do prazo de
   tolerância de 7 dias).

### Isso deixa de ser "sem backend" — e está certo que seja

Guardar "quando este código foi ativado", "em qual aparelho" e "quando foi confirmado
pela última vez" é **estado que muda**, não configuração estática — não dá para
resolver com uma lista de códigos válidos somente leitura (Edge Config), que era
suficiente na primeira versão. Isso exige um banco de chave-valor com escrita barata e
frequente: **Vercel KV** (Redis gerenciado, nativo da mesma plataforma de deploy,
sem servidor para você operar). Ainda não é "um servidor" no sentido que o spec original
queria evitar — não há processo rodando, não há infraestrutura para atualizar ou
monitorar — mas é, com todas as letras, mais backend do que "zero". Registro isso aqui
com destaque porque é a mudança mais significativa em relação ao spec original desde a
Fase 0, e decorre diretamente da sua segunda instrução.

### Modelo de dados (Vercel KV)

```
codigo:<código>  →  {
  duracaoDias:          number   // definido por você ao gerar o código, ex.: 180
  ativadoEm:             timestamp | null
  expiraEm:               timestamp | null   // = ativadoEm + duracaoDias, calculado na ativação
  deviceId:               string  | null      // identificador aleatório gerado pelo app, não PII
  ultimaConfirmacaoEm:  timestamp | null
  revogado:               boolean             // corte manual, ex.: aluno pediu reembolso
}
```

`deviceId` é um UUID aleatório gerado pelo app na primeira execução e guardado no
IndexedDB — não identifica a pessoa, só o aparelho, e não é pedido ao aluno (mantém a
Regra de sessão anônima do Módulo 4: nenhum nome completo, e-mail ou dado pessoal entra
nesse fluxo).

### Fluxo

**Ativação (primeira vez, precisa de rede):**
1. Tela de bloqueio pede o código de acesso.
2. App gera (ou recupera, se já existir) seu `deviceId` local e chama
   `POST /api/ativar { codigo, deviceId }`.
3. Servidor:
   - Código inexistente ou revogado → recusa, mensagem clara.
   - Código nunca ativado → grava `ativadoEm = agora`, `expiraEm = agora + duracaoDias`,
     `deviceId = este aparelho`; devolve token assinado.
   - Código já ativado **neste mesmo `deviceId`** (reinstalação no mesmo aparelho) →
     apenas devolve um token novo, sem mexer em `ativadoEm`/`expiraEm`.
   - Código já ativado **em outro `deviceId`** → **transfere**: atualiza `deviceId` para
     este aparelho (o antigo perde acesso na próxima confirmação dele) e devolve token
     novo. Não há necessidade de ação manual sua para "aluno trocou de celular" — o
     efeito colateral é que o aparelho antigo é deslogado, o que é o comportamento
     pedido.
4. Token: assinado (HMAC, segredo só no servidor), carrega `deviceId` e
   `exp = mínimo(agora + 7 dias, expiraEm)`. Guardado no IndexedDB.

**Toda abertura do app depois disso:**
- Token ainda válido (assinatura ok, `exp` no futuro) → app abre offline, sem rede
  nenhuma. Isso é o que preserva a experiência de plantão com wi-fi ruim dentro da
  janela de 7 dias.
- Token expirado (passou o `exp`, seja porque bateu os 7 dias sem confirmar, seja porque
  `expiraEm` do aluno chegou) → app **exige rede** e chama
  `POST /api/confirmar { token }`:
  - `deviceId` do token bate com o gravado no servidor, código não revogado, e
    `agora < expiraEm` → grava `ultimaConfirmacaoEm = agora`, devolve token novo com
    `exp = mínimo(agora + 7 dias, expiraEm)`. App volta a funcionar offline por mais um
    ciclo de até 7 dias.
  - `agora >= expiraEm` → recusa definitivamente. Tela mostra "seu acesso expirou em
    [data]", sem ambiguidade — este é o corte que garante o prazo.
  - `deviceId` não bate (foi ativado em outro aparelho depois) → recusa com mensagem
    distinta: "este código foi ativado em outro aparelho".
  - Sem conexão nenhuma no momento da confirmação → app informa "verifique sua conexão
    para continuar" e tenta de novo quando a rede voltar; **não apaga nada localmente**,
    só bloqueia a tela até confirmar — evita que uma falha de rede destrua a sessão de
    um aluno em pleno plantão, mas também não deixa o app abrir sem confirmar.

Note o efeito prático da janela de 7 dias: um aluno em uma sequência de plantões sem
wi-fi continua com acesso pleno; um código revogado ou expirado para de funcionar em no
máximo 7 dias mesmo que o aparelho nunca mais veja rede alguma depois disso — a garantia
que você pediu tem um limite temporal claro e conhecido (7 dias), não é "condicional a
o aluno ficar online".

### Por que não as outras opções

- **Token de longa duração, renovação silenciosa "para sempre" enquanto online** — a
  versão anterior deste desenho. Descartada: não impõe prazo real, e um token que nunca
  bloqueia offline não corta acesso de quem simplesmente parou de reconectar. Não
  atende a nova prioridade.
- **Só checagem client-side (código comparado a um hash embutido no bundle), sem
  servidor:** mantém "zero backend" literal, mas não é controle de acesso real —
  qualquer pessoa com acesso ao bundle JS extrai ou contorna a checagem, e não há como
  impor prazo nem limite de aparelho sem estado do lado do servidor. Não atende a nova
  prioridade de jeito nenhum.
- **Auth completo (Clerk/Supabase Auth/Auth0, conta por aluno, login com senha):**
  resolveria tudo isso e mais (recuperação de conta, múltiplos e-mails), mas é mais
  integração e mais fricção de onboarding do que o problema pede — o modelo de código +
  1 dispositivo já entrega prazo real e exclusividade de uso sem pedir dado pessoal
  nenhum do aluno. Fica como upgrade natural se o negócio precisar de contas
  individuais mais tarde; o modelo de dados acima não fecha essa porta.

### Limitação que continua valendo, com o desenho atualizado

**Isso ainda não é DRM de conteúdo**, mesmo com a garantia de acesso mais forte: dentro
da janela de até 7 dias offline, o conteúdo clínico já baixado (JSONs + imagens)
continua no dispositivo, e alguém tecnicamente capaz consegue extraí-lo enquanto o
acesso estiver ativo — do mesmo jeito que conseguiria com o PDF do ebook. O que este
desenho garante com solidez é o que você pediu: **quem não tem código válido não entra,
e quem tinha para de conseguir usar o app em até 7 dias após o prazo acabar ou o código
ser revogado.** Isso é diferente de impedir a extração do conteúdo por alguém já
autorizado e disposto a inspecionar o app — essa segunda garantia exigiria abrir mão do
offline por completo (conteúdo nunca baixado, servido sob demanda a cada tela), o que
você não pediu e que reintroduziria exatamente o problema que a exigência de offline
resolve (app inútil em UTI com wi-fi ruim). Avise se isso muda a decisão.

### O que isso muda na Fase 1

- Novo: `api/ativar.ts` e `api/confirmar.ts` (Vercel Edge Functions) + o KV namespace de
  códigos.
- Novo, no app: tela de bloqueio (antes do disclaimer de uso do Módulo de segurança
  clínica — o gate de acesso vem primeiro, o disclaimer clínico vem depois, no primeiro
  uso já autenticado) e a lógica de token/deviceId/confirmação em `src/auth/`.
- Novo, operacional (fora do app, mas necessário para o lançamento): uma forma de você
  gerar códigos em lote com `duracaoDias` definido por você, e revogar um código
  individualmente (suporte a "aluno pediu reembolso" / "perdeu o celular"). Planejo isso
  como um script simples contra a API do Vercel KV, não um painel — decido o formato
  exato na Fase 1, mas avise se preferir uma tela administrativa em vez de script.
- Nenhuma mudança nos módulos 1–4 nem no content pack: o gate é uma camada antes da
  navegação principal (tab bar), não dentro dela.
- Continuo com **Vercel** como plataforma de deploy (Fase 7) — Edge Functions + KV ficam
  no mesmo projeto, sem infraestrutura extra para operar.

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

## 9. Ordem de execução — sem mudança em relação ao spec

Fase 0 (este documento) → Fase 1 (esqueleto + PWA + design system + validação) →
Fase 2 (calculadoras + testes) → Fase 3 (motor de protocolo + E-FAST + RUSH) →
Fase 4 (BLUE completo + CASA rascunho) → Fase 5 (Atlas + busca) → Fase 6 (sessão de
exame) → Fase 7 (polimento + deploy).

Paro aqui para revisão antes de tocar em código (Fase 1).
