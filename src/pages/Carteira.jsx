import FiiList from "../components/FiiList";
import { useFiis } from "../hooks/useFiis";

function Carteira() {
  const {fiis, setFiis} = useFiis();
  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">carteira</h1>
        <p className="text-muted">gerencie seus FIIs e FIAGROs</p>
      </header>
      <FiiList fiis={fiis} setFiis={setFiis} />
    </div>
  );
}

export default Carteira;