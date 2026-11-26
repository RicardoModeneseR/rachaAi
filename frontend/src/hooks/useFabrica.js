import { useState, useEffect, useCallback, useMemo } from "react";
import { ethers } from "ethers";
import toast from "react-hot-toast";
import FabricaArtifact from "../abi/FabricaDeGrupos.json";
import GrupoArtifact from "../abi/Grupo.json";
import { ENDERECO_FABRICA, BLOCO_DEPLOY, RPC_URL } from "../config";
import { extrairErroRevert } from "../utils/formatadores";

const ABI_FABRICA = FabricaArtifact.abi || FabricaArtifact;
const ABI_GRUPO = GrupoArtifact.abi || GrupoArtifact;

export function useFabrica(conta, signer) {
  const [grupos, setGrupos] = useState([]);
  const [convites, setConvites] = useState([]);
  const [carregando, setCarregando] = useState(false);

  const provider = useMemo(() => {
    const p = new ethers.JsonRpcProvider(RPC_URL);
    p.pollingInterval = 2000;
    return p;
  }, []);

  const fabricaLeitura = useMemo(() => {
    return new ethers.Contract(ENDERECO_FABRICA, ABI_FABRICA, provider);
  }, [provider]);

  const carregarDados = useCallback(async () => {
    if (!conta) {
      setGrupos([]);
      setConvites([]);
      return;
    }
    setCarregando(true);
    try {
      // 1. Carrega grupos do usuário e seus respectivos saldos
      const [enderecos, saldos] = await fabricaLeitura.resumoDoUsuario(conta);
      const listaGrupos = await Promise.all(
        enderecos.map(async (addr, idx) => {
          const grupoContract = new ethers.Contract(addr, ABI_GRUPO, provider);
          const nome = await grupoContract.nome();
          return {
            endereco: addr,
            nome,
            saldo: saldos[idx],
          };
        })
      );
      setGrupos(listaGrupos);

      // 2. Busca ConviteEnviado desde BLOCO_DEPLOY e valida convitePendente
      const eventos = await fabricaLeitura.queryFilter(
        "ConviteEnviado",
        BLOCO_DEPLOY
      );
      const gruposCandidatos = [
        ...new Set(
          eventos
            .filter(
              (ev) =>
                ev.args?.convidado?.toLowerCase() === conta.toLowerCase()
            )
            .map((ev) => ev.args.grupo)
        ),
      ];

      const pendentes = [];
      for (const addrGrupo of gruposCandidatos) {
        const aindaPendente = await fabricaLeitura.convitePendente(
          addrGrupo,
          conta
        );
        if (aindaPendente) {
          const grupoContract = new ethers.Contract(
            addrGrupo,
            ABI_GRUPO,
            provider
          );
          const nome = await grupoContract.nome();
          pendentes.push({ endereco: addrGrupo, nome });
        }
      }
      setConvites(pendentes);
    } catch (err) {
      console.error("Erro ao carregar dados da fábrica:", err);
    } finally {
      setCarregando(false);
    }
  }, [conta, fabricaLeitura, provider]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // Listeners ao vivo na tela Meus Grupos + cleanup ao sair
  useEffect(() => {
    if (!conta) return;

    const onConviteEnviado = async (grupoAddr, convidado) => {
      if (convidado.toLowerCase() === conta.toLowerCase()) {
        toast("Você recebeu um novo convite de grupo!", { icon: "📩" });
        await carregarDados();
      }
    };

    const onGrupoCriado = async (_grupo, criador, nome) => {
      if (criador.toLowerCase() === conta.toLowerCase()) {
        toast.success(`Grupo "${nome}" criado!`);
        await carregarDados();
      }
    };

    fabricaLeitura.on("ConviteEnviado", onConviteEnviado);
    fabricaLeitura.on("GrupoCriado", onGrupoCriado);

    return () => {
      fabricaLeitura.removeAllListeners();
    };
  }, [conta, fabricaLeitura, carregarDados]);

  const criarGrupo = async (nome) => {
    if (!signer) return false;
    const toastId = toast.loading("Aguardando confirmação...");
    try {
      const fabricaEscrita = fabricaLeitura.connect(signer);
      const tx = await fabricaEscrita.criarGrupo(nome.trim());
      await tx.wait();
      toast.dismiss(toastId);
      await carregarDados();
      return true;
    } catch (err) {
      toast.error(extrairErroRevert(err), { id: toastId });
      return false;
    }
  };

  const aceitarConvite = async (enderecoGrupo) => {
    if (!signer) return false;
    const toastId = toast.loading("Aguardando confirmação...");
    try {
      const fabricaEscrita = fabricaLeitura.connect(signer);
      const tx = await fabricaEscrita.aceitarConvite(enderecoGrupo);
      await tx.wait();
      toast.success("Convite aceito!", { id: toastId });
      await carregarDados();
      return true;
    } catch (err) {
      toast.error(extrairErroRevert(err), { id: toastId });
      return false;
    }
  };

  return {
    grupos,
    convites,
    carregando,
    criarGrupo,
    aceitarConvite,
    recarregar: carregarDados,
  };
}