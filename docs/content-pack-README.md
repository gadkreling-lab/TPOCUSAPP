# Content Pack — Ebook TPOCUS 3.0

Dados extraídos do **"Treinamento Prático em Ultrassom Point of Care" — Material de
Estudo, Terceira Edição** (96 páginas), prontos para consumo por um app React.

Todo o conteúdo vem do ebook. **Nenhum valor de corte, fórmula ou faixa de referência
foi inventado, arredondado ou atualizado** com base em literatura externa. Onde o ebook
é omisso, o campo é `null` ou um array vazio — nunca um valor plausível preenchido de
memória.

**Correções ortográficas foram aplicadas** (17 no total: typos, concordância, parênteses
desbalanceados, capitalização em referências). O log completo está em `corrections.json`,
e nas faixas de referência do EPSS o texto original do ebook ficou preservado inline.
Nenhum número foi alterado.

---

## Arquivos

| Arquivo | Itens | Conteúdo |
|---|---|---|
| `windows.json` | 25 | Janelas ecocardiográficas, pulmonares, vasculares e do E-FAST |
| `findings.json` | 40 | Achados e artefatos ultrassonográficos |
| `pathologies.json` | 8 | Tabela de perfis pulmonares (págs. 58–59) |
| `measurements.json` | 15 | Medidas quantitativas com fórmulas e valores de referência |
| `glossary.json` | 71 | Siglas e termos |
| `references.json` | 7 capítulos | Referências bibliográficas por capítulo |
| `protocols.json` | 3 | **Bônus:** BLUE, E-FAST e RUSH estruturados |
| `images.json` | 54 | Catálogo das figuras, com legenda literal e vínculo ao content pack |
| `images/` | 54 PNG | As figuras do ebook (19,6 MB) |
| `corrections.json` | 17 | Log auditável de toda correção ortográfica aplicada |
| `gaps.md` | — | Lacunas que exigem material adicional ou transcrição manual |

**Leia `gaps.md` antes de construir o app.** Ele lista o que está faltando e por quê.

⚠️ **Parte do conteúdo NÃO vem do ebook.** 21 itens foram preenchidos a partir da
literatura (perfis do BLUE, BLUE-points, técnica das 8 janelas do E-FAST, e duas
definições de achados pulmonares). **Todos carregam um campo `fonteExterna`** dizendo
exatamente quais campos vieram de fora, de qual artigo e com qual link. Veja
**“Conteúdo de fonte externa”** mais abaixo — o app deve poder distinguir as duas coisas.

---

## Convenções globais

### Rastreabilidade
Todo item carrega **`paginaEbook`** (number): a página onde o conteúdo é definido — o
âncora de rastreabilidade. Quando o assunto se espalha por várias páginas, há também
**`paginasEbook`** (array de numbers) com todas as páginas relevantes, em ordem
crescente. Use `paginaEbook` para o link "ver no ebook" e `paginasEbook` para busca.

### `null` vs. `[]` vs. string vazia
- **`null`** — o ebook **não informa** esse dado. Não renderize o campo.
- **`[]`** — o ebook não traz itens dessa categoria (ex.: nenhum erro comum listado).
- Nunca há string vazia; a ausência é sempre `null`.

> Isto é importante: `"transdutor": null` nas janelas do E-FAST significa *"o ebook não
> diz qual transdutor usar"*, e não *"não usa transdutor"*.

### `id`
Slug em kebab-case, sem acentos, estável e único dentro de cada arquivo. Use como chave
de rota e de relacionamento entre arquivos.

### Campos extras (além do schema pedido)
Alguns itens trazem campos opcionais adicionais. São todos aditivos e podem ser
ignorados com segurança:

| Campo | Onde | Para quê |
|---|---|---|
| `paginasEbook` | todos | todas as páginas do assunto |
| `notaFidelidade` | `measurements.json` | alerta sobre transcrição literal de typo/ambiguidade |
| `exemploEbook` | `measurements.json` | exemplo numérico impresso no ebook |
| `dicas` | `measurements.json` | seção "Dicas" do ebook |
| `transdutorAlternativo` | `windows.json` | quando o ebook oferece 2 opções de transdutor |
| `verTambem` | `windows.json` | id de janela relacionada |
| `observacao` | `findings.json`, `references.json` | limitação da fonte |
| `findingsRelacionados` | `pathologies.json` | ids de `findings.json` |
| `faixaOriginalEbook` | `measurements.json` | texto literal do ebook antes da correção ortográfica |
| `interpretacaoOriginalEbook` | `measurements.json` | idem, para a interpretação |

---

## `windows.json`

Janelas de aquisição de imagem.

```jsonc
{
  "id": "paraesternal-longitudinal",
  "nome": "Janela Paraesternal Longitudinal (Eixo Longo)",
  "categoria": "cardiaca",          // "cardiaca" | "pulmonar" | "vascular" | "abdominal"
  "transdutor": "setorial",         // "setorial" | "linear" | "convexo" | null
  "transdutorAlternativo": "linear (útil para análise detalhada da pleura)", // opcional
  "posicaoPaciente": "Decúbito lateral esquerdo, com o braço esquerdo atrás da cabeça...",
  "posicaoTransdutor": "Terceiro ou quarto espaço intercostal, à esquerda do esterno.",
  "marcador": "Orientado para o ombro direito do paciente, aproximadamente 10 ou 11 horas.",
  "estruturasVisualizadas": ["Ventrículo esquerdo (VE)", "..."],
  "comoOtimizar": ["..."],          // ajustes de aparelho, manobras, dicas de imagem
  "errosComuns": ["..."],           // armadilhas explicitamente citadas no ebook
  "oQueAvaliar": ["..."],           // utilidade clínica da janela
  "paginaEbook": 7,
  "paginasEbook": [6, 7, 8]
}
```

**Composição (25 janelas):**
- 6 cardíacas (págs. 5–17, 32)
- 3 pulmonares (pág. 39) — anterior-superior, lateral, PLAPS
- 8 do E-FAST (pág. 64) — **campos de técnica em `null`**, ver `gaps.md` §3
- 4 venosas (págs. 73–79)
- 4 arteriais (págs. 85–90) — aorta torácica + 3 porções da aorta abdominal

**Nota:** `efast-pericardica-subxifoide` e `subxifoide` descrevem a mesma janela
anatômica em contextos diferentes (protocolo de trauma vs. capítulo cardíaco). O item do
E-FAST aponta para o cardíaco via `verTambem`. Decida no app se quer fundi-los.

**Nota sobre transdutor pulmonar:** o ebook diz "curvilíneo ou linear (útil para análise
detalhada da pleura)". Mapeamos *curvilíneo* → `"convexo"` (valor do enum pedido) e
preservamos a alternativa em `transdutorAlternativo`.

---

## `findings.json`

Achados e artefatos.

```jsonc
{
  "id": "lung-point",
  "nome": "Ponto Pulmonar (Lung Point)",
  "modo": "B",                      // "B" | "M" | "Doppler"
  "descricao": "Achado presente no pneumotórax não maciço, que corresponde ao...",
  "significadoClinico": "Patognomônico de pneumotórax. ...100% específico...",
  "diagnosticosAssociados": ["Pneumotórax"],
  "armadilhas": ["Presente apenas no pneumotórax não maciço.", "..."],
  "paginaEbook": 45,
  "paginasEbook": [45, 46, 58, 65]
}
```

`modo` reflete o modo em que o achado é **caracterizado** no ebook. Achados que existem
em dois modos (ex.: lung point, visível em B e confirmado em M) têm o modo primário no
campo e o segundo modo descrito em `descricao`.

**Agrupamentos úteis para o app:**
- Pleura: `deslizamento-pleural`, `ausencia-deslizamento-pleural`, `sinal-da-praia`,
  `sinal-codigo-de-barras`, `lung-point`, `pulso-pulmonar`, `sinal-asa-morcego`
- Parênquima: `linhas-a`, `linhas-b`, `linhas-z`, `rabo-de-cometa`,
  `foguetes-vidro-fosco`, `hepatizacao-pulmonar`, `sinal-de-fragmentacao`, broncogramas
- Derrame: `derrame-pleural`, `sinal-do-quadrilatero`, `sinal-sinusoidal`,
  `sinal-da-coluna-vertebral`, `sinal-da-agua-viva`, `sinal-do-plancton`
- Vascular: `veia-nao-compressivel`, `visualizacao-direta-coagulo`,
  `cabeca-mickey-mouse`, `sinal-yin-yang`, `lamina-intimal-flap`, `hematoma-intramural`

---

## `pathologies.json`

Transcrição integral da tabela de perfis pulmonares das **páginas 58–59**.

```jsonc
{
  "id": "pneumotorax",
  "nome": "Pneumotórax",
  "achados": ["Sem deslizamento pulmonar/sinal de código de barras", "..."],
  "findingsRelacionados": ["ausencia-deslizamento-pleural", "lung-point", "..."],
  "paginaEbook": 58
}
```

`achados` é o **array completo** da célula direita da tabela, **linha por linha, na
ordem impressa e com a redação original** (inclusive o typo "derrame plural" da pág. 58
— ver `gaps.md` §8).

`findingsRelacionados` é um cruzamento que **nós** montamos com ids de `findings.json`,
para permitir navegação patologia → achado no app. Não é conteúdo do ebook.

As 8 patologias, na ordem da tabela: `pneumotorax`, `pneumonia`,
`edema-pulmonar-cardiogenico`, `sdra`, `dpoc-asma`, `embolia-pulmonar`, `atelectasia`,
`contusao-pulmonar`.

---

## `measurements.json`

O arquivo mais sensível do pacote. **Fidelidade absoluta aos valores.**

```jsonc
{
  "id": "tapse",
  "nome": "TAPSE — Transannular Plane Systolic Excursion",
  "janela": "apical-4-camaras",     // id de windows.json (pode ser composto: "a + b")
  "modo": "M",                      // "B" | "M" | "Doppler"
  "passosAquisicao": ["Obtenha a janela apical de quatro câmaras.", "..."],
  "formula": null,                  // string ou null quando é medida direta
  "unidades": "mm",
  "referencias": [
    { "faixa": "<17 mm", "interpretacao": "Disfunção" }
  ],
  "armadilhas": ["..."],
  "prerequisitos": ["..."],         // condições para a medida ser válida
  "paginaEbook": 30
}
```

**Regras aplicadas:**
- `faixa` reproduz o texto do ebook **caractere a caractere**, incluindo o símbolo
  (`<`, `>`, `≥`), a vírgula decimal brasileira e a unidade quando impressa junto.
- Onde há typo no original, o valor é mantido e sinalizado em `notaFidelidade`.
  Exemplo: EPSS traz `">7 and <13 mm"` — o "and" está no ebook.
- `formula` é `null` para medidas diretas (EPSS, MAPSE, TAPSE, diâmetros).
- `janela` com `" + "` indica medida que exige duas janelas (débito cardíaco).

**As 15 medidas:** `epss`, `mapse`, `tapse`, `tsve-diametro`, `tsve-area`, `vti-tsve`,
`volume-sistolico`, `debito-cardiaco`, `vci-diametro`, `vci-indice-colapsabilidade`,
`vci-indice-distensibilidade`, `formula-balik`, `metodo-brockelsby`, `aorta-diametro`,
`espessamento-parede-aortica`.

⚠️ **`vci-indice-distensibilidade`**: os 4 `prerequisitos` (pág. 34) são condições de
validade, não sugestões. O ebook é explícito: *"Se qualquer um desses critérios falhar,
a variação da cava pode não refletir a pré-carga real."* Sugiro renderizá-los como
gate antes de mostrar o resultado.

⚠️ **`metodo-brockelsby`**: o ebook classifica 1, 2 e ">3" espaços intercostais.
**Exatamente 3 não tem classificação.** Ver `gaps.md` §8.

---

## `glossary.json`

```jsonc
{
  "id": "tapse",
  "sigla": "TAPSE",                 // "—" quando o termo não tem sigla
  "termo": "Transannular Plane Systolic Excursion",
  "definicao": "Avalia o movimento longitudinal do plano lateral do anel da tricúspide...",
  "categoria": "medida",            // "geral"|"cardiaca"|"pulmonar"|"vascular"|"medida"|"protocolo"
  "paginaEbook": 29
}
```

Inclui siglas do corpo do texto **e** abreviaturas que aparecem só em legendas de
figuras (`CFA`, `CFV`, `PLEF`, `TL`/`FL`, `LCCA`/`LSCL`, `IMH`) — úteis se você
embarcar as imagens.

⚠️ **`VS` é ambíguo no ebook:** Volume Sistólico (págs. 27-28) e Veia Safena (pág. 78).
Estão em entradas separadas (`vs` e `veia-safena`), ambas sinalizando a ambiguidade.
Desambigue por capítulo no app.

---

## `references.json`

Agrupado por capítulo, na ordem do ebook.

```jsonc
{
  "capitulo": "Ultrassom Pulmonar",
  "capituloId": "ultrassom-pulmonar",
  "paginaEbook": 61,
  "paginasEbook": [61, 62],         // quando a lista ocupa mais de uma página
  "referencias": [
    {
      "ordem": 1,                   // número impresso, ou null se a lista não é numerada
      "citacao": "Lichtenstein DA. BLUE-protocol and FALLS-protocol: ...",
      "doi": "10.1378/chest.14-1313",   // opcional
      "url": "https://..."              // opcional
    }
  ]
}
```

`citacao` é a referência completa como impressa. `doi` e `url` foram **extraídos** dessa
mesma string para facilitar links clicáveis — não são dados novos. Quando o ebook
imprime o DOI com o prefixo `https://doi.org/`, o campo `doi` guarda só o identificador.

Os 7 capítulos: `janelas-cardiacas` (pág. 18), `medidas-basicas` (pág. 35),
`ultrassom-pulmonar` (págs. 61–62), `protocolo-efast` (**sem referências**),
`protocolo-rush` (pág. 69), `ultrassom-vascular` (pág. 95), `material-complementar`
(pág. 96).

---

## `protocols.json` (bônus)

Não estava na lista pedida, mas o conteúdo dos protocolos ficaria órfão nos outros
arquivos.

- **`protocolo-blue`** — contém `fluxograma`, com a árvore de decisão da **Figura 16
  (pág. 60) transcrita literalmente dos rótulos da figura**. O campo
  `fluxograma.origemDados` registra isso. O campo `lacunas` avisa que os "Perfis A/B/C"
  citados nos nós **não são definidos em lugar nenhum do ebook** — ver `gaps.md` §1.
- **`protocolo-efast`** — vantagens, limitações, interpretação, sinais pulmonares e
  `janelas` (array de ids de `windows.json`).
- **`protocolo-rush`** — `elementos` (Pump/Tank/Pipes, com janelas e o que observar) e
  `tiposDeChoque` (tabela da pág. 68: achados + conduta inicial).

---

## Relacionamentos entre arquivos

```
pathologies.findingsRelacionados[]  ──→  findings.id
measurements.janela                 ──→  windows.id   (pode ser "id-a + id-b")
protocols.efast.janelas[]           ──→  windows.id
protocols.blue.fluxograma           ──→  (rótulos livres, sem ids)
windows.verTambem[]                 ──→  windows.id
```

Não há chave estrangeira de `findings` para `windows`: o ebook descreve os achados por
região (pleura, parênquima), não por janela específica.

---

## Como carregar

```js
import windows      from './content/windows.json'
import findings     from './content/findings.json'
import pathologies  from './content/pathologies.json'
import measurements from './content/measurements.json'
import glossary     from './content/glossary.json'
import references   from './content/references.json'
import protocols    from './content/protocols.json'

const byId = arr => Object.fromEntries(arr.map(x => [x.id, x]))
const findingsById = byId(findings)
const windowsById  = byId(windows)

// patologia → achados relacionados
const achadosDe = pat =>
  (pat.findingsRelacionados ?? []).map(id => findingsById[id]).filter(Boolean)

// medida → janela de aquisição (trata medidas de janela composta)
const janelasDe = m =>
  String(m.janela).split('+').map(s => windowsById[s.trim()]).filter(Boolean)
```

Todos os arquivos são arrays JSON no nível raiz, UTF-8, sem BOM.

---

## Aviso de uso clínico

Este pacote é **material didático transcrito**, destinado ao app do curso. Não substitui
o ebook original, a supervisão do curso nem o julgamento clínico. Como o próprio ebook
afirma (pág. 17):

> *"O POCUS deve ser interpretado em associação com a história clínica e o exame
> físico, contribuindo para um manejo apropriado, rápido e certeiro."*

O ebook traz na capa: **PROIBIDOS COMERCIALIZAÇÃO E COMPARTILHAMENTO**.


---

## `images.json` + pasta `images/`

As **54 figuras** do ebook, catalogadas e vinculadas ao restante do content pack.

```jsonc
{
  "id": "p046-01",
  "arquivo": "fig-p046-01.png",   // dentro de images/
  "paginaEbook": 46,
  "figuraNumero": 6,              // número impresso no ebook, ou null
  "legendaEbook": "Figura 6 - US pulmonar no modo B no corte longitudinal...",
  "secaoEbook": "Ultrassom Pulmonar — Pneumotórax",
  "categoria": "pulmonar",        // "cardiaca"|"pulmonar"|"vascular"|"medida"|"protocolo"
  "largura": 1341, "altura": 1002, "bytes": 512345,
  "windowIds": [], "findingIds": ["lung-point","sinal-codigo-de-barras"],
  "measurementIds": [], "pathologyIds": ["pneumotorax"], "protocolIds": []
}
```

**Como foram geradas.** As figuras foram **renderizadas a partir da página** a 200 DPI e
recortadas pela bounding box da imagem, **não** extraídas como raster puro. Isso importa:
o ebook desenha setas, asteriscos, letras (A/B) e rótulos *por cima* das imagens de
ultrassom — extrair só o raster embutido perderia todas essas marcações, que são
justamente o que ensina. Bordas uniformes foram aparadas e 5 elementos decorativos
(logo de capa, triângulos de aviso, banner) foram descartados.

**`legendaEbook` é `null` em 16 figuras** — são as que o ebook publica sem legenda
(traçados de modo M das medidas, diagramas do E-FAST e dos pontos de compressão venosa).
Para essas, use `secaoEbook`, que é o título da seção onde a figura aparece. Nenhuma
legenda foi escrita por nós.

**Cobertura dos vínculos:** 23/25 janelas, 30/41 achados, 13/15 medidas, 3/8 patologias
e 2/3 protocolos têm ao menos uma figura. Os vínculos são um cruzamento nosso, não
conteúdo do ebook.

```js
import images from './content/images.json'
const imagensDe = (tipo, id) => images.filter(im => (im[tipo] ?? []).includes(id))
// imagensDe('findingIds', 'lung-point') -> [{...fig-p046-01...}]
```

---

## `corrections.json`

Log auditável de toda correção ortográfica aplicada ao content pack.

```jsonc
{
  "arquivo": "measurements.json",
  "itemId": "epss",
  "campo": "referencias[1].faixa",
  "original": ">7 and <13 mm",
  "corrigido": ">7 e <13 mm",
  "paginaEbook": 23,
  "tipo": "idioma"   // ortografia|gramática|concordância|idioma|parêntese|
                     // referência|capitalização|codificação|nome próprio|padronização
}
```

Serve para dois propósitos: provar que **nenhum valor numérico foi tocado**, e permitir
reverter qualquer correção que você discorde. As correções em texto de valor clínico
(as faixas do EPSS) também ficaram preservadas inline via `faixaOriginalEbook`.


---

## Conteúdo de fonte externa (`fonteExterna`)

O ebook é omisso em alguns pontos centrais. Esses pontos foram preenchidos a partir da
literatura, **sempre marcados**, nunca silenciosamente. Todo item preenchido carrega um
campo `fonteExterna` (ou `<campo>FonteExterna`, quando só uma parte do item veio de fora):

```jsonc
"fonteExterna": {
  "referencia": "Rowland-Fisher A, Reardon RF. FAST. Sonoguide. ACEP; 2021.",
  "url": "https://www.acep.org/sonoguide/basic/fast",
  "acesso": "livre",
  "campos": ["transdutor","posicaoPaciente","posicaoTransdutorDetalhada","marcador","profundidade"],
  "nota": "Estes campos NÃO constam do Ebook TPOCUS 3.0 (págs. 63-65)...",
  "referenciaComplementar": { ... },        // opcional
  "citacoesOriginais": ["..."]              // opcional: a frase literal da fonte
}
```

**Regra para o app:** se um item tem `fonteExterna`, os campos listados em
`fonteExterna.campos` **não são do ebook**. Sugestão de UI: marcar esses trechos com um
selo discreto (“fora do ebook — Lichtenstein 2014”) e linkar `url`.

```js
const veioDeFora = (item, campo) =>
  (item.fonteExterna?.campos ?? []).some(c => c.split(' ')[0] === campo)
```

### Inventário completo (21 itens)

| Onde | Itens | O que foi preenchido | Fonte |
|---|---|---|---|
| `protocols.json` | `protocolo-blue` | `perfis` (7), `pontosBlue` (3), `regrasDecisao` (5) | Lichtenstein, Ann Intensive Care 2014 (+ Crit Ultrasound J 2011 para os pontos) |
| `windows.json` | 8 janelas `efast-*` | `transdutor`, `posicaoPaciente`, `posicaoTransdutorDetalhada`, `marcador`, `profundidade` | ACEP Sonoguide FAST e Lung (+ StatPearls) |
| `findings.json` | `consolidacao-subpleural` | `descricao`, `significadoClinico`, `armadilhas`, `diagnosticosAssociados` | Volpicelli ICM 2012 (+ Demi JUM 2023, Lichtenstein 2014, Gargani 2014) |
| `findings.json` | `foguetes-vidro-fosco` | `nome`, `descricao`, `significadoClinico`, `armadilhas`, `diagnosticosAssociados` | Lichtenstein 2014 (+ Ann Thorac Med 2014) |
| `findings.json` | `sinal-da-praia` | `significadoClinico` | **Autor do curso** (`tipo: "autor"`) |
| `glossary.json` | 9 entradas de perfis | `definicao` | Lichtenstein 2014 |

### O que continua sendo 100% do ebook

- **Todos os valores numéricos** de `measurements.json` — nenhuma faixa, fórmula ou
  ponto de corte veio de fora. Verificado por script contra o PDF.
- `protocols.json` → `protocolo-blue.fluxograma` — segue sendo a transcrição literal
  dos rótulos da Figura 16 (pág. 60), **não** o algoritmo do artigo. Os dois convivem:
  `fluxograma` é a versão do ebook, `regrasDecisao` é a do Lichtenstein.
- `pathologies.json` inteiro (tabela das págs. 58-59).
- `references.json`, `images.json` (legendas literais).

### Estruturas novas em `protocols.json` → `protocolo-blue`

```jsonc
"perfis": [ { "id": "perfil-b", "nome": "Perfil B",
              "definicao": "Deslizamento pleural anterior presente associado a foguetes pulmonares...",
              "citacaoOriginal": "The B-profile associates anterior lung-sliding with lung-rockets.",
              "significado": "Sugere edema pulmonar hemodinâmico agudo, com 97% de sensibilidade..." } ],
"pontosBlue": { "tecnica": "...", "citacaoOriginal": "...",
                "pontos": [ { "id": "upper-blue-point", "nome": "...",
                              "localizacao": "...", "detalheComplementar": "..." } ] },
"regrasDecisao": [ { "perfil": "...", "diagnostico": "...", "citacaoOriginal": "..." } ]
```

`citacaoOriginal` guarda a frase em inglês exatamente como publicada — use-a se quiser
mostrar a fonte primária ao usuário.

### Nota sobre os foguetes em vidro fosco

A literatura **confirma** a redação do ebook (“confluência de linhas B”): foguetes em
vidro fosco são as linhas B mais numerosas e próximas entre si, correspondendo a áreas
de vidro fosco na TC; os foguetes septais são menos numerosos e correspondem a septos
interlobulares espessados. **Mas** as distâncias de 7 mm e 3 mm, muito citadas em
revisões, **não** estão no artigo de Lichtenstein de 2014 — ele define os dois padrões
pelo *número* de linhas, não por milímetros — e essas medidas são contestadas na
literatura. Isso está registrado em `armadilhas`.

### Achado removido

`sinal-da-gaivota` foi **excluído** de `findings.json` a pedido do autor. A figura da
pág. 88 (`fig-p088-01`) continua no pacote, vinculada à janela `aorta-abdominal-proximal`,
e sua legenda literal ainda menciona o sinal.
