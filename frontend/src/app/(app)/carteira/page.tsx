import { Suspense } from "react";

import { CarteiraView } from "@/features/carteira/carteira-view";

export default function CarteiraPage() {
  return (
    <Suspense fallback={null}>
      <CarteiraView />
    </Suspense>
  );
}
