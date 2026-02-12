import { useEffect, useState } from "react";

export function useFiis() {
  const [fiis, setFiis] = useState(() => {
    const storedFiis = localStorage.getItem("monor:fiis");
    return storedFiis ? JSON.parse(storedFiis) : [];
  });

  useEffect(() => {
    localStorage.setItem("monor:fiis", JSON.stringify(fiis));
  }, [fiis]);

  

  return {
    fiis,
  setFiis
  }
  }