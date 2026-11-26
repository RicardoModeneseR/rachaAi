import { abreviarEndereco, centavosParaReal } from "../utils/formatadores";

export function QuemDeveAQuem({ dividas, contaAtual, onConfirmarQuitacao }) {
  return (
    <section className="card">
      <h3>Quem Deve a Quem</h3>
      {dividas.length === 0 ? (
        <p className="texto-suave">Nenhuma dívida pendente no grupo.</p>
      ) : (
        <ul className="lista-simples">
          {dividas.map((d) => {
            const souCredor =
              d.credor.toLowerCase() === contaAtual?.toLowerCase();
            return (
              <li key={`${d.devedor}-${d.credor}`} className="linha-divida">
                <span>
                  <strong>{abreviarEndereco(d.devedor)}</strong> deve{" "}
                  <strong>{centavosParaReal(d.valor)}</strong> para{" "}
                  <strong>{abreviarEndereco(d.credor)}</strong>
                </span>

                {souCredor && (
                  <button
                    className="btn-sucesso-sm"
                    onClick={() => onConfirmarQuitacao(d.devedor, d.valor)}
                  >
                    Confirmar que recebi
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}