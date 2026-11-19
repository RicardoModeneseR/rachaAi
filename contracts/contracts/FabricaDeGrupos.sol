// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./Grupo.sol";

/// @title FabricaDeGrupos — contrato principal (Contract Factory)
/// @notice Cria contratos Grupo, gerencia convites e agrega saldos.
///         Chama o filho em três lugares: aceitarConvite (adicionarMembro),
///         resumoDoUsuario (saldoDe) e o modifier somenteMembroDoGrupo (ehMembro).
/// @dev ESQUELETO v0 (Fase 0): assinaturas, eventos e modifiers definitivos;
///      a lógica das funções marcadas com TODO entra na Fase 1.
contract FabricaDeGrupos {

    // Estado
    address[] public grupos;
    mapping(address => bool) public ehGrupo;
    mapping(address => address[]) private gruposDoUsuario;
    /// convitePendente[grupo][convidado]
    mapping(address => mapping(address => bool)) public convitePendente;

    // Eventos
    event GrupoCriado(address indexed grupo, address indexed criador, string nome);
    /// `convidado` é indexed para o front filtrar: filters.ConviteEnviado(null, meuEndereco)
    event ConviteEnviado(
        address indexed grupo,
        address indexed convidado,
        address indexed quemConvidou
    );

    // Modifiers
    modifier nomeValido(string calldata nome) {
        require(bytes(nome).length > 0, "Nome vazio");
        _;
    }

    modifier grupoExiste(address grupo) {
        require(ehGrupo[grupo], "Grupo inexistente");
        _;
    }

    /// Chamada fábrica -> filho: pergunta ao Grupo se msg.sender é membro.
    modifier somenteMembroDoGrupo(address grupo) {
        require(Grupo(grupo).ehMembro(msg.sender), "Somente membros");
        _;
    }

    modifier temConvite(address grupo) {
        require(convitePendente[grupo][msg.sender], "Sem convite");
        _;
    }

    // Escrita
    function criarGrupo(string calldata nome) external nomeValido(nome) {
        // Cria (faz deploy de) um novo contrato Grupo
        Grupo novoGrupo = new Grupo(nome, msg.sender, address(this));
        address enderecoGrupo = address(novoGrupo);

        // Registra o grupo na fábrica
        grupos.push(enderecoGrupo);
        ehGrupo[enderecoGrupo] = true;
        gruposDoUsuario[msg.sender].push(enderecoGrupo);

        // Avisa o front-end
        emit GrupoCriado(enderecoGrupo, msg.sender, nome);
    }

    function convidar(address grupo, address convidado)
        external
        grupoExiste(grupo)
        somenteMembroDoGrupo(grupo)
    {
        // TODO Fase 1:
        // convitePendente[grupo][convidado] = true;
        // emit ConviteEnviado(grupo, convidado, msg.sender);
    }

    function aceitarConvite(address grupo) external grupoExiste(grupo) temConvite(grupo) {
        // TODO Fase 1:
        // delete convitePendente[grupo][msg.sender];
        // Grupo(grupo).adicionarMembro(msg.sender);   // chamada fábrica -> filho
        // gruposDoUsuario[msg.sender].push(grupo);
    }

    // Leitura
    function getGruposDoUsuario(address u) external view returns (address[] memory) {
        return gruposDoUsuario[u];
    }

    function getTodosGrupos() external view returns (address[] memory) {
        return grupos;
    }

    /// @notice Para cada grupo de `u`, chama Grupo(g).saldoDe(u).
    function resumoDoUsuario(address u)
        external
        view
        returns (address[] memory gruposDoU, int256[] memory saldos)
    {
        // TODO Fase 1: laço em gruposDoUsuario[u] chamando Grupo(g).saldoDe(u)
    }
}
