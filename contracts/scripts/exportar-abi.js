// Copia a ABI dos contratos compilados para frontend/src/abi.
// Uso: npm run abi   (compila antes e depois copia)
const fs = require("fs");
const path = require("path");

const CONTRATOS = ["FabricaDeGrupos", "Grupo"];
const DESTINO = path.join(__dirname, "..", "..", "frontend", "src", "abi");

fs.mkdirSync(DESTINO, { recursive: true });

for (const nome of CONTRATOS) {
  const artefato = path.join(
    __dirname, "..", "artifacts", "contracts", `${nome}.sol`, `${nome}.json`
  );
  const { contractName, abi } = JSON.parse(fs.readFileSync(artefato, "utf8"));
  // O front só precisa da ABI; o bytecode fica de fora para o arquivo ser pequeno.
  fs.writeFileSync(
    path.join(DESTINO, `${nome}.json`),
    JSON.stringify({ contractName, abi }, null, 2) + "\n"
  );
  console.log(`ABI de ${nome} -> frontend/src/abi/${nome}.json`);
}
