import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const SentinelTrust = await hre.ethers.getContractFactory("SentinelTrust");
  const sentinelTrust = await SentinelTrust.deploy();

  await sentinelTrust.waitForDeployment();
  const address = await sentinelTrust.getAddress();
  
  console.log(`SentinelTrust deployed to: ${address}`);

  const envPath = path.join(__dirname, "../../../sentinel-blockchain-api/.env");
  let envContent = `CONTRACT_ADDRESS=${address}\nPRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80\nPORT=3001\n`;
  fs.writeFileSync(envPath, envContent);
  console.log("Updated sentinel-blockchain-api/.env with new contract address.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
