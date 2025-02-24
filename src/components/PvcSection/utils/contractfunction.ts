import { ethers } from "ethers";
import { ABI, ADDRESS } from "../utils/contract";

// Providers
export const publicProvider = new ethers.JsonRpcProvider(
  "https://base-mainnet.g.alchemy.com/v2/os5WiDtgiyV3YXhsy2P-Cc0IX5IwFbYy"
);

export const fallbackProvider = new ethers.JsonRpcProvider(
  "https://base-mainnet.infura.io/v3/b17a040a14bc48cfb3928a73d26f3617"
);

export const publicContract = new ethers.Contract(ADDRESS, ABI, publicProvider);

// Setup signer and contract
async function setupContractWithSigner() {
  try {
    if (!window.ethereum) {
      throw new Error(
        "Ethereum provider not available. Please install MetaMask."
      );
    }
    const provider = new ethers.BrowserProvider(window.ethereum as any);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(ADDRESS, ABI, signer);
    return { signer, contract };
  } catch (error) {
    console.error("Error setting up contract with signer:", error);
    throw error;
  }
}

// Handle contract errors
interface ContractError extends Error {
  code?: string;
  transaction?: any;
  revert?: string;
}

function handleContractError(error: ContractError) {
  if (error.code === "CALL_EXCEPTION") {
    console.error("Transaction data:", error.transaction);
    if (error.revert) console.error("Revert reason:", error.revert);
  } else if (error.code === "ACTION_REJECTED") {
    console.error("User rejected the action:", error);
  } else {
    console.error("Unexpected error:", error);
  }
}

// Deposit tokens to treasury
export const depositToTreasury = async (
  tokenAddress: string,
  amount: string
): Promise<{ success: boolean; txHash?: string; error?: string }> => {
  try {
    const { signer, contract } = await setupContractWithSigner();
    const tokenContract = new ethers.Contract(
      tokenAddress,
      [
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function balanceOf(address owner) external view returns (uint256)",
      ],
      signer
    );

    const amountInWei = ethers.parseUnits(amount, 18);
    const balance = await tokenContract.balanceOf(await signer.getAddress());
    if (balance.lt(amountInWei)) {
      throw new Error("Insufficient token balance");
    }

    const approveTx = await tokenContract.approve(ADDRESS, amountInWei);
    await approveTx.wait();

    const depositTx = await contract.depositERC20(tokenAddress, amountInWei);
    const receipt = await depositTx.wait();

    return { success: true, txHash: receipt.transactionHash };
  } catch (error: any) {
    console.error("Error depositing to treasury:", error);
    return {
      success: false,
      error: error.message || "Failed to deposit to treasury",
    };
  }
};

// Get bet status
export const getBetStatus = async (requestId: string) => {
  try {
    const { contract } = await setupContractWithSigner();
    return await contract.getBetStatus(requestId);
  } catch (error) {
    console.error("Error getting bet status:", error);
    handleContractError(error as ContractError);
    throw error;
  }
};

// Get game outcome
export const getGameOutcome = async (requestId: string) => {
  try {
    const { contract } = await setupContractWithSigner();
    return await contract.getGameOutcome(requestId);
  } catch (error) {
    console.error("Error getting game outcome:", error);
    handleContractError(error as ContractError);
    throw error;
  }
};

// Flip function with proper balance check
export const flip = async (
  tokenAddress: string,
  tokenAmount: string,
  face: boolean
) => {
  try {
    const { signer, contract } = await setupContractWithSigner();
    const tokenAmountInWei = ethers.parseUnits(tokenAmount, 18);
    const requiredBalance = tokenAmountInWei * BigInt(2); // Reflects _getPayout(tokenAmount)

    // Token contract instance
    const tokenContract = new ethers.Contract(
      tokenAddress,
      [
        "function allowance(address owner, address spender) external view returns (uint256)",
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function balanceOf(address owner) external view returns (uint256)",
      ],
      signer
    );

    // Check contract balance
    const contractBalance = await tokenContract.balanceOf(ADDRESS);
    if (contractBalance.lt(requiredBalance)) {
      throw new Error(
        `Contract has insufficient balance: ${ethers.formatUnits(
          contractBalance,
          18
        )} tokens available, ${ethers.formatUnits(requiredBalance, 18)} needed`
      );
    }

    // Check user balance
    const userBalance = await tokenContract.balanceOf(
      await signer.getAddress()
    );
    if (userBalance.lt(tokenAmountInWei)) {
      throw new Error("Insufficient user token balance");
    }

    // Handle approval
    const currentAllowance = await tokenContract.allowance(
      await signer.getAddress(),
      ADDRESS
    );
    if (currentAllowance.lt(tokenAmountInWei)) {
      const approveTx = await tokenContract.approve(ADDRESS, tokenAmountInWei);
      await approveTx.wait();
    }

    // Execute flip transaction
    const tx = await contract.flip(face, tokenAddress, tokenAmountInWei);
    const receipt = await tx.wait();

    // Extract requestId from BetSent event
    const betSentEvent = receipt.logs
      .map((log: any) => {
        try {
          return contract.interface.parseLog(log);
        } catch (e) {
          return null;
        }
      })
      .find((event: any) => event?.name === "BetSent");

    const requestId = betSentEvent ? betSentEvent.args.requestId : null;

    return { receipt, requestId };
  } catch (error) {
    console.error("Error in flip function:", error);
    throw error;
  }
};
