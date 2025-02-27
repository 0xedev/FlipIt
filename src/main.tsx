import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { config } from "./config/config";
// Optional: Keep FrameSDK if you need client-side Frame logic
import FrameSDK from "@farcaster/frame-sdk";
import { useEffect } from "react";

function FarcasterFrameProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const init = async () => {
      console.log("Initializing FrameSDK...");
      await FrameSDK.actions.ready();
      console.log("FrameSDK ready");
    };
    init().catch((err) => console.error("FrameSDK init failed:", err));
  }, []);
  return <>{children}</>;
}

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <FarcasterFrameProvider>
          <App />
        </FarcasterFrameProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>
);
