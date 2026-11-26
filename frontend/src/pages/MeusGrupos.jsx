import { useState } from "react";
import { Link } from "react-router-dom";
import { useFabrica } from "../hooks/useFabrica";
import { abreviarEndereco, centavosParaReal } from "../utils/formatadores";

export function MeusGrupos({ conta, signer }) {
  const { grupos, convites, carregando, criarGrupo, aceitarConvite } =
    useFabrica(conta, signer);
  const [nomeGrupo, setNomeGrupo] = useState("");
  const [criando, setCriando] = useState(false);

  const handleCriar = async (e) => {
    e.preventDefault();
    if (!nomeGrupo.trim()) return;
    setCriando(true);
    const ok = await criarGrupo(nomeGrupo);
    setCriando(false);
    if (ok) setNomeGrupo("");
  };

  return (
    <main className="container">
      <section className="card">
        <h2>Criar Novo Grupo</h2>
        <form onSubmit={handleCriar} className="form-inline">
          <input
            type="text"
            placeholder="Nome da república ou grupo (ex: Rep do Bairro)"
            value={nomeGrupo}
            onChange={(e) => setNomeGrupo(e.target.value)}
          />
          <button className="btn-primario" type="submit" disabled={criando}>
            {criando ? "Criando..." : "Criar Grupo"}
          </button>
        </form>
      </section>

      {convites.length > 0 && (
        <section className="card destaque-convite">
          <h2>Convites Pendentes ({convites.length})</h2>
          <ul className="lista-simples">
            {convites.map((c) => (
              <li key={c.endereco} className="linha-divida">
                <div>
                  <strong>{c.nome}</strong>{" "}
                  <small className="texto-suave">
                    ({abreviarEndereco(c.endereco)})
                  </small>
                </div>
                <button
                  className="btn-sucesso-sm"
                  onClick={() => aceitarConvite(c.endereco)}
                >
                  Aceitar Convite
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2>Meus Grupos</h2>
        {carregando ? (
          <p>Carregando grupos...</p>
        ) : grupos.length === 0 ? (
          <p className="texto-suave">
            Você ainda não participa de nenhum grupo.
          </p>
        ) : (
          <div className="grid-grupos">
            {grupos.map((g) => {
              const positivo = g.saldo > 0n;
              const negativo = g.saldo < 0n;
              return (
                <Link
                  to={`/grupo/${g.endereco}`}
                  key={g.endereco}
                  className="card-grupo"
                >
                  <h3>{g.nome}</h3>
                  <small className="texto-suave">
                    {abreviarEndereco(g.endereco)}
                  </small>
                  <p
                    className={`saldo ${
                      positivo ? "positivo" : negativo ? "negativo" : ""
                    }`}
                  >
                    Seu saldo: {centavosParaReal(g.saldo)}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}