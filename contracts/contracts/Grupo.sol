// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title Grupo — contrato filho, um por república/grupo
/// @notice Registra membros, despesas e quem deve quanto a quem.
///         Valores em CENTAVOS de real (uint256). Não movimenta ETH.
/// @dev ESQUELETO v0 (Fase 0): assinaturas, eventos e modifiers definitivos;
///      a lógica das funções marcadas com TODO entra na Fase 1.
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
        // TODO Fase 1: _adicionarMembro(m);
    }

    /// @notice Registra uma despesa paga por msg.sender e dividida entre `participantes`.
    function adicionarDespesa(
        string calldata descricao,
        uint256 valor,
        address[] calldata participantes
    ) external somenteMembro valorPositivo(valor) {
        // TODO Fase 1:
        // 1. participantes não vazio, todos membros, sem repetidos
        // 2. parte = valor / n (o resto valor % n fica com o pagador)
        // 3. divida[p][msg.sender] += parte, para cada p != msg.sender
        // 4. despesas.push(...) e emit DespesaAdicionada(...)
    }

    /// @notice Chamada pelo CREDOR, confirmando que recebeu `valor` do `devedor`.
    function confirmarQuitacao(address devedor, uint256 valor)
        external
        somenteMembro
        valorPositivo(valor)
    {
        // TODO Fase 1:
        // require(divida[devedor][msg.sender] >= valor, ...);
        // divida[devedor][msg.sender] -= valor;
        // emit DividaQuitada(devedor, msg.sender, valor);
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
        // TODO Fase 1: soma divida[outro][m] - divida[m][outro] para cada membro
    }

    // Internas
    function _adicionarMembro(address m) private {
        membros.push(m);
        ehMembro[m] = true;
        emit MembroAdicionado(m);
    }
}
