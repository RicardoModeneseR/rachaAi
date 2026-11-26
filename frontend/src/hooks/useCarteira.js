import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import toast from "react-hot-toast";
import { CHAIN_ID, REDES_CONFIG } from "../config";

export function useCarteira() {
  const [conta, setConta] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [signer, setSigner] = useState(null);

  const redeAlvo = REDES_CONFIG[CHAIN_ID];
  const redeCorreta = chainId === CHAIN_ID;

  const atualizarEstadoCarteira = useCallback(async () => {
    if (!window.ethereum) return;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contas = await provider.listAccounts();
      const network = await provider.getNetwork();
      setChainId(Number(network.chainId));

      if (contas.length > 0) {
        const s = await provider.getSigner();
        setSigner(s);
        setConta(await s.getAddress());
      } else {
        setSigner(null);
        setConta(null);
      }
    } catch (err) {
      console.error("Erro ao ler carteira:", err);
    }
  }, []);

  const conectar = async () => {
    if (!window.ethereum) {
      toast.error("MetaMask não encontrada. Instale a extensão no navegador.");
      return;
    }
    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      await atualizarEstadoCarteira();
    } catch (err) {
      toast.error("Conexão recusada na MetaMask.");
    }
  };

  const trocarRede = async () => {
    if (!window.ethereum || !redeAlvo) return;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: redeAlvo.chainIdHex }],
      });
    } catch (err) {
      // Erro 4902: rede ainda não cadastrada na MetaMask (comum para Hardhat 31337)
      if (err.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: redeAlvo.chainIdHex,
                chainName: redeAlvo.nome,
                rpcUrls: redeAlvo.rpcUrls,
                nativeCurrency: redeAlvo.nativeCurrency,
              },
            ],
          });
        } catch {
          toast.error(`Não foi possível adicionar a rede ${redeAlvo.nome}.`);
        }
      } else {
        toast.error(`Troque manualmente para ${redeAlvo.nome} na MetaMask.`);
      }
    }
  };

  useEffect(() => {
    atualizarEstadoCarteira();
    if (!window.ethereum) return;

    const onAccountsChanged = () => atualizarEstadoCarteira();
    const onChainChanged = () => atualizarEstadoCarteira();

    window.ethereum.on("accountsChanged", onAccountsChanged);
    window.ethereum.on("chainChanged", onChainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", onAccountsChanged);
      window.ethereum.removeListener("chainChanged", onChainChanged);
    };
  }, [atualizarEstadoCarteira]);

  return {
    conta,
    chainId,
    redeCorreta,
    nomeRedeEsperada: redeAlvo?.nome || `Chain ${CHAIN_ID}`,
    signer,
    conectar,
    trocarRede,
  };
}