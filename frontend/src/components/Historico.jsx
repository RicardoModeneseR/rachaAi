import { abreviarEndereco, centavosParaReal } from "../utils/formatadores";

export function Historico({ itens }) {
  return (
    <section className="card">
      <h3>Histórico do Grupo</h3>
      {itens.length === 0 ? (
        <p className="texto-suave">Nenhuma movimentação registrada ainda.</p>
      ) : (
        <ul className="lista-simples">
          {itens.map((item, idx) => (
            <li key={`${item.txHash}-${idx}`} className="linha-historico">
              {item.tipo === "DESPESA" ? (
                <div>
                  <span className="tag-despesa">Despesa</span>{" "}
                  <strong>{item.descricao}</strong> —{" "}
                  <strong>{centavosParaReal(item.valor)}</strong>
                  <div className="meta-historico">
                    Pago por {abreviarEndereco(item.pagador)} •{" "}
                    {item.participantes.length} participante(s)
                  </div>
                </div>
              ) : (
                <div>
                  <span className="tag-quitacao">Quitação</span>{" "}
                  <strong>{abreviarEndereco(item.devedor)}</strong> pagou{" "}
                  <strong>{centavosParaReal(item.valor)}</strong> para{" "}
                  <strong>{abreviarEndereco(item.credor)}</strong>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}