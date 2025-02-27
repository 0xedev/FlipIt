import { VercelRequest, VercelResponse } from "@vercel/node";
import { flip } from "../src/components/PvcSection/utils/contractfunction";
import { SUPPORTED_TOKENS } from "../src/utils/contractFunction";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const { untrustedData } = req.body;
  const face = untrustedData.buttonIndex === 1; // 1 = Heads, 2 = Tails

  try {
    const { receipt } = await flip(SUPPORTED_TOKENS.STABLEAI, "1", face);
    const result = receipt.status === 1 ? "Win" : "Lose";

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta property="og:title" content="Result: ${result}" />
          <meta property="og:image" content="https://example.com/${result.toLowerCase()}.png" />
          <meta property="fc:frame" content="vNext" />
          <meta property="fc:frame:image" content="https://example.com/${result.toLowerCase()}.png" />
          <meta property="fc:frame:button:1" content="Play Again" />
          <meta property="fc:frame:button:1:action" content="post" />
          <meta property="fc:frame:button:1:target" content="https://flip-it-three.vercel.app/api/flip" />
        </head>
      </html>
    `;
    res.setHeader("Content-Type", "text/html");
    res.status(200).send(html);
  } catch (error) {
    res.status(500).send("Error flipping coin");
  }
}
