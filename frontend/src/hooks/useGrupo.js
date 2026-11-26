import { useState, useEffect, useCallback, useMemo } from "react";
import { ethers } from "ethers";
import toast from "react-hot-toast";
import FabricaArtifact from "../abi/FabricaDeGrupos.json";
import GrupoArtifact from "../abi/Grupo.json";
import { ENDERECO_FABRICA, BLOCO_DEPLOY, RPC_URL } from "../config";
import { abreviarEndereco, centavosParaReal, extrairErroRevert } from "../utils/formatadores";

const ABI_FABRICA = FabricaArtifact.abi || FabricaArtifact;
const ABI_GRUPO = GrupoArtifact.abi || GrupoArtifact;

export function useGrupo(enderecoGrupo, conta, signer) {
  const [nome, setNome] = useState("");
  const [membros, setMembros] = useState([]);
  const [dividas, setDividas] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const provider = useMemo(() => {
    const p = new ethers.JsonRpcProvider(RPC_URL);
    p.pollingInterval = 2000;
    return p;
  }, []);

  const grupoLeitura = useMemo(() => {
    if (!enderecoGrupo) return null;
    return new ethers.Contract(enderecoGrupo, ABI_GRUPO, provider);
  }, [enderecoGrupo, provider]);

  const fabricaLeitura = useMemo(() => {
    return new ethers.Contract(ENDERECO_FABRICA, ABI_FABRICA, provider);
  }, [provider]);

  const carregarDados = useCallback(async () => {
    if (!grupoLeitura) return;
    setCarregando(true);
    try {
      const [nomeGrupo, listaMembros] = await Promise.all([
        grupoLeitura.nome(),
        grupoLeitura.getMembros(),
      ]);
      setNome(nomeGrupo);

      // Saldos individuais
      const membrosComSaldo = await Promise.all(
        listaMembros.map(async (addr) => ({
          endereco: addr,
          saldo: await grupoLeitura.saldoDe(addr),
        }))
      );
      setMembros(membrosComSaldo);

      // Matriz de dívidas entre todos os pares (devedor -> credor)
      const listaDividas = [];
      for (const devedor of listaMembros) {
        for (const credor of listaMembros) {
          if (devedor.toLowerCase() === credor.toLowerCase()) continue;
          const valor = await grupoLeitura.divida(devedor, credor);
          if (valor > 0n) {
            listaDividas.push({ devedor, credor, valor });
          }
        }
      }
      setDividas(listaDividas);

      // Histórico via queryFilter a partir de BLOCO_DEPLOY
      const [evDespesas, evQuitacoes] = await Promise.all([
        grupoLeitura.queryFilter("DespesaAdicionada", BLOCO_DEPLOY),
        grupoLeitura.queryFilter("DividaQuitada", BLOCO_DEPLOY),
      ]);

      const itensHistorico = [
        ...evDespesas.map((ev) => ({
          tipo: "DESPESA",
          blockNumber: ev.blockNumber,
          logIndex: ev.index,
          txHash: ev.transactionHash,
          descricao: ev.args.descricao,
          pagador: ev.args.pagador,
          valor: ev.args.valor,
          participantes: ev.args.participantes,
        })),
        ...evQuitacoes.map((ev) => ({
          tipo: "QUITACAO",
          blockNumber: ev.blockNumber,
          logIndex: ev.index,
          txHash: ev.transactionHash,
          devedor: ev.args.devedor,
          credor: ev.args.credor,
          valor: ev.args.valor,
        })),
      ];

      // Mais recentes primeiro
      itensHistorico.sort((a, b) => {
        if (b.blockNumber !== a.blockNumber) return b.blockNumber - a.blockNumber;
        return b.logIndex - a.logIndex;
      });
      setHistorico(itensHistorico);
    } catch (err) {
      console.error("Erro ao carregar grupo:", err);
      toast.error("Não foi possível carregar os dados do grupo.");
    } finally {
      setCarregando(false);
    }
  }, [grupoLeitura]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // Listeners ao vivo do Grupo + cleanup obrigatório
  useEffect(() => {
    if (!grupoLeitura) return;

    const onDespesaAdicionada = async (_id, pagador, valor, descricao) => {
      toast(
        `${abreviarEndereco(pagador)} adicionou "${descricao} - ${centavosParaReal(valor)}"`,
        { icon: "💸" }
      );
      await carregarDados();
    };

    const onDividaQuitada = async (devedor, credor, valor) => {
      toast(
        `${abreviarEndereco(credor)} confirmou recebimento de ${centavosParaReal(valor)} de ${abreviarEndereco(devedor)}`,
        { icon: "✅" }
      );
      await carregarDados();
    };

    const onMembroAdicionado = async (novoMembro) => {
      toast(`${abreviarEndereco(novoMembro)} entrou no grupo!`, { icon: "👋" });
      await carregarDados();
    };

    grupoLeitura.on("DespesaAdicionada", onDespesaAdicionada);
    grupoLeitura.on("DividaQuitada", onDividaQuitada);
    grupoLeitura.on("MembroAdicionado", onMembroAdicionado);

    return () => {
      grupoLeitura.removeAllListeners();
    };
  }, [grupoLeitura, carregarDados]);

  const convidarMembro = async (enderecoConvidado) => {
    if (!signer) return false;
    const toastId = toast.loading("Aguardando confirmação...");
    try {
      const fabricaEscrita = fabricaLeitura.connect(signer);
      const tx = await fabricaEscrita.convidar(enderecoGrupo, enderecoConvidado.trim());
      await tx.wait();
      toast.success("Convite enviado!", { id: toastId });
      return true;
    } catch (err) {
      toast.error(extrairErroRevert(err), { id: toastId });
      return false;
    }
  };

  const adicionarDespesa = async (descricao, valorCentavos, participantes) => {
    if (!signer || !grupoLeitura) return false;
    const toastId = toast.loading("Aguardando confirmação...");
    try {
      const grupoEscrita = grupoLeitura.connect(signer);
      const tx = await grupoEscrita.adicionarDespesa(
        descricao.trim(),
        valorCentavos,
        participantes
      );
      await tx.wait();
      toast.dismiss(toastId);
      return true;
    } catch (err) {
      toast.error(extrairErroRevert(err), { id: toastId });
      return false;
    }
  };

  const confirmarQuitacao = async (devedor, valorCentavos) => {
    if (!signer || !grupoLeitura) return false;
    const toastId = toast.loading("Aguardando confirmação...");
    try {
      const grupoEscrita = grupoLeitura.connect(signer);
      const tx = await grupoEscrita.confirmarQuitacao(devedor, valorCentavos);
      await tx.wait();
      toast.dismiss(toastId);
      return true;
    } catch (err) {
      toast.error(extrairErroRevert(err), { id: toastId });
      return false;
    }
  };

  return {
    nome,
    membros,
    dividas,
    historico,
    carregando,
    convidarMembro,
    adicionarDespesa,
    confirmarQuitacao,
  };
}