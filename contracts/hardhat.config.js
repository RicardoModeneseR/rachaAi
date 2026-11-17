require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ quiet: true });

const { SEPOLIA_RPC_URL, PRIVATE_KEY, ETHERSCAN_API_KEY } = process.env;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    // `npx hardhat node` sobe esta rede em localhost:8545 (chainId 31337)
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    sepolia: {
      url: SEPOLIA_RPC_URL || "",
      // Sem .env, a lista fica vazia: os testes locais continuam rodando
      // e só o deploy na Sepolia falha, com uma mensagem clara.
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 11155111,
    },
  },
  etherscan: {
    // API V2 do Etherscan: uma única chave serve para todas as redes.
    apiKey: ETHERSCAN_API_KEY || "",
  },
};
