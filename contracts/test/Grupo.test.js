const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Grupo", function () {
    // Cenário base: Grupo com 3 membros.
    // Uma conta comum faz o papel da fábrica, para testar o Grupo isolado.
    async function grupoComTresMembros() {
        const [fabrica, membro1, membro2, membro3, estranho] = await ethers.getSigners();
        const grupo = await ethers.deployContract("Grupo", [
            "Rep Teste",
            membro1.address,
            fabrica.address,
        ]);
        await grupo.connect(fabrica).adicionarMembro(membro2.address);
        await grupo.connect(fabrica).adicionarMembro(membro3.address);
        return { grupo, fabrica, membro1, membro2, membro3, estranho };
    }

    // Soma o saldoDe de todos os membros (deve dar sempre zero)
    async function somaDosSaldos(grupo) {
        let soma = 0n;
        for (const membro of await grupo.getMembros()) {
            soma += await grupo.saldoDe(membro);
        }
        return soma;
    }

    describe("Membros", function () {
        it("O criador do grupo é o primeiro membro", async function () {
            const [fabrica, membro1] = await ethers.getSigners();
            const grupo = await ethers.deployContract("Grupo", [
                "Rep",
                membro1.address,
                fabrica.address,
            ]);

            await expect(grupo.deploymentTransaction())
            .to.emit(grupo, "MembroAdicionado")
            .withArgs(membro1.address);
            expect(await grupo.ehMembro(membro1.address)).to.equal(true);
            expect(await grupo.getMembros()).to.deep.equal([membro1.address]);
            expect(await grupo.criador()).to.equal(membro1.address);
            expect(await grupo.fabrica()).to.equal(fabrica.address);
        });

        it("Reverte ao passar de 20 membros", async function () {
            const { grupo, fabrica } = await loadFixture(grupoComTresMembros);

            // Já tem 3 membros, vamos adicionar 17
            for (let i=0; i < 17; i++) {
                await grupo.connect(fabrica).adicionarMembro(ethers.Wallet.createRandom().address);
            }
            expect((await grupo.getMembros()).length).to.equal(20);

            await expect(grupo.connect(fabrica).adicionarMembro(ethers.Wallet.createRandom().address))
                .to.be.revertedWith("Grupo cheio");
        });

        it("Não adiciona quem já é membro", async function () {
            const { grupo, fabrica, membro2 } = await loadFixture(grupoComTresMembros);
            await expect(grupo.connect(fabrica).adicionarMembro(membro2.address))
                .to.be.revertedWith("Ja eh membro");
        });
    });

    describe("Despesas", function () {
        it("R$ 90,00 entre 3 pessoas gera divida de 3000 centavos para cada", async function () {
            const { grupo, membro1, membro2, membro3 } = await loadFixture(grupoComTresMembros);

            await grupo.connect(membro1).adicionarDespesa("Mercado", 9000, [membro1, membro2, membro3]);

            expect(await grupo.divida(membro2, membro1)).to.equal(3000);
            expect(await grupo.divida(membro3, membro1)).to.equal(3000);
            expect(await grupo.divida(membro1, membro1)).to.equal(0);
            expect(await grupo.saldoDe(membro1)).to.equal(6000);
            expect(await grupo.saldoDe(membro2)).to.equal(-3000);
        });

        it("R$ 100,00 entre 3 pessoas gera divida de 3333 centavos para cada (o resto fica com o pagador)", async function () {
            const { grupo, membro1, membro2, membro3 } = await loadFixture(grupoComTresMembros);

            await grupo.connect(membro1).adicionarDespesa("Mercado", 10000, [membro1, membro2, membro3]);

            expect(await grupo.divida(membro2, membro1)).to.equal(3333);
            expect(await grupo.divida(membro3, membro1)).to.equal(3333);
            expect(await grupo.saldoDe(membro1)).to.equal(6666);
            expect(await grupo.saldoDe(membro3)).to.equal(-3333);
        });

        it("Pagador fora da lista recebe a parte inteira de cada um", async function () {
            const { grupo, membro1, membro2, membro3 } = await loadFixture(grupoComTresMembros);

            await grupo.connect(membro1).adicionarDespesa("Mercado", 9000, [membro2, membro3]);

            expect(await grupo.divida(membro2, membro1)).to.equal(4500);
            expect(await grupo.divida(membro3, membro1)).to.equal(4500);
            expect(await grupo.saldoDe(membro1)).to.equal(9000);
        });

        it("Emite DespesaAdicionada com os valores corretos", async function () {
            const { grupo, membro1, membro2, membro3 } = await loadFixture(grupoComTresMembros);
            const participantes = [membro1.address, membro2.address, membro3.address];

            await expect(grupo.connect(membro1).adicionarDespesa("Mercado", 9000, participantes))
                .to.emit(grupo, "DespesaAdicionada")
                .withArgs(0, membro1.address, 9000, "Mercado", participantes);
            
            // e a despesa ficou guardada
            expect(await grupo.totalDespesas()).to.equal(1);
            const [despesa] = await grupo.getDespesas();
            expect(despesa.descricao).to.equal("Mercado");
            expect(despesa.valor).to.equal(9000);
            expect(despesa.pagador).to.equal(membro1.address);
            expect(despesa.participantes).to.deep.equal(participantes);
        });

        it("Reverte com valor 0, não membro chamado ou participante que não é membro", async function () {
            const { grupo, membro1, membro2, estranho } = await loadFixture(grupoComTresMembros);
            
            await expect(
                grupo.connect(membro1).adicionarDespesa("Nada", 0, [membro1, membro2])
            ).to.be.revertedWith("Valor deve ser positivo");

            await expect(
                grupo.connect(estranho).adicionarDespesa("Invasão", 1000, [membro1, membro2])
            ).to.be.revertedWith("Somente membros");

            await expect(
                grupo.connect(membro1).adicionarDespesa("Furada", 1000, [membro1, estranho])
            ).to.be.revertedWith("Participante nao eh membro");
        });

        it("Reverte com lista vazia ou participante repetido", async function () {
            const { grupo, membro1, membro2 } = await loadFixture(grupoComTresMembros);

            await expect(
                grupo.connect(membro1).adicionarDespesa("Nada", 1000, [])
            ).to.be.revertedWith("Sem participantes");

            // sem essa regra, membro2 pagaria duas vezes a mesma despesa
            await expect(
                grupo.connect(membro1).adicionarDespesa("Golpe", 1000, [membro1, membro2, membro2])
            ).to.be.revertedWith("Participantes repetidos");
        });
    });

    describe("Quitações", function () {
        it("confirmarQuitacao desconta a dívida e emite DividaQuitada", async function () {
            const { grupo, membro1, membro2, membro3 } = await loadFixture(grupoComTresMembros);
            await grupo.connect(membro1).adicionarDespesa("Mercado", 9000, [membro1, membro2, membro3]);

            // membro1 (criador) confirma que recebeu R$ 10,00 da bia
            await expect(grupo.connect(membro1).confirmarQuitacao(membro2.address, 1000))
                .to.emit(grupo, "DividaQuitada")
                .withArgs(membro2.address, membro1.address, 1000);
            expect(await grupo.divida(membro2, membro1)).to.equal(2000);

            // e depois o resto, zerando a dívida
            await grupo.connect(membro1).confirmarQuitacao(membro2.address, 2000);
            expect(await grupo.divida(membro2, membro1)).to.equal(0);
            expect(await grupo.saldoDe(membro2)).to.equal(0);
        });

        it("Reverte ao quitar mais do que se deve", async function () {
            const { grupo, membro1, membro2, membro3 } = await loadFixture(grupoComTresMembros);
            await grupo.connect(membro1).adicionarDespesa("Mercado", 9000, [membro1, membro2, membro3]);

            await expect(
                grupo.connect(membro1).confirmarQuitacao(membro2.address, 3001)
            ).to.be.revertedWith("Valor maior que a divida");
        });

        it("A soma de saldoDe de todos os membros é zero após várias despesas e quitações", async function () {
            const { grupo, membro1, membro2, membro3 } = await loadFixture(grupoComTresMembros);

            await grupo.connect(membro1).adicionarDespesa("Luz", 10000, [membro1, membro2, membro3]); // com resto
            expect(await somaDosSaldos(grupo)).to.equal(0);

            await grupo.connect(membro2).adicionarDespesa("Pizza", 4550, [membro1, membro3]); // pagador fora
            await grupo.connect(membro3).adicionarDespesa("Gás", 12001, [membro1, membro2, membro3]); // com resto
            await grupo.connect(membro1).confirmarQuitacao(membro2, 1000); // quitando parte da dívida membro2 -> membro1
            await grupo.connect(membro2).confirmarQuitacao(membro3, 2275); // quitando dívida inteira membro3 -> membro2

            expect(await somaDosSaldos(grupo)).to.equal(0);
        });

        it("O devedor não consegue apagar a própria dívida", async function () {
            const { grupo, membro1, membro2, membro3 } = await loadFixture(grupoComTresMembros);
            await grupo.connect(membro1).adicionarDespesa("Mercado", 9000, [membro1, membro2, membro3]);

            // membro2 (devedor) tenta "confirmar" o pagamento no lugar do membro1
            await expect(
                grupo.connect(membro2).confirmarQuitacao(membro1.address, 3000)
            ).to.be.revertedWith("Valor maior que a divida");
            expect(await grupo.divida(membro2, membro1)).to.equal(3000);
        });
    });
});