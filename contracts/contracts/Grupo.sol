// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title Grupo — contrato filho, um por república/grupo
/// @notice Registra membros, despesas e quem deve quanto a quem.
///         Valores em CENTAVOS de real (uint256). Não movimenta ETH.
/// @dev Criado pela FabricaDeGrupos (um contrato por grupo). Só a fábrica
///      adiciona membros (onlyFactory). Máximo de MAX_MEMBROS membros.

contract Grupo {
    struct Despesa {
        uint256 id;
        string descricao;
        uint256 valor; // centavos
        address pagador;
        address[] participantes;
        uint256 data; // block.timestamp
    }

    uint256 public constant MAX_MEMBROS = 20; // limita o tamanho dos laços e o gas

    string public nome;
    address public criador;
    address public fabrica;

    address[] private membros;
    mapping(address => bool) public ehMembro;

    // divida[devedor][credor] = centavos que `devedor` deve a `credor`
    mapping(address => mapping(address => uint256)) public divida;

    Despesa[] private despesas;

    // Eventos (campos `indexed` podem ser filtrados no front)
    event MembroAdicionado(address indexed membro);
    event DespesaAdicionada(
        uint256 indexed id,
        address indexed pagador,
        uint256 valor,
        string descricao,
        address[] participantes
    );
    event DividaQuitada(address indexed devedor, address indexed credor, uint256 valor);

    // Modifiers
    modifier onlyFactory() {
        require(msg.sender == fabrica, "Somente a fabrica");
        _;
    }

    modifier naoEhMembro(address m) {
        require(!ehMembro[m], "Ja eh membro");
        _;
    }

    modifier cabeMaisUm() {
        require(membros.length < MAX_MEMBROS, "Grupo cheio");
        _;
    }

    modifier somenteMembro() {
        require(ehMembro[msg.sender], "Somente membros");
        _;
    }

    modifier valorPositivo(uint256 valor) {
        require(valor > 0, "Valor deve ser positivo");
        _;
    }

    // Constructor
    constructor(string memory _nome, address _criador, address _fabrica) {
        nome = _nome;
        criador = _criador;
        fabrica = _fabrica;
        _adicionarMembro(_criador);
    }

    // Escrita

    /// @notice Só a fábrica chama (dentro de aceitarConvite).
    function adicionarMembro(address m) external onlyFactory naoEhMembro(m) cabeMaisUm {
        _adicionarMembro(m);
    }

    /// @notice Registra uma despesa paga por msg.sender e dividida entre `participantes`.
    function adicionarDespesa(
        string calldata descricao,
        uint256 valor,
        address[] calldata participantes
    ) external somenteMembro valorPositivo(valor) {
        uint256 n = participantes.length;
        require(n > 0, "Sem participantes");

        // Validar: todos são membros e não há repetidos
        for (uint256 i = 0; i < n; i++) {
            require(ehMembro[participantes[i]], "Participante nao eh membro");  
            for (uint256 j = i + 1; j < n; j++) {
                require(participantes[i] != participantes[j], "Participantes repetidos");
            }
        }

        // Dividir e lançar as dívidas (o resto vai para o pagador)
        uint256 part = valor / n;
        for (uint256 i = 0; i < n; i++) {
            address p = participantes[i];
            if (p != msg.sender) {
                divida[p][msg.sender] += part;
            }
        }

        // Guardar a despesa
        uint256 id = despesas.length;
        Despesa storage d = despesas.push();
        d.id = id;
        d.descricao = descricao;
        d.valor = valor;
        d.pagador = msg.sender;
        d.participantes = participantes;
        d.data = block.timestamp;

        // Avisar o front-end
        emit DespesaAdicionada(id, msg.sender, valor, descricao, participantes);
    }

    /// @notice Chamada pelo CREDOR, confirmando que recebeu `valor` do `devedor`.
    function confirmarQuitacao(address devedor, uint256 valor)
        external
        somenteMembro
        valorPositivo(valor)
    {
        require(divida[devedor][msg.sender] >= valor, "Valor maior que a divida");
        divida[devedor][msg.sender] -= valor;
        emit DividaQuitada(devedor, msg.sender, valor);
    }

    // Leitura
    function getMembros() external view returns (address[] memory) {
        return membros;
    }

    function getDespesas() external view returns (Despesa[] memory) {
        return despesas;
    }

    function totalDespesas() external view returns (uint256) {
        return despesas.length;
    }

    /// @notice Positivo = tem a receber; negativo = está devendo.
    function saldoDe(address m) external view returns (int256 saldo) {
        uint256 n = membros.length;
        for (uint256 i = 0; i < n; i++) {
            address outro = membros[i];
            saldo += int256(divida[outro][m]); // o que 'outro' deve a m
            saldo -= int256(divida[m][outro]); // o que m deve a 'outro'
        }
    }

    /// @notice Todos os pares (devedor, credor) com dívida > 0, em uma chamada só.
    function getDividas()
        external
        view
        returns (address[] memory devedores, address[] memory credores, uint256[] memory valores)
    {
        uint256 n = membros.length;

        // Contar quantas dívidas existem
        uint256 total = 0;
        for (uint256 i = 0; i < n; i++) {
            for (uint256 j = 0; j < n; j++) {
                if (divida[membros[i]][membros[j]] > 0) {
                    total++;
                }
            }
        }

        // Criar arrays do tamanho certo
        devedores = new address[](total);
        credores = new address[](total);
        valores = new uint256[](total);

        // Preencher os arrays
        uint256 index = 0;
        for (uint256 i = 0; i < n; i++) {
            for (uint256 j = 0; j < n; j++) {
                uint256 valor = divida[membros[i]][membros[j]];
                if (valor > 0) {
                    devedores[index] = membros[i];
                    credores[index] = membros[j];
                    valores[index] = valor;
                    index++;
                }
            }
        }
    }

    // Internas
    function _adicionarMembro(address m) private {
        membros.push(m);
        ehMembro[m] = true;
        emit MembroAdicionado(m);
    }
}
