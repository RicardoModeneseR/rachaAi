// Para testes locais com npx hardhat node:
export const CHAIN_ID = 31337;
export const RPC_URL = "http://127.0.0.1:8545";

// Para Sepolia (descomentar após deploy final da Pessoa A):
// export const CHAIN_ID = 11155111;
// export const RPC_URL = import.meta.env.VITE_RPC_URL;

// Atualize com o endereço e o bloco impressos pelo scripts/deploy.js
export const ENDERECO_FABRICA = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
export const BLOCO_DEPLOY = 0;

export const REDES_CONFIG = {
  31337: {
    chainIdHex: "0x7a69",
    nome: "Hardhat Localhost",
    rpcUrls: ["http://127.0.0.1:8545"],
    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
  },
  11155111: {
    chainIdHex: "0xaa36a7",
    nome: "Sepolia Testnet",
    rpcUrls: ["https://rpc.sepolia.org"],
    nativeCurrency: { name: "SepoliaETH", symbol: "ETH", decimals: 18 },
  },
};