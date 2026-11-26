export function centavosParaReal(valor) {
  if (valor === undefined || valor === null) return "R$ 0,00";
  const centavos = BigInt(valor);
  const negativo = centavos < 0n;
  const abs = negativo ? -centavos : centavos;

  const reais = abs / 100n;
  const resto = (abs % 100n).toString().padStart(2, "0");
  const reaisFormatado = reais.toLocaleString("pt-BR");

  return `${negativo ? "-" : ""}R$ ${reaisFormatado},${resto}`;
}

export function realParaCentavos(texto) {
  if (!texto) return 0n;
  const limpo = String(texto).trim().replace(/\./g, "").replace(",", ".");
  const numero = Number(limpo);
  if (Number.isNaN(numero) || numero <= 0) return 0n;
  return BigInt(Math.round(numero * 100));
}

export function abreviarEndereco(endereco) {
  if (!endereco || endereco.length < 10) return endereco || "";
  return `${endereco.slice(0, 6)}...${endereco.slice(-4)}`;
}

export function extrairErroRevert(erro) {
  if (!erro) return "Erro desconhecido na transação.";
  if (erro.code === "ACTION_REJECTED") {
    return "Transação rejeitada na MetaMask.";
  }

  // Desembrulha erros aninhados da MetaMask / Hardhat (causa do "could not coalesce error")
  const msgInterna =
    erro.error?.data?.message ||
    erro.error?.message ||
    erro.info?.error?.data?.message ||
    erro.info?.error?.message ||
    erro.reason ||
    erro.shortMessage ||
    erro.message ||
    "";

  if (msgInterna.includes("Nonce too high")) {
    return "Nonce desatualizado na MetaMask. Vá em Configurações > Avançado > Limpar dados da guia de atividade.";
  }

  const match = msgInterna.match(/reverted with reason string '([^']+)'/);
  if (match) return match[1];

  return msgInterna || "Falha ao executar transação no contrato.";
}