const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FabricaDeGrupos", function () {
    // só a fábrica, sem grupos
    async function soFabrica() {
        const [membro1, membro2, membro3, estranho] = await ethers.getSigners();
        const fabrica = await ethers.deployContract("FabricaDeGrupos");
        return { fabrica, membro1, membro2, membro3, estranho };
    }

    // fabrica + 1 grupo criado pelo membro1 (único membro)
    async function fabricaComGrupo() {
        const { fabrica, membro1, membro2, membro3, estranho } = await soFabrica();

        await fabrica.connect(membro1).criarGrupo("Rep Teste");
        const [enderecoGrupo] = await fabrica.getTodosGrupos();
        // "Conecta" no grupo criado pela fábrica, usando a ABI do Grupo
        const grupo = await ethers.getContractAt("Grupo", enderecoGrupo);
        return { fabrica, grupo, enderecoGrupo, membro1, membro2, membro3, estranho };
    }

    describe("criarGrupo", function () {
        it("1. cria um grupo que aparece nas listas, com ehGrupo = true", async function () {
            const { fabrica, grupo, enderecoGrupo, membro1 } = await loadFixture(fabricaComGrupo);

            expect(await fabrica.getTodosGrupos()).to.deep.equal([enderecoGrupo]);
            expect(await fabrica.getGruposDoUsuario(membro1)).to.deep.equal([enderecoGrupo]);
            expect(await fabrica.ehGrupo(enderecoGrupo)).to.equal(true);

            // o Grupo nasceu com os dados certos
            expect(await grupo.nome()).to.equal("Rep Teste");
            expect(await grupo.criador()).to.equal(membro1.address);
            expect(await grupo.fabrica()).to.equal(await fabrica.getAddress());
            expect(await grupo.ehMembro(membro1)).to.equal(true); 
        });

        it("2. emite GrupoCriado com endereço, criador e nome corretos (E)", async function () {
            const { fabrica, membro1 } = await loadFixture(soFabrica);
            const tx = await fabrica.connect(membro1).criarGrupo("Rep da Vila");
            const [enderecoGrupo] = await fabrica.getTodosGrupos();

            await expect(tx)
                .to.emit(fabrica, "GrupoCriado")
                .withArgs(enderecoGrupo, membro1.address, "Rep da Vila");
        });

        it("3. reverte criarGrupo (M)", async function () {
            const { fabrica, membro1 } = await loadFixture(soFabrica);
            await expect(fabrica.connect(membro1).criarGrupo("")).to.be.revertedWith("Nome vazio");
        });
    });

    describe("Convites", function () {
        it("4. um não membro não consegue convidar (M)", async function () {
            const { fabrica, enderecoGrupo, membro2, estranho } = await loadFixture(fabricaComGrupo);

            await expect(
                fabrica.connect(estranho).convidar(enderecoGrupo, membro2)
            ).to.be.revertedWith("Somente membros");
        });

        it("5. convidar emite ConviteEnviado (E)", async function () {
            const { fabrica, enderecoGrupo, membro1, membro2 } = await loadFixture(fabricaComGrupo);

            await expect(fabrica.connect(membro1).convidar(enderecoGrupo, membro2))
                .to.emit(fabrica, "ConviteEnviado")
                .withArgs(enderecoGrupo, membro2.address, membro1.address);
            expect(await fabrica.convitePendente(enderecoGrupo, membro2)).to.equal(true);
        });

        it("6. aceitar sem convite reverte (M)", async function () {
            const { fabrica, enderecoGrupo, membro2 } = await loadFixture(fabricaComGrupo);

            await expect(
                fabrica.connect(membro2).aceitarConvite(enderecoGrupo)
            ).to.be.revertedWith("Sem convite");
        });

        it("7. aceitar torna o convidado membro no Grupo (fábrica chamou o filho) e apaga o convite", async function () {
            const { fabrica, grupo, enderecoGrupo, membro1, membro2 } = await loadFixture(fabricaComGrupo);
            await fabrica.connect(membro1).convidar(enderecoGrupo, membro2);
            
            // a transação vai para a Fábrica, mas o evento sai do Grupo
            await expect(fabrica.connect(membro2).aceitarConvite(enderecoGrupo))
                .to.emit(grupo, "MembroAdicionado")
                .withArgs(membro2.address);

            expect(await grupo.ehMembro(membro2)).to.equal(true);
            expect(await grupo.getMembros()).to.deep.equal([membro1.address, membro2.address]);
            expect(await fabrica.convitePendente(enderecoGrupo, membro2)).to.equal(false);
            expect(await fabrica.getGruposDoUsuario(membro2)).to.deep.equal([enderecoGrupo]);
        });

        it("8. não convida quem já é membro", async function () {
            const { fabrica, enderecoGrupo, membro1 } = await loadFixture(fabricaComGrupo);

            await expect(
                fabrica.connect(membro1).convidar(enderecoGrupo, membro1)
            ).to.be.revertedWith("Ja eh membro");
        });

        it("9. o convite só vale uma vez", async function () {
            const { fabrica, enderecoGrupo, membro1, membro2 } = await loadFixture(fabricaComGrupo);
            await fabrica.connect(membro1).convidar(enderecoGrupo, membro2);
            await fabrica.connect(membro2).aceitarConvite(enderecoGrupo);

            await expect(
                fabrica.connect(membro2).aceitarConvite(enderecoGrupo)
            ).to.be.revertedWith("Sem convite");
        });
    });

    describe("Proteções e leitura", function () {
        it("10. chamar adicionar membro direto no grupo, sem a fábrica, reverte (M, onlyFactory)", async function () {
            const { grupo, membro1, estranho } = await loadFixture(fabricaComGrupo);

            // nem um estranho, nem a própria criadora conseguem pular a fábrica
            await expect(
                grupo.connect(estranho).adicionarMembro(estranho)
            ).to.be.revertedWith("Somente a fabrica");
            await expect(
                grupo.connect(membro1).adicionarMembro(estranho)
            ).to.be.revertedWith("Somente a fabrica");
        });

        it("11. resumoDoUsuario devolve o saldo certo em dois grupos diferentes", async function () {
            const { fabrica, grupo: grupo1, enderecoGrupo: endereco1, membro1, membro2 } = await loadFixture(fabricaComGrupo);

            // Grupo 1 (criado pelo membro1): membro2 entra; membro1 paga R$ 100,00 para as duas
            await fabrica.connect(membro1).convidar(endereco1, membro2);
            await fabrica.connect(membro2).aceitarConvite(endereco1);
            await grupo1.connect(membro1).adicionarDespesa("Luz", 10000, [membro1, membro2]);

            // Grupo 2 (criado pelo membro2): membro1 entra; membro2 paga R$ 30,00 para as duas
            await fabrica.connect(membro2).criarGrupo("Viagem");
            const [, endereco2] = await fabrica.getTodosGrupos();
            const grupo2 = await ethers.getContractAt("Grupo", endereco2);
            await fabrica.connect(membro2).convidar(endereco2, membro1);
            await fabrica.connect(membro1).aceitarConvite(endereco2);
            await grupo2.connect(membro2).adicionarDespesa("Gasolina", 3000, [membro1, membro2]);

            const [grupos, saldos] = await fabrica.resumoDoUsuario(membro1);
            expect(grupos).to.deep.equal([endereco1, endereco2]);
            expect(saldos).to.deep.equal([5000n, -1500n]); // recebe 50,00 / deve 15,00
        });

        it("12. usar um endereço que não é grupo reverte (M)", async function () {
            const { fabrica, membro1, membro2, estranho } = await loadFixture(soFabrica);

            // um endereço qualquer
            await expect(
                fabrica.connect(membro1).convidar(estranho, membro2)
            ).to.be.revertedWith("Grupo inexistente");
            await expect(
                fabrica.connect(membro2).aceitarConvite(estranho)
            ).to.be.revertedWith("Grupo inexistente");

            // um contrato Grupo de verdade, mas que não foi criado por esta fábrica
            const grupoFalso = await ethers.deployContract("Grupo", [
                "Falso",
                estranho.address,
                estranho.address,
            ]);
            await expect(
                fabrica.connect(estranho).convidar(grupoFalso, membro2)
            ).to.be.revertedWith("Grupo inexistente");
        });
    });
});