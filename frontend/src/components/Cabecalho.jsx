import { Link } from "react-router-dom";
import { abreviarEndereco } from "../utils/formatadores";

export function Cabecalho({
  conta,
  redeCorreta,
  nomeRedeEsperada,
  onConectar,
  onTrocarRede,
}) {
  return (
    <header className="cabecalho">
      <Link to="/" className="logo">
        RachaAí
      </Link>

      <div className="status-carteira">
        {conta && (
          <>
            <span className={`badge-rede ${redeCorreta ? "ok" : "erro"}`}>
              {redeCorreta ? nomeRedeEsperada : "Rede Incorreta"}
            </span>
            {!redeCorreta && (
              <button className="btn-alerta-sm" onClick={onTrocarRede}>
                Trocar Rede
              </button>
            )}
            <span className="endereco-pill">{abreviarEndereco(conta)}</span>
          </>
        )}
        {!conta && (
          <button className="btn-primario" onClick={onConectar}>
            Conectar
          </button>
        )}
      </div>
    </header>
  );
}