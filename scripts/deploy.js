import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("Deploying BlockExam contract...");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  const BlockExam = await hre.ethers.getContractFactory("BlockExam");
  const blockExam = await BlockExam.deploy();
  await blockExam.waitForDeployment();

  const contractAddress = await blockExam.getAddress();
  console.log("BlockExam deployed successfully to:", contractAddress);

  // Extract artifact ABI
  const artifact = await hre.artifacts.readArtifact("BlockExam");

  const networkInfo = await hre.ethers.provider.getNetwork();

  const contractData = {
    network: hre.network.name,
    chainId: networkInfo.chainId.toString(),
    address: contractAddress,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    abi: artifact.abi,
  };

  const outputDir = path.resolve(__dirname, "../config");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, "contractData.json");
  fs.writeFileSync(outputPath, JSON.stringify(contractData, null, 2), "utf8");
  console.log("Contract data saved to:", outputPath);

  // Also write to src/config/contractData.json for clean frontend import
  const srcConfigDir = path.resolve(__dirname, "../src/config");
  if (fs.existsSync(path.resolve(__dirname, "../src"))) {
    if (!fs.existsSync(srcConfigDir)) {
      fs.mkdirSync(srcConfigDir, { recursive: true });
    }
    fs.writeFileSync(path.join(srcConfigDir, "contractData.json"), JSON.stringify(contractData, null, 2), "utf8");
    console.log("Contract data copied to:", path.join(srcConfigDir, "contractData.json"));
  }
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
