import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useCarteira } from "./hooks/useCarteira";
import { Cabecalho } from "./components/Cabecalho";
import { ConectarCarteira } from "./components/ConectarCarteira";
import { MeusGrupos } from "./pages/MeusGrupos";
import { Grupo } from "./pages/Grupo";
import "./App.css";

export default function App() {
  const {
    conta,
    redeCorreta,
    nomeRedeEsperada,
    signer,
    conectar,
    trocarRede,
  } = useCarteira();

  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Cabecalho
        conta={conta}
        redeCorreta={redeCorreta}
        nomeRedeEsperada={nomeRedeEsperada}
        onConectar={conectar}
        onTrocarRede={trocarRede}
      />

      {!conta || !redeCorreta ? (
        <ConectarCarteira
          conta={conta}
          redeCorreta={redeCorreta}
          nomeRedeEsperada={nomeRedeEsperada}
          onConectar={conectar}
          onTrocarRede={trocarRede}
        />
      ) : (
        <Routes>
          <Route
            path="/"
            element={<MeusGrupos conta={conta} signer={signer} />}
          />
          <Route
            path="/grupo/:endereco"
            element={<Grupo conta={conta} signer={signer} />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </BrowserRouter>
  );
}