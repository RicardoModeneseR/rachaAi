# RachaAí

DApp para dividir as contas de uma república ou de um grupo de amigos. Cada despesa fica registrada na blockchain (rede de teste Sepolia), e todos os membros podem ver o histórico e saber quem deve quanto a quem. Ninguém consegue editar nada depois.

A DApp **só registra valores**. Ela não movimenta ETH: o pagamento acontece por fora (Pix, por exemplo) e o credor confirma na DApp que recebeu.

Projeto final da disciplina INF17402 (Blockchains e Smart Contracts).

> **Status: Fase 0 concluída (esqueleto v0).** Os contratos já têm todas as funções, eventos e modifiers definitivos e compilam, mas a lógica de negócio ainda não foi escrita (veja [Andamento](#andamento)).

| | |
|---|---|
| DApp | *em breve* |
| Fábrica na Sepolia (Etherscan) | *em breve* |

---

## Arquitetura

Um contrato principal, `FabricaDeGrupos`, segue o padrão **Contract Factory**: ele cria um contrato `Grupo` para cada república e depois faz chamadas a esse contrato.

```
                 Interface web (React + ethers.js)
                   │ transações            ▲ eventos ao vivo
                   ▼                       │
          ┌──────────────────┐             │
          │ FabricaDeGrupos  │─────────────┤
          └──────────────────┘             │
            │ new Grupo(...)               │
            │ adicionarMembro · saldoDe · ehMembro
            ▼                              │
     ┌──────────┐ ┌──────────┐ ┌──────────┐│
     │ Grupo #1 │ │ Grupo #2 │ │ Grupo #N │┘
     └──────────┘ └──────────┘ └──────────┘
```

A interface fala com a fábrica para criar grupos e aceitar convites, e fala direto com cada `Grupo` para registrar despesas e quitações.

Os valores são guardados em **centavos de real** (`uint256`), porque o Solidity não tem números decimais. Por exemplo, R$ 12,34 vira `1234`.

### Onde a fábrica chama o contrato filho

| Onde | Chamada |
|---|---|
| `aceitarConvite` | `Grupo(grupo).adicionarMembro(msg.sender)` |
| `resumoDoUsuario` | `Grupo(g).saldoDe(u)` |
| modifier `somenteMembroDoGrupo` | `Grupo(grupo).ehMembro(msg.sender)` |

---

## Contratos

### `FabricaDeGrupos.sol`

| Função | Quem chama | Modifiers | Evento |
|---|---|---|---|
| `criarGrupo(string nome)` | qualquer um | `nomeValido` | `GrupoCriado` |
| `convidar(address grupo, address convidado)` | membro do grupo | `grupoExiste`, `somenteMembroDoGrupo` | `ConviteEnviado` |
| `aceitarConvite(address grupo)` | o convidado | `grupoExiste`, `temConvite` | `MembroAdicionado` (sai do Grupo) |
| `getGruposDoUsuario(address u)` | view | — | — |
| `getTodosGrupos()` | view | — | — |
| `resumoDoUsuario(address u)` → `(address[], int256[])` | view | — | — |

Getters públicos: `grupos(i)`, `ehGrupo(addr)` e `convitePendente(grupo, convidado)`.

### `Grupo.sol`

| Função | Quem chama | Modifiers | Evento |
|---|---|---|---|
| `constructor(nome, criador, fabrica)` | a fábrica | — | `MembroAdicionado` |
| `adicionarMembro(address m)` | só a fábrica | `onlyFactory`, `naoEhMembro`, `cabeMaisUm` | `MembroAdicionado` |
| `adicionarDespesa(string descricao, uint256 valor, address[] participantes)` | membro | `somenteMembro`, `valorPositivo` | `DespesaAdicionada` |
| `confirmarQuitacao(address devedor, uint256 valor)` | o credor | `somenteMembro`, `valorPositivo` | `DividaQuitada` |
| `getMembros()`, `getDespesas()`, `totalDespesas()` | view | — | — |
| `saldoDe(address m)` → `int256` (positivo = tem a receber) | view | — | — |

Getters públicos: `nome`, `criador`, `fabrica`, `ehMembro(addr)`, `divida(devedor, credor)` e `MAX_MEMBROS` (20).

### Eventos

| Contrato | Evento |
|---|---|
| Fábrica | `GrupoCriado(address indexed grupo, address indexed criador, string nome)` |
| Fábrica | `ConviteEnviado(address indexed grupo, address indexed convidado, address indexed quemConvidou)` |
| Grupo | `MembroAdicionado(address indexed membro)` |
| Grupo | `DespesaAdicionada(uint256 indexed id, address indexed pagador, uint256 valor, string descricao, address[] participantes)` |
| Grupo | `DividaQuitada(address indexed devedor, address indexed credor, uint256 valor)` |

Os campos `indexed` servem para filtrar eventos no front, por exemplo `fabrica.filters.ConviteEnviado(null, meuEndereco)`. Strings e arrays não são `indexed`, porque nesse caso o evento guardaria só o hash, e o front não conseguiria ler o texto.

### Mensagens de erro (modifiers)

São estas as mensagens que o front exibe quando uma transação reverte. Elas estão sem acento porque o Solidity só aceita acento em strings marcadas com `unicode"..."`.

| Modifier | Contrato | Mensagem |
|---|---|---|
| `nomeValido` | Fábrica | `Nome vazio` |
| `grupoExiste` | Fábrica | `Grupo inexistente` |
| `somenteMembroDoGrupo` | Fábrica | `Somente membros` |
| `temConvite` | Fábrica | `Sem convite` |
| `onlyFactory` | Grupo | `Somente a fabrica` |
| `naoEhMembro` | Grupo | `Ja eh membro` |
| `cabeMaisUm` | Grupo | `Grupo cheio` |
| `somenteMembro` | Grupo | `Somente membros` |
| `valorPositivo` | Grupo | `Valor deve ser positivo` |

### Regras de negócio (a implementar na Fase 1)

1. **Divisão:** `parte = valor / n`. O resto (`valor % n`) fica com o pagador. Por exemplo, R$ 100,00 entre 3 pessoas gera uma dívida de 33,33 para cada um dos outros dois.
2. **Pagador fora da lista:** se o pagador não estiver entre os participantes, cada participante deve a parte inteira a ele.
3. **Soma zero:** a soma de `saldoDe` de todos os membros é sempre zero.

---

## Como rodar os contratos

Requisitos: Node.js 22 ou mais recente e npm.

```bash
cd contracts
npm install
```

| Comando | O que faz |
|---|---|
| `npm run compile` | Compila os contratos |
| `npm run abi` | Compila e copia a ABI para `frontend/src/abi/` |
| `npm test` | Roda os testes unitários (Fase 1) |
| `npm run coverage` | Gera o relatório de cobertura dos testes |
| `npm run node` | Sobe uma blockchain local em `localhost:8545` (chainId 31337) |

### Variáveis de ambiente (só para o deploy na Sepolia)

Para compilar e testar localmente, não é preciso nenhuma variável de ambiente. Para o deploy na Sepolia:

```bash
cp .env.example .env   # e preencha os valores
```

| Variável | Para quê |
|---|---|
| `SEPOLIA_RPC_URL` | URL RPC da Sepolia (Alchemy ou Infura) |
| `PRIVATE_KEY` | Chave privada da carteira **exclusiva do projeto** |
| `ETHERSCAN_API_KEY` | Verificação do contrato com `npx hardhat verify` |

> O arquivo `.env` está no `.gitignore` e **nunca** deve ser commitado. Use uma carteira criada só para o projeto, nunca uma com dinheiro de verdade.

### Ferramentas

- **Hardhat 2** com `@nomicfoundation/hardhat-toolbox`, que traz Mocha + Chai, ethers.js v6, cobertura e verificação no Etherscan.
  - Escolhemos a versão 2 porque comandos como `hardhat coverage`, `loadFixture` e `revertedWith` funcionam nela do jeito que o plano do projeto descreve.
- **Solidity 0.8.28**, com o otimizador ligado (200 runs).

---

## Estrutura do repositório

```
rachaAi/
├── contracts/                  ← projeto Hardhat
│   ├── contracts/
│   │   ├── FabricaDeGrupos.sol
│   │   └── Grupo.sol
│   ├── scripts/
│   │   └── exportar-abi.js     ← copia a ABI para o front
│   ├── test/                   ← testes (Fase 1)
│   ├── hardhat.config.js
│   └── .env.example
├── frontend/
│   └── src/
│       └── abi/                ← FabricaDeGrupos.json e Grupo.json (ABI v0)
├── .gitignore
└── README.md
```

### Para quem vai criar o front-end

A ABI v0 já está em `frontend/src/abi/`. Quando rodar `npm create vite@latest` dentro de `frontend/`, escolha **"Ignore files and continue"** para não apagar esses arquivos.

---

## Fluxo de trabalho

- Um branch por tarefa (ex.: `feat/grupo-despesas`, `feat/tela-grupo`), com Pull Request para a `main`.
- **Ninguém faz merge do próprio código:** todo PR é revisado pela outra pessoa da dupla.
- Quando mudar uma assinatura de função ou de evento, rode `npm run abi` e inclua a ABI atualizada **no mesmo PR**.
- Depois do deploy na Sepolia, qualquer mudança nos contratos exige um novo deploy e a atualização do endereço da fábrica e do bloco do deploy no front.

---

## Andamento

| Fase | Período | Status |
|---|---|---|
| 0 · Preparação | 16–17/nov | ✅ Estrutura, Hardhat configurado, esqueleto dos contratos e ABI v0 |
| 1 · Construção | 18–23/nov | ⏳ Lógica dos contratos, testes do Grupo, ABI real (20/nov) |
| 2 · Deploy e integração | 24–28/nov | ⏳ Testes da fábrica, cobertura, deploy na Sepolia (25/nov) |
| 3 · Testes ponta a ponta | 29/nov–01/dez | ⏳ |
| 4 · Entrega | 02/dez | ⏳ |

**Já está pronto nos contratos:** assinaturas, eventos, estado, todos os modifiers, o constructor do `Grupo` (que já adiciona o criador como membro) e as funções de leitura simples.

**Falta (Fase 1):** `criarGrupo`, `convidar`, `aceitarConvite`, `resumoDoUsuario`, `adicionarMembro`, `adicionarDespesa`, `confirmarQuitacao` e `saldoDe`. Cada uma está marcada com `// TODO Fase 1` no código.
