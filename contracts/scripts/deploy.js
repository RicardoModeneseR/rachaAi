// Faz o deploy da FabricaDeGrupos e imprime o que o front precisa
// Local: npx hardhat run scripts/deploy.js --network localhost
// Sepolia: npx hardhat run scripts/deploy.js --network sepolia
const hre = require("hardhat");

async function main() {
    const { ethers, network } = hre;

    // Quem está fazendo o deploy (o dono da FabricaDeGrupos)
    const [deployer] = await ethers.getSigners();
    const { chainId } = await ethers.provider.getNetwork();
    const saldo = await ethers.provider.getBalance(deployer.address);

    console.log(`Rede: ${network.name} (chainId=${chainId})`);
    console.log(`Conta: ${deployer.address}`);
    console.log(`Saldo: ${ethers.formatEther(saldo)} ETH\n`);

    // Deploy da FabricaDeGrupos
    const fabrica = await ethers.deployContract("FabricaDeGrupos");
    await fabrica.waitForDeployment();
    const endereco = await fabrica.getAddress();

    // Esperar confirmações e pegar o número do bloco
    const confirmacoes = network.name === "sepolia" ? 5 : 1;
    console.log(`Aguardando ${confirmacoes} confirmações...`);
    const recibo = await fabrica.deploymentTransaction().wait(confirmacoes);

    // Imprimir os valores do config.js do front
    console.log("\nFabricaDeGrupos implantada!\n");
    console.log(`ENDERECO_FABRICA = "${endereco}"`);
    console.log(`BLOCO_DEPLOY     = ${recibo.blockNumber}`);
    console.log(`CHAIN_ID         = ${chainId}`);

    if(network.name === "sepolia") {
        console.log(`\nEtherscan: https://sepolia.etherscan.io/address/${endereco}`);
        console.log(`Verificar: npx hardhat verify --network sepolia ${endereco}`);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});