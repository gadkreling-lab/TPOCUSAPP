# CLAUDE.md — App TPOCUS

Aplicativo de estudo construído sobre o **Ebook TPOCUS 3.0**, material oficial do
Treinamento Prático em Ultrassom Point of Care. Público: médicos.

---

## ⛔ REGRA 1 — Conteúdo clínico não se altera

**Nenhum valor de corte, fórmula, faixa de referência ou unidade em
`src/content/*.json` pode ser alterado, arredondado, convertido ou "atualizado" para
refletir diretrizes mais recentes.**

Isso vale mesmo quando o valor parecer errado, desatualizado ou divergente do que você
conhece da literatura. Exemplos reais que **estão certos como estão**:

- `TAPSE: "<17 mm"` — é o que o ebook diz. Não mude para 16 mm nem para 1,7 cm.
- `EPSS: ">7 e <13 mm"` — o ebook não classifica exatamente 7 mm. Não "conserte" o intervalo.
- `metodo-brockelsby` — classifica 1, 2 e >3 espaços intercostais. **Exatamente 3 não tem
  classificação.** Isso é uma lacuna do ebook, não um bug. Não interpole.
- `1,7 – 2,3 cm` — vírgula decimal, padrão pt-BR. Não converta para ponto.

Se você achar que um valor está clinicamente errado, **não corrija: pergunte ao autor.**
O app é material didático de um curso específico e precisa refletir o curso.

Um agente que "melhora" um valor clínico neste repositório causa dano potencial a
paciente. Trate `measurements.json`, `pathologies.json` e `findings.json` como dados
somente-leitura vindos de uma fonte externa.

---

## ⚠️ REGRA 2 — Nem todo conteúdo é do ebook

21 itens foram preenchidos a partir da literatura porque o ebook é omisso neles.
**Todo item preenchido carrega um campo `fonteExterna`** dizendo quais campos vieram de
fora, de qual artigo e com qual link.

```jsonc
"fonteExterna": {
  "referencia": "Lichtenstein DA. Lung ultrasound in the critically ill. Ann Intensive Care. 2014;4(1):1.",
  "url": "https://link.springer.com/article/10.1186/2110-5820-4-1",
  "campos": ["descricao", "significadoClinico", "armadilhas"],
  "nota": "Estes campos NÃO constam do Ebook TPOCUS 3.0..."
}
```

**A UI deve deixar isso visível ao usuário.** Um médico lendo a definição do "Perfil B"
precisa saber que aquilo veio do Lichtenstein e não do material do curso. Um selo
discreto com link para a `url` basta — mas não pode ser omitido.

Onde há conteúdo externo:

| Arquivo | Itens | Fonte |
|---|---|---|
| `protocols.json` → `protocolo-blue` | `perfis`, `pontosBlue`, `regrasDecisao` | Lichtenstein 2014 |
| `windows.json` | 8 janelas `efast-*` | ACEP Sonoguide |
| `findings.json` | `consolidacao-subpleural`, `foguetes-vidro-fosco` | Volpicelli 2012, Lichtenstein 2014 |
| `findings.json` | `sinal-da-praia` (`tipo: "autor"`) | autor do curso |
| `glossary.json` | 9 entradas de perfis | Lichtenstein 2014 |

**Caso especial — `protocolo-blue`:** o campo `fluxograma` é a transcrição literal da
Figura 16 do ebook; `regrasDecisao` é o algoritmo do artigo original. **As duas versões
divergem e devem conviver.** Não funda uma na outra, não "corrija" o fluxograma do ebook
usando o artigo.

---

## REGRA 3 — `null` significa "o ebook não diz"

- `null` → o ebook **não informa** esse dado. Não renderize o campo. **Nunca preencha.**
- `[]` → não há itens dessa categoria.
- Nunca use string vazia.

`"posicaoPaciente": null` quer dizer *"o ebook não diz em que posição o paciente fica"*,
e não *"o paciente não precisa de posição"*. Se um campo `null` incomoda no layout,
a solução é esconder o campo, não inventar conteúdo.

---

## REGRA 4 — Transcrição vs. correção

Os erros de digitação do ebook **já foram corrigidos** (17 correções), com log completo
e auditável em `src/content/corrections.json`. Nenhuma correção alterou um dígito.

Nas faixas do EPSS, o texto original impresso está preservado inline em
`faixaOriginalEbook` e `interpretacaoOriginalEbook`. Não remova esses campos — são a
prova de que os números não foram tocados.

Se encontrar um novo typo: corrija **e registre em `corrections.json`** no mesmo formato.

---

## Estrutura do conteúdo

```
src/content/
├── windows.json       25  janelas de aquisição (cardíaca, pulmonar, vascular, E-FAST)
├── findings.json      40  achados e artefatos
├── pathologies.json    8  perfis pulmonares (tabela págs. 58-59)
├── measurements.json  15  medidas quantitativas ← o arquivo mais sensível
├── glossary.json      71  siglas e termos
├── references.json     7  capítulos de referências bibliográficas
├── protocols.json      3  BLUE, E-FAST, RUSH
├── images.json        54  catálogo das figuras
├── corrections.json   17  log de correções
└── images/            54  figuras em WebP (2,8 MB)
```

Relacionamentos (chaves estrangeiras, todas validadas):

```
pathologies.findingsRelacionados[] → findings.id
measurements.janela                → windows.id   (pode ser composto: "id-a + id-b")
images.{window,finding,measurement,pathology,protocol}Ids[] → respectivos .id
protocols.efast.janelas[]          → windows.id
windows.verTambem[]                → windows.id
```

Todo item tem `paginaEbook` (âncora de rastreabilidade) e, quando o assunto se espalha,
`paginasEbook[]`.

**A especificação completa do schema está em `docs/content-pack-README.md`.** Leia antes
de mexer no conteúdo. **`docs/gaps.md`** lista o que o ebook não cobre e por quê.

---

## Convenções de código

- Português do Brasil na UI e nos nomes de domínio (`janela`, `achado`, `medida`) —
  a terminologia é a do próprio ebook, não traduza para inglês.
- Os `id` são slugs kebab-case estáveis: use como chave de rota e de relacionamento.
- Imagens em WebP. Se precisar dos PNG originais (até 1400 px), eles podem ser
  regerados a partir do PDF do ebook.

## Antes de commitar

- [ ] Nenhum arquivo em `src/content/*.json` foi alterado sem necessidade
- [ ] Se alterou conteúdo: a mudança está registrada em `corrections.json`?
- [ ] Nenhum campo `null` foi preenchido com valor inventado
- [ ] O conteúdo com `fonteExterna` continua marcado na UI

---

## Aviso

Material didático transcrito. Não substitui o ebook original, a supervisão do curso nem
o julgamento clínico. Como diz o próprio ebook (pág. 17):

> *"O POCUS deve ser interpretado em associação com a história clínica e o exame físico,
> contribuindo para um manejo apropriado, rápido e certeiro."*

O ebook traz na capa: **PROIBIDOS COMERCIALIZAÇÃO E COMPARTILHAMENTO**. O conteúdo deste
repositório é derivado dele — trate a distribuição com o mesmo cuidado.
