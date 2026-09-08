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

### 6. CASA — ✅ resolvido (artigos recebidos em 2026-09-08)
Você enviou os dois artigos: **Gardner et al. 2017** (o protocolo original) e
**Clattenburg et al. 2018** (o estudo de implementação, com os números de redução de
pausa de RCP). Os dois foram salvos em `referencias/` e o conteúdo clínico do CASA já
está em `src/content/protocols.json` → `id: "protocolo-casa"`, com todos os campos
extraídos literalmente dos artigos e marcados via `fonteExterna` — nada foi completado
de memória. O protocolo continua `"status": "pendente_validacao"` e **não deve aparecer
para os alunos até você e seus sócios revisarem `VALIDACAO-CLINICA.md`**, que criei com
a lista completa de pontos a confirmar. Isso adianta a curadoria de conteúdo da Fase 4;
a máquina de estados que executa o protocolo no app (nós, avançar/voltar, timer visual)
continua para a Fase 3/4, depois que o motor genérico de protocolos existir.

### 7. Índice Cardíaco (Mosteller) — confirmação, não lacuna
Seu spec já dá a fórmula (SC = √(altura_cm × peso_kg / 3600)) e pede rótulo
"complementar". Vou implementar exatamente assim, marcado como `origem: 'complementar'`
no `CalculatorDef` — não preciso de mais nada aqui, só registrando que não vou tratar a
fórmula de Mosteller como "do ebook" em nenhuma tela.

---

## Decisões de produto que preciso que você bata o martelo (não são lacuna de conteúdo)

### 8. Navegação primária do app — ✅ decidido (delegado a mim)
Você pediu para eu escolher o melhor considerando que o acesso é controlado (curso
pago). Decisão: **tab bar inferior fixa com os 4 módulos** (Atlas / Calculadoras /
Protocolos / Sessão), atrás da tela de acesso — ver a nova seção "Controle de acesso"
em `ARQUITETURA.md`. Dentro do Atlas, o aluno escolhe por janela ou por achado via
toggle. Mantenho essa como a navegação primária a menos que você peça outra coisa depois
de ver o esqueleto na Fase 1.

### 9. Deploy: Vercel ou Netlify — ainda aberto, seguindo com o padrão
Você não respondeu este item. Continuo com **Vercel** por padrão (também porque o
mecanismo de controle de acesso que desenhei usa Vercel Edge Functions — ver
`ARQUITETURA.md`). Avise se preferir Netlify; o desenho do gate de acesso tem
equivalente em Netlify Functions, então a mudança não é cara caso você prefira.

### 10. `efast-pericardica-subxifoide` vs. `subxifoide` — ✅ resolvido e já executado
Você autorizou fundir as duas em `subxifoide`. Feito: `windows.json` caiu de 25 para 24
janelas, os campos de técnica do E-FAST (fonte: ACEP Sonoguide) foram preservados dentro
da entrada fundida com `fonteExterna`, e as referências cruzadas em `protocols.json` e
`images.json` foram atualizadas. A única divergência real entre as duas fontes — a
orientação do marcador (esquerda no ebook, contexto cardíaco; direita/ombro direito na
fonte externa, contexto E-FAST) — não foi escolhida a dedo: as duas ficaram registradas
separadamente (`marcador` = ebook; `usoNoEfast` = fonte externa), porque são convenções
válidas para contextos de transdutor diferentes, não um erro a corrigir.
`node scripts/validate-content.mjs` continua limpo.

### 11. Controle de acesso — ✅ fechado, com uma terceira revisão (offline abandonado)
Histórico rápido, porque passou por três versões:
1. Gate de código, app 100% offline depois de ativado.
2. Você: acesso > offline na prioridade → redesenhei com prazo por aluno desde a
   ativação, 1 aparelho por código, e uma tolerância de 7 dias sem rede antes de travar.
3. Você: **"Acho que podemos abrir mão do offline para termos DRM."** Isso não só
   permite quanto **simplifica** o desenho — se o conteúdo nunca fica no dispositivo
   (nenhum JSON/imagem clínica é baixado; tudo é buscado do servidor tela a tela,
   autenticado a cada requisição), a "tolerância de 7 dias" deixa de fazer sentido: o
   controle de acesso passa a ser verificado em tempo real, a cada tela, com um token
   de sessão de vida curta (~15 min) em vez de uma janela de dias.

Resultado final: DRM real (o conteúdo clínico nunca é persistido no aparelho — extrair
o app não copia o curso, ao contrário do PDF do ebook), prazo por aluno e 1 aparelho por
código continuam exatamente como você pediu, e um código revogado ou expirado para de
funcionar em minutos, não em dias. **Isso muda a Fase 1 de forma grande**: o app deixa
de ser uma SPA estática com PWA offline e passa a precisar de um backend real (Vercel
Functions + KV) servindo conteúdo autenticado antes de qualquer módulo funcionar —
detalhe completo em `ARQUITETURA.md`, seções 4 e 6. A instalabilidade como PWA
(ícone na tela inicial) continua existindo; só o funcionamento sem rede que se foi.

**Geração/revogação de códigos:** você não tinha preferência, decidi — uma tela
administrativa simples (Fase 7), não um script, porque agora que já existe backend
mesmo, o custo incremental é pequeno e quem for operar isso no dia a dia
provavelmente não vai querer rodar comando nenhum.

---

## Materiais que preciso receber (resumo, para você organizar o envio)

Em ordem de impacto no que falta construir:

1. **`Ebook.pdf`** — se quiser que eu reconfira algum valor específico pessoalmente
   (opcional; o content pack já foi conferido, mas é a fonte de verdade formal do
   projeto e eu ainda não abri).
2. ~~Artigo do Gardner et al. (CASA)~~ — ✅ recebido, junto com o de Clattenburg 2018.
3. **Referências do capítulo E-FAST**, se existirem — opcional, só enriquece
   rastreabilidade.
4. **Fonte das estatísticas de sensibilidade/especificidade do E-FAST (pág. 65)** —
   opcional, mesma razão.
5. **Técnica de aquisição das veias jugulares no RUSH**, se você tiver — opcional,
   enriquece o Atlas.

Nenhum destes bloqueia a Fase 1 (esqueleto) nem a Fase 2 (calculadoras) — as medidas de
`measurements.json` estão completas e conferidas.

---

## Resumo — o que eu preciso de você agora para seguir para a Fase 1

- [ ] Confirmar que posso seguir para a Fase 1 com o content pack como está.
- [ ] Itens 3, 4 continuam abertos (FALLS fora da v1, janela apical 2 câmaras) — avise
      se discordar do padrão que propus; senão sigo com ele.
- [x] Controle de acesso: prioridade (acesso > offline), prazo por aluno, DRM real (sem
      offline), 1 aparelho por código e geração/revogação por tela administrativa —
      tudo decidido. Nada pendente aqui além de você ler `ARQUITETURA.md` seções 4 e 6
      antes de eu começar a Fase 1, já que é a mudança de maior impacto no projeto.
- [ ] Quando puder (e só antes da revisão do `VALIDACAO-CLINICA.md`, sem pressa),
      revisar o conteúdo do CASA com seus sócios.
