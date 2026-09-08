# gaps.md — Lacunas do Ebook TPOCUS 3.0

Este arquivo lista tudo que **não pôde ser extraído com fidelidade** do texto do ebook.
Nada aqui foi preenchido de memória. Cada item indica exatamente o que precisa ser
transcrito manualmente ou qual material adicional resolveria a lacuna.

**Legenda de prioridade**
- 🔴 **Bloqueia funcionalidade do app** — o conteúdo é central e está ausente.
- 🟡 **Empobrece o conteúdo** — o app funciona, mas o item ficará raso.
- 🔵 **Inconsistência/typo do ebook** — decisão editorial sua, não falta de dado.

---

## 🔴 1. Definição dos "Perfis" do Protocolo BLUE (Figura 16, pág. 60)

**Status do fluxograma:** ✅ **transcrito**. A Figura 16 estava legível na renderização
da página e seus rótulos foram transcritos literalmente em `protocols.json` →
`protocolo-blue.fluxograma`. Nenhum ramo foi inferido.

**O que falta:** o fluxograma usa os rótulos **"Perfil A"**, **"Perfil B"** e
**"Perfil A/B ou C"** — e o ebook **não define em nenhum ponto do texto** o que
caracteriza cada perfil. Um usuário do app que tocar em "Perfil A" não terá o que ler.

Também não aparecem no ebook os perfis clássicos do BLUE-protocol (A', B', C, etc.),
nem a definição operacional de "PLAPS positivo" usada como nó de decisão.

> ✅ **RESOLVIDO — artigo localizado e verificado:**
> **Lichtenstein DA. Lung ultrasound in the critically ill. Ann Intensive Care. 2014;4(1):1.**
> https://link.springer.com/article/10.1186/2110-5820-4-1 — acesso livre (gold OA).
> Contém as definições literais: A-profile = lung sliding + linhas A; A' = A-profile com
> sliding abolido; B = sliding + lung rockets; B' = B-profile com sliding abolido;
> A/B = meio A num pulmão e meio B no outro; C = consolidação anterior; PLAPS.
> ⚠️ O Chest 2015 citado na bibliografia do ebook (ref. 1, pág. 61) é **pago**, sem versão
> livre legítima. O Chest 2008 está livre no PMC (PMC3734893) mas não traz os BLUE points.
>
> ✅ **PREENCHIDO.** `protocols.json` → `protocolo-blue` ganhou `perfis` (7, com a frase
> literal em inglês em `citacaoOriginal`), `pontosBlue` (3 pontos + técnica das duas mãos)
> e `regrasDecisao` (5), todos marcados com fonte externa. O `fluxograma` continua sendo a
> transcrição literal da Figura 16 do ebook — as duas versões convivem no mesmo item.
> Os perfis também entraram em `glossary.json` (9 entradas novas).

---

## 🔴 2. Pontos anatômicos do BLUE (Figura 1, pág. 39)

O texto descreve apenas três pontos genéricos:
- Anterior – superior bilateral
- Lateral bilateral
- Posterior – inferior bilateral (PLAPS-point – ponto frêmito/diafragmático)

A Figura 1 é uma **fotografia** mostrando a técnica das duas mãos (BLUE hands) sobre o
tórax, com os pontos marcados em vermelho. **Não há texto na figura** — portanto os
marcos anatômicos precisos (onde exatamente ficam o *upper BLUE point*, o *lower BLUE
point* e o *PLAPS point* em relação às mãos, clavícula e linha axilar posterior)
**não são recuperáveis do PDF**.

Consequência: em `windows.json`, os três pontos pulmonares têm `posicaoTransdutor`
descrevendo apenas a orientação do transdutor (longitudinal, plano sagital), sem o
marco anatômico de cada ponto.

> ✅ **PREENCHIDO — mesmo artigo do item 1** (Lichtenstein, Ann Intensive Care 2014):
> *"Two hands placed this way (size equivalent to the patient's hands, upper hand touching
> the clavicle, thumbs excluded) correspond to the location of the lung. The upper-BLUE-point
> is at the middle of the upper hand. The lower-BLUE-point is at the middle of the lower palm.
> The PLAPS-point is defined by the intersection of: a horizontal line at the level of the
> lower BLUE-point; a vertical line at the posterior axillary line."*
>
> Complemento dedicado só à anatomia dos pontos (2 páginas, acesso livre), ideal como fonte
> para a legenda da Figura 1 da pág. 39:
> **Lichtenstein & Mezière. The BLUE-points. Crit Ultrasound J. 2011;3:109-110.**
> https://theultrasoundjournal.springeropen.com/articles/10.1007/s13089-011-0066-3

---

## 🟡 3. Janelas do E-FAST sem técnica de aquisição (págs. 63–65)

O ebook **lista as 8 janelas** do E-FAST, mas não descreve, para nenhuma delas:
- posição do paciente
- posição do transdutor (além da linha anatômica, nas 4 torácicas)
- orientação do marcador
- transdutor recomendado

Em `windows.json`, esses campos estão como `null` nos 8 itens `efast-*` — `null`
significa **"não especificado no ebook"**, nunca um valor inventado.

> ✅ **RESOLVIDO — fonte localizada e verificada: ACEP Sonoguide**, única fonte livre que
> especifica a **orientação do marcador em todas as janelas**:
> https://www.acep.org/sonoguide/basic/fast — janelas abdominais e pericárdica
> https://www.acep.org/sonoguide/basic/lung — janelas torácicas, lung point, modo M
>
> Para a bibliografia formal (indexado no PubMed):
> **Bloom BA, Gibbons RC. Focused Assessment With Sonography for Trauma. StatPearls; 2023.**
> https://www.ncbi.nlm.nih.gov/books/NBK470479/
> Revisão aberta mais atual: **Bella FM et al. J Clin Med. 2025;14(10):3457** —
> https://www.mdpi.com/2077-0383/14/10/3457 (fraca em técnica de aquisição).
>
> ✅ **PREENCHIDO.** As 8 janelas `efast-*` agora têm `transdutor`, `posicaoPaciente`,
> `posicaoTransdutorDetalhada`, `marcador` e `profundidade`, todos marcados com
> `fonteExterna`. O campo `posicaoTransdutor` **preserva a redação do ebook**; a técnica
> externa vai em `posicaoTransdutorDetalhada`, para as duas origens não se misturarem.

---

## 🟡 4. Capítulo E-FAST sem referências bibliográficas

Diferentemente dos demais capítulos, o E-FAST (págs. 63–65) não traz lista de
referências. Em `references.json` o capítulo aparece com `referencias: []` e uma nota.

Há também no texto da pág. 65 um cabeçalho órfão — **"7. Sinais Ultrassonográficos
Pulmonares"** — numeração que não corresponde a nenhuma outra seção do capítulo,
sugerindo que o texto foi adaptado de outra fonte não citada.

> **Material que preciso:** as referências do capítulo E-FAST, se existirem.

---

## 🟡 5. Estatísticas do E-FAST sem fonte

A pág. 65 afirma "sensibilidade de 85% e especificidade de até 96%" atribuindo a
"Estudos", sem citar qual. O mesmo vale para "aproximadamente 3 minutos" (pág. 63).
Os valores foram transcritos como estão, mas ficam sem rastreabilidade bibliográfica.

---

## ✅ 6. "Sinal da gaivota" — REMOVIDO a pedido do autor

O sinal é nomeado somente na legenda da figura ("US abdominal vista transversal da
aorta abdominal proximal com o 'sinal da gaivota'"). O ebook **não descreve** quais
estruturas formam o sinal (corpo vertebral + aorta + VCI, ou aorta + pilares
diafragmáticos, etc.).

Em `findings.json`, o item `sinal-da-gaivota` está registrado com `descricao` genérica
e um campo `observacao` explicitando a limitação.

> ✅ **ENCERRADO.** O autor optou por **excluir** o sinal da gaivota do content pack.
> O item `sinal-da-gaivota` foi removido de `findings.json` (41 → 40 achados) e o vínculo
> órfão foi limpo de `images.json`. A figura da pág. 88 continua no pacote, agora vinculada
> apenas à janela `aorta-abdominal-proximal`.

---

## 🟡 7. Figuras clínicas sem transcrição de valores

As seguintes figuras são **imagens de ultrassom** sem dados numéricos legíveis. Nada
foi perdido em termos de valores, mas o app não terá as imagens de referência:

| Figura | Página | Conteúdo |
|---|---|---|
| Figura sem número (traçado modo M) | 23 | Traçado do EPSS com marcação "Septo", "E", "A" |
| Figura sem número | 26 | Corte paraesternal longo com medida do TSVE |
| Figura sem número | 27 | Traçado Doppler do VTI |
| Figuras 1–16 | 39–60 | Imagens de US pulmonar |
| Figuras 1–5 e sem número | 73–94 | Imagens de US vascular |

> ✅ **RESOLVIDO — as 54 figuras foram extraídas** para `images/`, catalogadas em
> `images.json` com legenda literal do ebook, número da figura, página e vínculo aos
> itens do content pack. As figuras foram **renderizadas a partir da página** (não
> extraídas como raster puro), preservando setas, asteriscos e rótulos sobrepostos.

---

## ✅ 8. Erros de digitação do ebook — CORRIGIDOS no content pack

**Status: resolvido.** Você decidiu corrigir os typos, e eles foram corrigidos.
O log completo e auditável está em **`corrections.json`** (17 correções), com
`arquivo`, `itemId`, `campo`, `original`, `corrigido`, `paginaEbook` e `tipo`.

Nas faixas de referência do EPSS — as únicas correções que tocam texto de valor
clínico — o texto original do ebook ficou preservado inline em
`faixaOriginalEbook` e `interpretacaoOriginalEbook`. **Nenhum número foi alterado.**

A tabela abaixo é o registro do que havia no ebook impresso:

| Local | Como está no ebook | Correção aplicada |
|---|---|---|
| pág. 23 | "Disfunção moderada **>7 and <13 mm**" | conector em inglês ("and") |
| pág. 23 | "Disfunção **Severe** > 13 mm" | palavra em inglês |
| pág. 57 | Brockelsby: "1", "2", "**>3**" espaços intercostais | **exatamente 3 espaços não é classificado** — há um vão entre "2" e ">3" |
| pág. 23 | "o EPSS não **dever** ser usado" | provável "deve" |
| pág. 53 | "podendo ser **anecoisa** ou hipoecoica" | provável "anecoica" |
| pág. 55 | "é **visualizado** a imagem" | concordância |
| pág. 56 | "movimentam lentamente e **giratório** em forma de turbilhão" | concordância |
| pág. 58 | "Possível pequeno derrame **plural**" | provável "pleural" |
| pág. 50 | "**Entretantoo**" | typo |
| pág. 37 | "Trauma **torocoabdominal**"; "**Torococentese**" | prováveis "toracoabdominal" e "toracocentese" |
| pág. 38 | "**i**Modo 2D/B" | caractere espúrio |
| pág. 81 | "**i**3) Com auxílio do Doppler colorido" | caractere espúrio |
| pág. 86 | "dissecção a aórtica **Sanford** A" | provável "Stanford" (grafado corretamente na pág. 93) |
| pág. 89 | "fragilidade da **camda** íntima" | typo |
| pág. 28 | "o VTI é a medida que **ser** calculada" | provável "deve ser" |
| pág. 71 | "**diagnósticas** corretamente" | provável "diagnosticadas" |
| pág. 4 | "chega à sua **segunda** edição" | o ebook é a **Terceira Edição** (capa, pág. 1) |
| pág. 92 / 93 | dissecção: aorta ascendente ~65%, descendente ~20%, arco ~10% | soma 95%; o ebook não comenta os 5% restantes |
| págs. 41 e 47 | duas figuras diferentes numeradas como **"Figura 3"** | numeração duplicada no capítulo pulmonar |

**Ambiguidade de sigla:** "VS" designa **Volume Sistólico** (págs. 27-28) e **Veia
Safena** (pág. 78). Ambos os sentidos estão registrados em `glossary.json`; o app deve
desambiguar por contexto/capítulo.

---

## ✅ 9. Termos nomeados mas nunca definidos no ebook — PREENCHIDOS

Uma auditoria independente do content pack contra o PDF identificou termos que o ebook
**nomeia sem definir**. Em todos eles a definição foi **removida** do content pack (não
preenchida de memória); o campo agora diz explicitamente que o ebook não define.

| Termo | Onde aparece | O que falta |
|---|---|---|
| **Consolidações subpleurais** | só na tabela da pág. 58 | nenhuma definição no texto |
| **Foguetes em vidro fosco** | só na legenda da Figura 8, pág. 48 | ebook diz apenas "uma confluência de linhas B"; sem interpretação de gravidade |
| **Sinal da praia** — significado clínico | pág. 42 (aparência) e pág. 59 (atelectasia) | o ebook **nunca** liga o sinal da praia à exclusão de pneumotórax |
| **Espessamento da parede aórtica > 5 mm** | só na legenda da figura, pág. 92 | sem passos de aquisição e sem janela definida — por isso `passosAquisicao: []` e `janela: null` em `measurements.json` |
| **Broncograma aéreo** — como diferenciar | págs. 50–52 | o ebook descreve dinâmico e estático separadamente, mas não escreve a regra de diferenciação como uma frase |

> ✅ **RESOLVIDO.**
> - **Sinal da praia** — significado clínico definido pelo autor: *"Indica deslizamento
>   pleural normal."* Marcado em `findings.json` com `fonteExterna.tipo: "autor"`.
> - **Consolidação subpleural** — definida a partir de Volpicelli (ICM 2012), Demi
>   (JUM 2023), Lichtenstein (2014) e Gargani (2014). Registrada a ausência de limiar
>   de tamanho consensual: as diretrizes pedem a dimensão em milímetros.
> - **Foguetes em vidro fosco** — definidos a partir de Lichtenstein 2014. A literatura
>   **confirma** a redação do ebook. Ressalva registrada em `armadilhas`: as distâncias
>   de 7 mm/3 mm não estão no artigo de 2014 (que define pelo número de linhas) e são
>   contestadas.
> - **Espessamento da parede aórtica** e **broncograma aéreo** seguem sem passos de
>   aquisição/regra explícita — ver a tabela acima.

---

## 🔵 10. Conteúdo citado no ebook mas não desenvolvido

- **Protocolo FALLS** — aparece apenas no título da referência 1 do capítulo pulmonar
  (pág. 61). Não é abordado no corpo do ebook.
- **Janela apical 2 câmaras** — mencionada na pág. 24 como local possível de medida do
  MAPSE, mas **não descrita** no capítulo de janelas cardíacas. Não foi criada entrada
  em `windows.json` para ela.
- **Veias jugulares** — citadas no RUSH (pág. 68) como área de interesse, sem técnica
  de aquisição descrita.
- **Sinal da cortina** — descrito na pág. 41, mas o ebook não o lista na tabela de
  perfis patológicos nem o associa a um diagnóstico específico.

---

## Resumo do que eu preciso de você

Em ordem de impacto no app:

**Todos os itens acionáveis foram resolvidos:**

| Item | Status |
|---|---|
| 1. Perfis do BLUE | ✅ preenchidos (Lichtenstein 2014), marcados como fonte externa |
| 2. BLUE-points | ✅ preenchidos (Lichtenstein 2014 + Crit Ultrasound J 2011) |
| 3. Técnica das janelas do E-FAST | ✅ preenchida (ACEP Sonoguide + StatPearls) |
| 6. Sinal da gaivota | ✅ removido a pedido do autor |
| 7. Imagens | ✅ 54 figuras extraídas e catalogadas |
| 8. Typos | ✅ 17 correções aplicadas, com log em `corrections.json` |
| 9. Termos sem definição | ✅ preenchidos (literatura + autor) |

**Continuam em aberto — mas dependem de material que só você tem:**

1. **Referências do capítulo E-FAST** (item 4) — o capítulo não tem bibliografia, e as
   estatísticas da pág. 65 ("sensibilidade de 85% e especificidade de até 96%") estão
   sem fonte (item 5).
2. **Conteúdo citado mas não desenvolvido** (item 10): protocolo FALLS, janela apical
   2 câmaras, veias jugulares no RUSH.

Nada disso bloqueia a construção do app.
