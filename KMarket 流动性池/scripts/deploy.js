/* eslint-disable no-console */
const hre = require("hardhat");

function mustEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function optionalEnv(name) {
  return process.env[name];
}

function parseBool(value) {
  if (!value) return false;
  return ["1", "true", "yes", "y"].includes(String(value).toLowerCase());
}

function parseOptionalUint(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
    throw new Error(`Invalid uint value: ${value}`);
  }
  return parsed;
}

async function waitForDeployment(contract) {
  if (typeof contract.waitForDeployment === "function") {
    await contract.waitForDeployment();
  } else if (typeof contract.deployed === "function") {
    await contract.deployed();
  }
}

async function getAddress(contract) {
  if (typeof contract.getAddress === "function") {
    return await contract.getAddress();
  }
  return contract.address;
}

async function grantRoleIfNeeded(contract, role, account, label) {
  if (!account) return;
  const hasRole = await contract.hasRole(role, account);
  if (!hasRole) {
    const tx = await contract.grantRole(role, account);
    await tx.wait();
    console.log(`Granted ${label} to ${account}`);
  }
}

async function revokeRoleIfNeeded(contract, role, account, label) {
  if (!account) return;
  const hasRole = await contract.hasRole(role, account);
  if (!hasRole) return;
  const tx = await contract.revokeRole(role, account);
  await tx.wait();
  console.log(`Revoked ${label} from ${account}`);
}

async function main() {
  const ASSET = mustEnv("ASSET");
  const ADMIN = mustEnv("ADMIN");
  const TREASURY = mustEnv("TREASURY");
  const COUPON_SIGNER = mustEnv("COUPON_SIGNER");

  const GUARDIAN = optionalEnv("GUARDIAN") || ADMIN;
  const SETTLER = optionalEnv("SETTLER") || ADMIN;
  const RISK_MANAGER = optionalEnv("RISK_MANAGER") || ADMIN;
  const REVOKE_DEPLOYER = parseBool(optionalEnv("REVOKE_DEPLOYER"));
  const CHALLENGE_PERIOD_SECONDS = parseOptionalUint(optionalEnv("CHALLENGE_PERIOD_SECONDS"));
  const EMERGENCY_MODE = optionalEnv("EMERGENCY_MODE");
  const PAUSE_DEPOSITS = parseBool(optionalEnv("PAUSE_DEPOSITS"));
  const PAUSE_ALL = parseBool(optionalEnv("PAUSE_ALL"));

  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);
  console.log("Deploying contracts...");

  const LPShareToken = await hre.ethers.getContractFactory("LPShareToken");
  const lpShare = await LPShareToken.deploy(ADMIN);
  await waitForDeployment(lpShare);
  const lpShareAddr = await getAddress(lpShare);
  console.log(`LPShareToken deployed: ${lpShareAddr}`);

  const LPPoolVault = await hre.ethers.getContractFactory("LPPoolVault");
  const lpVault = await LPPoolVault.deploy(ASSET, lpShareAddr, ADMIN, TREASURY);
  await waitForDeployment(lpVault);
  const lpVaultAddr = await getAddress(lpVault);
  console.log(`LPPoolVault deployed: ${lpVaultAddr}`);

  const UserVault = await hre.ethers.getContractFactory("UserVault");
  const userVault = await UserVault.deploy(ASSET, ADMIN, COUPON_SIGNER);
  await waitForDeployment(userVault);
  const userVaultAddr = await getAddress(userVault);
  console.log(`UserVault deployed: ${userVaultAddr}`);

  const SettlementBridge = await hre.ethers.getContractFactory("SettlementBridge");
  const bridge = await SettlementBridge.deploy(userVaultAddr, lpVaultAddr, ADMIN, TREASURY);
  await waitForDeployment(bridge);
  const bridgeAddr = await getAddress(bridge);
  console.log(`SettlementBridge deployed: ${bridgeAddr}`);

  console.log("\nGranting roles...");

  // LPShareToken: minter to LPPoolVault
  await grantRoleIfNeeded(lpShare, await lpShare.MINTER_ROLE(), lpVaultAddr, "LPShareToken.MINTER_ROLE (LPPoolVault)");

  // UserVault: grant bridge SETTLER_ROLE (required for settlement transfers)
  await grantRoleIfNeeded(userVault, await userVault.SETTLER_ROLE(), bridgeAddr, "UserVault.SETTLER_ROLE (SettlementBridge)");
  await grantRoleIfNeeded(userVault, await userVault.GUARDIAN_ROLE(), GUARDIAN, "UserVault.GUARDIAN_ROLE");

  // LPPoolVault: grant bridge SETTLER_ROLE + optional risk/guardian
  await grantRoleIfNeeded(lpVault, await lpVault.SETTLER_ROLE(), bridgeAddr, "LPPoolVault.SETTLER_ROLE (SettlementBridge)");
  await grantRoleIfNeeded(lpVault, await lpVault.GUARDIAN_ROLE(), GUARDIAN, "LPPoolVault.GUARDIAN_ROLE");
  await grantRoleIfNeeded(lpVault, await lpVault.RISK_MANAGER_ROLE(), RISK_MANAGER, "LPPoolVault.RISK_MANAGER_ROLE");

  // SettlementBridge: allow backend settler + guardian
  await grantRoleIfNeeded(bridge, await bridge.SETTLER_ROLE(), SETTLER, "SettlementBridge.SETTLER_ROLE");
  await grantRoleIfNeeded(bridge, await bridge.GUARDIAN_ROLE(), GUARDIAN, "SettlementBridge.GUARDIAN_ROLE");

  console.log("\nApplying UserVault config...");

  const isDeployerAdmin = await userVault.hasRole(await userVault.DEFAULT_ADMIN_ROLE(), deployer.address);
  if (!isDeployerAdmin) {
    console.log("Deployer is not UserVault admin; skipping config updates that require DEFAULT_ADMIN_ROLE.");
  } else {
    if (CHALLENGE_PERIOD_SECONDS !== undefined) {
      const tx = await userVault.setChallengePeriod(CHALLENGE_PERIOD_SECONDS);
      await tx.wait();
      console.log(`UserVault.challengePeriod set to ${CHALLENGE_PERIOD_SECONDS}s`);
    }
    if (EMERGENCY_MODE !== undefined) {
      const enabled = parseBool(EMERGENCY_MODE);
      const tx = await userVault.setEmergencyMode(enabled);
      await tx.wait();
      console.log(`UserVault.emergencyMode set to ${enabled}`);
    }
    if (COUPON_SIGNER) {
      const currentSigner = await userVault.couponSigner();
      if (currentSigner.toLowerCase() !== COUPON_SIGNER.toLowerCase()) {
        const tx = await userVault.setCouponSigner(COUPON_SIGNER);
        await tx.wait();
        console.log(`UserVault.couponSigner updated to ${COUPON_SIGNER}`);
      }
    }
  }

  const isGuardian = await userVault.hasRole(await userVault.GUARDIAN_ROLE(), deployer.address);
  if (!isGuardian) {
    console.log("Deployer is not UserVault guardian; skipping guardian actions.");
  } else {
    if (PAUSE_DEPOSITS) {
      const tx = await userVault.pauseDeposits(true);
      await tx.wait();
      console.log("UserVault.depositsPaused set to true");
    }
    if (PAUSE_ALL) {
      const tx = await userVault.pause();
      await tx.wait();
      console.log("UserVault paused");
    }
  }

  if (REVOKE_DEPLOYER) {
    console.log("\nRevoking deployer roles...");

    const deployerAddr = deployer.address;

    // Only attempt revoke if deployer is DEFAULT_ADMIN_ROLE on that contract.
    if (await lpShare.hasRole(await lpShare.DEFAULT_ADMIN_ROLE(), deployerAddr)) {
      await revokeRoleIfNeeded(lpShare, await lpShare.MINTER_ROLE(), deployerAddr, "LPShareToken.MINTER_ROLE");
      await revokeRoleIfNeeded(lpShare, await lpShare.DEFAULT_ADMIN_ROLE(), deployerAddr, "LPShareToken.DEFAULT_ADMIN_ROLE");
    }

    if (await lpVault.hasRole(await lpVault.DEFAULT_ADMIN_ROLE(), deployerAddr)) {
      await revokeRoleIfNeeded(lpVault, await lpVault.RISK_MANAGER_ROLE(), deployerAddr, "LPPoolVault.RISK_MANAGER_ROLE");
      await revokeRoleIfNeeded(lpVault, await lpVault.SETTLER_ROLE(), deployerAddr, "LPPoolVault.SETTLER_ROLE");
      await revokeRoleIfNeeded(lpVault, await lpVault.GUARDIAN_ROLE(), deployerAddr, "LPPoolVault.GUARDIAN_ROLE");
      await revokeRoleIfNeeded(lpVault, await lpVault.DEFAULT_ADMIN_ROLE(), deployerAddr, "LPPoolVault.DEFAULT_ADMIN_ROLE");
    }

    if (await userVault.hasRole(await userVault.DEFAULT_ADMIN_ROLE(), deployerAddr)) {
      await revokeRoleIfNeeded(userVault, await userVault.SETTLER_ROLE(), deployerAddr, "UserVault.SETTLER_ROLE");
      await revokeRoleIfNeeded(userVault, await userVault.GUARDIAN_ROLE(), deployerAddr, "UserVault.GUARDIAN_ROLE");
      await revokeRoleIfNeeded(userVault, await userVault.DEFAULT_ADMIN_ROLE(), deployerAddr, "UserVault.DEFAULT_ADMIN_ROLE");
    }

    if (await bridge.hasRole(await bridge.DEFAULT_ADMIN_ROLE(), deployerAddr)) {
      await revokeRoleIfNeeded(bridge, await bridge.SETTLER_ROLE(), deployerAddr, "SettlementBridge.SETTLER_ROLE");
      await revokeRoleIfNeeded(bridge, await bridge.GUARDIAN_ROLE(), deployerAddr, "SettlementBridge.GUARDIAN_ROLE");
      await revokeRoleIfNeeded(bridge, await bridge.DEFAULT_ADMIN_ROLE(), deployerAddr, "SettlementBridge.DEFAULT_ADMIN_ROLE");
    }
  }

  console.log("\nDeployment complete.");
  console.log({
    LPShareToken: lpShareAddr,
    LPPoolVault: lpVaultAddr,
    UserVault: userVaultAddr,
    SettlementBridge: bridgeAddr,
  });
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
