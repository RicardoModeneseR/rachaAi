import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { abreviarEndereco, realParaCentavos } from "../utils/formatadores";

export function NovaDespesa({ membros, contaAtual, onAdicionar }) {
  const [descricao, setDescricao] = useState("");
  const [valorTexto, setValorTexto] = useState("");
  const [selecionados, setSelecionados] = useState([]);
  const [enviando, setEnviando] = useState(false);

  // Todos marcados por padrão sempre que a lista de membros atualiza
  useEffect(() => {
    setSelecionados(membros.map((m) => m.endereco));
  }, [membros]);

  const alternarParticipante = (addr) => {
    setSelecionados((prev) =>
      prev.includes(addr) ? prev.filter((item) => item !== addr) : [...prev, addr]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const centavos = realParaCentavos(valorTexto);
    if (!descricao.trim()) {
      toast.error("Informe a descrição da despesa.");
      return;
    }
    if (centavos <= 0n) {
      toast.error("Informe um valor maior que R$ 0,00.");
      return;
    }
    if (selecionados.length === 0) {
      toast.error("Selecione pelo menos um participante.");
      return;
    }

    setEnviando(true);
    const ok = await onAdicionar(descricao, centavos, selecionados);
    setEnviando(false);
    if (ok) {
      setDescricao("");
      setValorTexto("");
    }
  };

  return (
    <section className="card">
      <h3>Nova Despesa</h3>
      <form onSubmit={handleSubmit} className="form-vertical">
        <input
          type="text"
          placeholder="Descrição (ex: Conta de luz)"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />
        <input
          type="text"
          placeholder="Valor em R$ (ex: 120,00)"
          value={valorTexto}
          onChange={(e) => setValorTexto(e.target.value)}
        />

        <div className="lista-checkboxes">
          <small>Dividir entre:</small>
          {membros.map((m) => (
            <label key={m.endereco} className="checkbox-item">
              <input
                type="checkbox"
                checked={selecionados.includes(m.endereco)}
                onChange={() => alternarParticipante(m.endereco)}
              />
              <span>
                {abreviarEndereco(m.endereco)}
                {m.endereco.toLowerCase() === contaAtual?.toLowerCase()
                  ? " (você)"
                  : ""}
              </span>
            </label>
          ))}
        </div>

        <button className="btn-primario" type="submit" disabled={enviando}>
          {enviando ? "Registrando..." : "Registrar Despesa"}
        </button>
      </form>
    </section>
  );
}