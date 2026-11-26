export function ConectarCarteira({
  conta,
  redeCorreta,
  nomeRedeEsperada,
  onConectar,
  onTrocarRede,
}) {
  return (
    <div className="tela-conexao">
      <div className="card-conexao">
        <h1>RachaAí</h1>
        <p>Divisão de despesas de república registrada na blockchain.</p>

        {!conta ? (
          <button className="btn-primario" onClick={onConectar}>
            Conectar MetaMask
          </button>
        ) : !redeCorreta ? (
          <div>
            <p className="aviso-rede">
              Sua carteira está conectada na rede errada.
            </p>
            <button className="btn-alerta" onClick={onTrocarRede}>
              Trocar para {nomeRedeEsperada}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}