const hre  = require("hardhat");
const fs   = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const Contract = await hre.ethers.getContractFactory("CollateralX");
  const contract = await Contract.deploy();

  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("✅ CollateralX deployed to:", address);

  // ── Auto-update client/.env.local ────────────────────────────────────────
  const envPath = path.resolve(__dirname, "../../client/.env.local");
  if (fs.existsSync(envPath)) {
    let env = fs.readFileSync(envPath, "utf8");
    env = env.replace(
      /^NEXT_PUBLIC_CONTRACT_ADDRESS=.*/m,
      `NEXT_PUBLIC_CONTRACT_ADDRESS="${address}"`
    );
    fs.writeFileSync(envPath, env, "utf8");
    console.log("📝 Updated client/.env.local with new address");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});