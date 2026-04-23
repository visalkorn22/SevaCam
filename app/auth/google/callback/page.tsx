import { Suspense } from "react";

import GoogleCallbackClient from "./callback-client";

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <GoogleCallbackClient />
    </Suspense>
  );
}
