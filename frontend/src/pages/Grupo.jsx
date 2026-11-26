import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useGrupo } from "../hooks/useGrupo";
import { NovaDespesa } from "../components/NovaDespesa";
import { QuemDeveAQuem } from "../components/QuemDeveAQuem";
import { Historico } from "../components/Historico";
import { abreviarEndereco, centavosParaReal } from "../utils/formatadores";

export function Grupo({ conta, signer }) {
  const { endereco } = useParams();
  const {
    nome,
    membros,
    dividas,
    historico,
    carregando,
    convidarMembro,
    adicionarDespesa,
    confirmarQuitacao,
  } = useGrupo(endereco, conta, signer);

  const [novoConvidado, setNovoConvidado] = useState("");
  const [convidando, setConvidando] = useState(false);

  const handleConvidar = async (e) => {
    e.preventDefault();
    if (!novoConvidado.trim()) return;
    setConvidando(true);
    const ok = await convidarMembro(novoConvidado);
    setConvidando(false);
    if (ok) setNovoConvidado("");
  };

  if (carregando && !nome) {
    return (
      <main className="container">
        <p>Carregando detalhes do grupo...</p>
      </main>
    );
  }

  return (
    <main className="container">
      <div className="topo-grupo">
        <Link to="/" className="link-voltar">
          ← Voltar para Meus Grupos
        </Link>
        <h2>{nome}</h2>
        <small className="texto-suave">{endereco}</small>
      </div>

      <section className="card">
        <h3>Membros e Saldos ({membros.length}/20)</h3>
        <ul className="lista-simples">
          {membros.map((m) => {
            const positivo = m.saldo > 0n;
            const negativo = m.saldo < 0n;
            return (
              <li key={m.endereco} className="linha-divida">
                <span>
                  {abreviarEndereco(m.endereco)}
                  {m.endereco.toLowerCase() === conta?.toLowerCase()
                    ? " (você)"
                    : ""}
                </span>
                <strong
                  className={`saldo ${
                    positivo ? "positivo" : negativo ? "negativo" : ""
                  }`}
                >
                  {centavosParaReal(m.saldo)}
                </strong>
              </li>
            );
          })}
        </ul>

        <form onSubmit={handleConvidar} className="form-inline mt-1">
          <input
            type="text"
            placeholder="Endereço 0x... para convidar"
            value={novoConvidado}
            onChange={(e) => setNovoConvidado(e.target.value)}
          />
          <button className="btn-primario" type="submit" disabled={convidando}>
            {convidando ? "Enviando..." : "Convidar"}
          </button>
        </form>
      </section>

      <div className="grid-duas-colunas">
        <NovaDespesa
          membros={membros}
          contaAtual={conta}
          onAdicionar={adicionarDespesa}
        />
        <QuemDeveAQuem
          dividas={dividas}
          contaAtual={conta}
          onConfirmarQuitacao={confirmarQuitacao}
        />
      </div>

      <Historico itens={historico} />
    </main>
  );
}