import {
  useDisconnect,
  useAppKit,
  useAppKitNetwork,
  useAppKitAccount,
} from "@reown/appkit/react";
import { networks } from "../config/config";

export const ActionButtonList = () => {
  const { disconnect } = useDisconnect();
  const { open } = useAppKit();
  const { switchNetwork } = useAppKitNetwork();
  const { address, isConnected } = useAppKitAccount();
  console.log("Wallet connected:", isConnected, "Address:", address);
  return (
    <div>
      <button onClick={() => open()}>Open</button>
      <button onClick={() => disconnect()}>Disconnect</button>
      <button onClick={() => switchNetwork(networks[1])}>Switch</button>
    </div>
  );
};
