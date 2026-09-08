# VALIDAÇÃO CLÍNICA — Protocolo CASA

Este arquivo existe porque o app tem uma regra sem exceção: **nenhuma tela mostra uma
conclusão diagnóstica sem os achados que a geraram e sem a ressalva de integração
clínica**, e nenhum conteúdo é publicado para os alunos sem que um médico do curso o
tenha revisado. O protocolo CASA (Cardiac Arrest Sonographic Assessment) é o único
conteúdo do app que **não vem do Ebook TPOCUS 3.0** — é inteiramente extraído de dois
artigos que você forneceu em 2026-09-08. Está marcado `"status": "pendente_validacao"`
em `src/content/protocols.json` e **não deve aparecer para os alunos até este arquivo
ser fechado** (todos os itens abaixo marcados, ou uma decisão explícita sua registrada).

## Fontes

1. **Gardner KF, Clattenburg EJ, Wroe P, Singh A, Mantuani D, Nagdev A.** The Cardiac
   Arrest Sonographic Assessment (CASA) exam – A standardized approach to the use of
   ultrasound in PEA. *Am J Emerg Med.* 2017. DOI: 10.1016/j.ajem.2017.08.052
   — `referencias/gardner-2017-casa-exam.pdf`. O artigo que descreve o protocolo em si.
2. **Clattenburg EJ, Wroe PC, Gardner K, Schultz C, Gelber J, Singh A, Nagdev A.**
   Implementation of the Cardiac Arrest Sonographic Assessment (CASA) protocol for
   patients with cardiac arrest is associated with shorter CPR pulse checks.
   *Resuscitation.* 2018. DOI: 10.1016/j.resuscitation.2018.07.030
   — `referencias/clattenburg-2018-casa-implementation.pdf`. O estudo de implementação
   (pré/pós-intervenção) que mede o efeito do protocolo na duração das pausas de RCP.

Nenhum outro material foi usado. Nada foi completado de memória — onde os artigos não
especificam algo (ex.: não abordam ritmos chocáveis), o conteúdo do app também não
especifica, e isso está registrado em `limitacoes`.

## O que está pronto para revisão

Todo o conteúdo está em `src/content/protocols.json` → objeto `id: "protocolo-casa"`
(último item do array). Estrutura, para facilitar a leitura sem abrir o JSON:

- **`contextoClinico`** (4 itens) — por que o CASA existe: POCUS é recomendado pela AHA
  em parada cardíaca, mas prolonga pausas de RCP; protocolos anteriores eram complexos;
  o CASA busca ser simples e rápido.
- **`estrutura`** (7 itens) — como o exame é conduzido: 3 exames de <10s durante
  checagens de pulso, transdutor setorial, janela subxifoide preferencial (permite
  seguir durante RCP), cronometragem em voz alta, 2º operador quando possível, ~2 min de
  ACLS entre pausas, e a lógica por trás da ordem das 3 etapas.
- **`etapas`** (3 itens) — o núcleo clínico do protocolo:
  1. **Tamponamento cardíaco** — pergunta binária (derrame pericárdico? sinais de
     tamponamento?), prevalência (4–15% das AESP), prognóstico (sobrevida 15,4% vs.
     1,3%), conduta (considerar pericardiocentese).
  2. **Embolia pulmonar** — sinais de sobrecarga de VD, prevalência (4,0–7,6%),
     prognóstico (sobrevida 6,7% vs. 1,3%), conduta (manter EP como hipótese).
  3. **Atividade cardíaca** — presença/ausência de atividade global, prognóstico
     (sobrevida 0,0–0,6% se ausente — **não zero**, artigo é explícito que a
     ressuscitação deve continuar independentemente), conduta (vasopressor se presente;
     reavaliar utilidade da ressuscitação com outros fatores se ausente).
- **`etapasAncilares`** (2 itens) — pneumotórax hipertensivo e FAST, avaliados durante a
  RCP em andamento (não são pausas cronometradas), caso a caso.
- **`exclusoesExplicitas`** — o artigo original exclui deliberadamente a avaliação de
  VCI/hipovolemia do protocolo, e explica por quê.
- **`timerSegundos: 10`**, **`alertaRetomarCompressoes: true`**,
  **`recomendacaoTimer`** — o requisito de produto (timer embutido + alerta de "retome
  as compressões") mapeado para os números que os artigos realmente usam: <10s por
  etapa (Gardner), e uma sugestão de timer sonoro de 6s para garantir que a pausa não
  ultrapasse 10s (Clattenburg, na Discussão).
- **`resultadosImplementacao`** (5 itens) — o que o estudo de 2018 mediu: redução de
  ~3,3–4,0s por pausa, mas ainda um estudo de centro único, não randomizado.
- **`limitacoes`** (3 itens) — não randomizado, efeito Hawthorne não descartável, sem
  garantia de que os residentes seguiram a ordem prescrita; e uma limitação que eu
  acrescentei por não estar explícita nos artigos como "limitação" mas ser relevante:
  os artigos não abordam ritmos chocáveis.

## Perguntas para você e seus sócios responderem

- [ ] **As etapas, na ordem e no conteúdo descritos, refletem como vocês querem
      ensinar o CASA no curso?** Os dois artigos são de um único grupo/centro
      (Highland Hospital, Oakland) — é a versão que vocês querem publicar, ou preferem
      adaptar a ordem/ênfase para o público do curso?
- [ ] **A conduta de cada etapa está com o tom certo?** Está redigida como "considerar
      X" / "deve permanecer como consideração", nunca como uma ordem categórica — isso
      é proposital (reflete a redação do artigo) e é consistente com a regra do app de
      nunca isolar uma conclusão diagnóstica do julgamento clínico. Confirmem que
      concordam com esse tom para uma decisão tão sensível quanto suspender ou manter
      uma ressuscitação.
- [ ] **Timer de 10s e alerta "retome as compressões":** o valor (10s) vem do desenho
      original do protocolo (Gardner), não de uma recomendação separada de segurança.
      Confirmem que esse é o número que querem embutido no app, e não, por exemplo, os
      6s sugeridos por Clattenburg como timer auxiliar (que tratamos como uma dica
      operacional, em `recomendacaoTimer`, não como o timer principal).
- [ ] **Publicar com o aviso atual?** O campo `avisoClinico` diz que o protocolo é
      baseado em dois artigos de um único centro e que nenhuma conclusão substitui o
      julgamento clínico. Aprovem o texto ou peçam ajuste.
- [ ] **Pronto para sair de rascunho?** Quando aprovado, mudar `"status":
      "pendente_validacao"` para ausente (ou um valor como `"publicado"`, a definir na
      Fase 4) libera o protocolo para os alunos. Até lá, o app deve manter o aviso de
      rascunho visível em qualquer tela do CASA — isso será implementado como parte do
      motor de protocolos na Fase 4.

## Registro de decisão

_(Preencher quando revisado.)_

- Revisor(es):
- Data:
- Decisão: [ ] aprovado como está · [ ] aprovado com ajustes (listar) · [ ] não aprovado
- Ajustes solicitados:
