# PERGUNTAS.md — Fase 0

## Antes de tudo: não recebi o `Ebook.pdf`

Você descreveu o projeto como tendo `Ebook.pdf` na pasta. O que chegou no zip foi um
**content pack já extraído** (`src/content/*.json` + `CLAUDE.md` + `docs/`), sem o PDF
em si. Eu tratei esse content pack como a Fase 0 pede — li `CLAUDE.md`, `docs/gaps.md` e
`docs/content-pack-README.md` inteiros, conferi os 15 itens de `measurements.json`
contra os valores exatos do seu spec do produto (batem, número por número, inclusive o
caso de teste DC do TSVE 2 cm/VTI 20 cm/FC 70 → 4,4 L/min), rodei
`scripts/validate-content.mjs` (0 erros) e conferi que a Figura 16 (pág. 60, BLUE) está
de fato no pacote de imagens (`fig-p060-01.webp`).

**O que isso significa na prática:** para o conteúdo que já está em `src/content/*.json`
com `paginaEbook` preenchido e sem `fonteExterna`, meu nível de confiança é alto — não é
"deduzido", é o que o content pack (que por sua vez cita ter conferido contra o PDF
caractere a caractere) registra. Mas eu, nesta sessão, **não abri o PDF original**. Se
você quiser que eu confira alguma medida específica pessoalmente contra o PDF antes de
confiar nela — em especial `metodo-brockelsby` (a lacuna do "exatamente 3 espaços") ou
qualquer faixa que pareça estranha — **me envie o `Ebook.pdf` em `referencias/`** (ou na
raiz, como o spec original previa) e eu reconfiro.

---

## Lacunas que o próprio content pack já sinalizou (`docs/gaps.md`) e que continuam abertas

Não fechei nenhuma destas sozinho — são as mesmas que `gaps.md` já lista como pendentes,
e dependem de material que só você tem:

### 1. Referências bibliográficas do capítulo E-FAST (págs. 63–65)
O ebook não traz bibliografia para esse capítulo. `references.json` tem o capítulo
`protocolo-efast` com `referencias: []`.
**Preciso:** se existirem referências para o E-FAST (mesmo que não estejam impressas no
ebook — ex. slides da aula, ou a intenção de citar StatPearls/ACEP), me diga; senão eu
deixo `[]` e documento no rodapé do módulo E-FAST do app "referências não fornecidas
pelo ebook".

### 2. Fonte das estatísticas do E-FAST (pág. 65)
"Sensibilidade de 85% e especificidade de até 96%" e "aproximadamente 3 minutos" (pág.
63) são atribuídos a "Estudos", sem citação. Vou exibir os números como estão
(`protocols.json` já os tem, literais), mas sem link de fonte — a menos que você tenha o
artigo original.

### 3. Protocolo FALLS
Citado só no título de uma referência bibliográfica (pág. 61), não desenvolvido no
corpo do ebook. Não vou criar um módulo/conteúdo para FALLS. Confirme que é para deixar
de fora da v1 — presumi que sim, por não haver conteúdo para mostrar.

### 4. Janela apical 2 câmaras
Mencionada na pág. 24 como local possível de medida do MAPSE, mas nunca descrita como
janela própria. Não existe entrada em `windows.json` para ela. Vou deixar assim (o Atlas
de Janelas não vai ter uma entrada "apical 2 câmaras" na Fase 5) a menos que você
prefira que eu crie uma entrada com os campos técnicos em `null` (mesmo tratamento dado
às janelas do E-FAST antes de serem preenchidas por fonte externa).

### 5. Veias jugulares no RUSH
Citadas na pág. 68 como área de interesse do "Pipes", mas sem técnica de aquisição
descrita em lugar nenhum do ebook. `protocols.json` já lista "jugulares" só como texto
solto no elemento Pipes. Isso é suficiente para o módulo RUSH (é conteúdo descritivo, não
uma medida numérica), mas se você tiver a técnica de aquisição (posição do transdutor,
compressibilidade), ela enriqueceria o Atlas.

---

## Pergunta nova, específica do app (não estava em `gaps.md` porque o content pack não
## cobre calculadoras/protocolos executáveis)

### 6. CASA — preciso do artigo do Gardner antes da Fase 4
Seu spec já descreve a estrutura de alto nível (3 exames de ≤10 s durante checagem de
pulso: CASA 1 tamponamento, CASA 2 sobrecarga/dilatação de VD, CASA 3 atividade cardíaca
organizada). Isso é suficiente para eu montar o **esqueleto técnico** do protocolo
(ids dos nós, timer de 10 s, o alerta "retome as compressões") na Fase 4, mas não é
suficiente para o conteúdo clínico de cada nó — o que exatamente conta como "sobrecarga
de VD compatível com TEP" num exame de 10 segundos, qual achado de cada exame leva a
qual branch de conclusão, qual o texto de `justificativa`/`cuidado` de cada nó de
conclusão.
**Preciso:** o artigo original (Gardner KF et al., "The Cardiac Arrest Sonographic
Assessment (CASA) exam" — ou a versão/adaptação que vocês usam no curso, se for
diferente da publicação original) em `referencias/`. Sem ele, na Fase 4 eu construo só o
esqueleto (nós vazios, `status: "pendente_validacao"`) e paro — não vou preencher
`justificativa`/`cuidado` de conclusão de parada cardíaca a partir de conhecimento geral
meu, mesmo rascunho.

### 7. Índice Cardíaco (Mosteller) — confirmação, não lacuna
Seu spec já dá a fórmula (SC = √(altura_cm × peso_kg / 3600)) e pede rótulo
"complementar". Vou implementar exatamente assim, marcado como `origem: 'complementar'`
no `CalculatorDef` — não preciso de mais nada aqui, só registrando que não vou tratar a
fórmula de Mosteller como "do ebook" em nenhuma tela.

---

## Decisões de produto que preciso que você bata o martelo (não são lacuna de conteúdo)

### 8. Navegação primária do app
O `README-STARTER.md` original do content pack levantava isso e eu concordo que é uma
decisão sua, não minha: o conteúdo suporta entrada por **janela**, **achado**,
**patologia** ou **protocolo** igualmente bem. Sugestão (não decisão): tab bar inferior
fixa com os 4 módulos do seu spec (Atlas / Calculadoras / Protocolos / Sessão), e dentro
do Atlas o aluno escolhe por janela ou por achado via toggle — mas se você já tem uma
preferência de fluxo (ex.: "aluno em plantão sempre entra por protocolo primeiro"), me
diga antes da Fase 1 porque isso afeta a tela inicial.

### 9. Deploy: Vercel ou Netlify
O spec permite qualquer um dos dois. Vou seguir com **Vercel** por padrão na Fase 7 (mais
comum para Vite) a menos que você já tenha conta/preferência em um dos dois — me avise
se for Netlify.

### 10. `efast-pericardica-subxifoide` vs. `subxifoide`
`windows.json` tem as duas entradas (mesma janela anatômica, uma no contexto de trauma,
outra no contexto cardíaco), já linkadas por `verTambem`. Posso deixar as duas
separadas no Atlas (mostra o mesmo lugar do corpo com "o que avaliar" diferente conforme
o contexto de entrada) ou fundir numa única página com duas seções. Vou seguir com
**duas entradas separadas** por padrão — é mais simples e reflete a estrutura do dado —
mas avise se preferir fundido.

---

## Materiais que preciso receber (resumo, para você organizar o envio)

Em ordem de impacto no que falta construir:

1. **`Ebook.pdf`** — se quiser que eu reconfira algum valor específico pessoalmente
   (opcional; o content pack já foi conferido, mas é a fonte de verdade formal do
   projeto e eu ainda não abri).
2. **Artigo do Gardner et al. (CASA)** — bloqueia o conteúdo clínico da Fase 4 (o
   esqueleto técnico não bloqueia).
3. **Referências do capítulo E-FAST**, se existirem — opcional, só enriquece
   rastreabilidade.
4. **Fonte das estatísticas de sensibilidade/especificidade do E-FAST (pág. 65)** —
   opcional, mesma razão.
5. **Técnica de aquisição das veias jugulares no RUSH**, se você tiver — opcional,
   enriquece o Atlas.

Nenhum destes bloqueia a Fase 1 (esqueleto) nem a Fase 2 (calculadoras) — as medidas de
`measurements.json` estão completas e conferidas. O primeiro bloqueio real de conteúdo
aparece na Fase 4 (CASA).

---

## Resumo — o que eu preciso de você agora para seguir para a Fase 1

- [ ] Confirmar que posso seguir para a Fase 1 com o content pack como está.
- [ ] Responder itens 3, 4, 8, 9, 10 acima (ou dizer "segue com o padrão sugerido" em
      cada um).
- [ ] Quando puder, colocar o artigo do Gardner em `referencias/` — não precisa ser
      agora, só antes da Fase 4.
