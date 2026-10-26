import { Suspense } from "react";
import WallPage from "@/components/WallPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <WallPage />
    </Suspense>
  );
}
