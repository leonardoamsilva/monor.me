import FiiList from "../components/FiiList";
import { useFiis } from "../hooks/useFiis";

function Carteira() {
  const {fiis, setFiis} = useFiis();
  return (
    <div className="min-h-screen p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">carteira</h1>
        <p className="text-muted">gerencie seus fundos imobiliários</p>
      </header>
      <FiiList fiis={fiis} setFiis={setFiis} />
    </div>
  );
}

export default Carteira;