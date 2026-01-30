const { expect } = require("chai");
const { ethers, network } = require("hardhat");

const WITHDRAW_TYPES = {
  Withdraw: [
    { name: "account", type: "address" },
    { name: "to", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "expiry", type: "uint256" },
  ],
};

async function signWithdrawCoupon(vault, signer, coupon) {
  const { chainId } = await ethers.provider.getNetwork();
  const domain = {
    name: "KMarketUserVault",
    version: "1",
    chainId: Number(chainId),
    verifyingContract: await vault.getAddress(),
  };
  return signer.signTypedData(domain, WITHDRAW_TYPES, coupon);
}

async function timeTravel(seconds) {
  await network.provider.send("evm_increaseTime", [seconds]);
  await network.provider.send("evm_mine");
}

describe("UserVault ForceExit FSM", function () {
  const DAY = 24 * 60 * 60;

  let deployer;
  let guardian;
  let settler;
  let user1;
  let user2;
  let couponSigner;
  let other;
  let usdc;
  let vault;

  async function deployFixture() {
    [deployer, guardian, settler, user1, user2, couponSigner, other] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();

    const UserVault = await ethers.getContractFactory("UserVault");
    vault = await UserVault.deploy(await usdc.getAddress(), deployer.address, couponSigner.address);
    await vault.waitForDeployment();

    await vault.grantRole(await vault.GUARDIAN_ROLE(), guardian.address);
    await vault.grantRole(await vault.SETTLER_ROLE(), settler.address);
    await vault.setChallengePeriod(DAY);

    const mintAmount = ethers.parseUnits("1000", 6);
    await usdc.mint(user1.address, mintAmount);
    await usdc.mint(user2.address, mintAmount);
    await usdc.connect(user1).approve(await vault.getAddress(), mintAmount);
    await usdc.connect(user2).approve(await vault.getAddress(), mintAmount);
  }

  beforeEach(async function () {
    await deployFixture();
  });

  describe("1) Nonce replay (WithdrawCoupon)", function () {
    beforeEach(async function () {
      const amount = ethers.parseUnits("100", 6);
      await vault.connect(user1).deposit(amount, user1.address);
    });

    it("1.1 success withdraw increments nonce and withdrawn", async function () {
      const amount = ethers.parseUnits("10", 6);
      const nonce = await vault.couponNonces(user1.address);
      const now = (await ethers.provider.getBlock("latest")).timestamp;
      const coupon = {
        account: user1.address,
        to: user1.address,
        amount,
        nonce,
        expiry: BigInt(now + 3600),
      };
      const sig = await signWithdrawCoupon(vault, couponSigner, coupon);

      await expect(vault.connect(user1).withdrawWithCoupon(coupon, sig))
        .to.emit(vault, "Withdrawn")
        .withArgs(user1.address, user1.address, amount, nonce);

      expect(await vault.couponNonces(user1.address)).to.equal(nonce + 1n);
      expect(await vault.withdrawn(user1.address)).to.equal(amount);
    });

    it("1.2 same coupon+sig replay must fail", async function () {
      const amount = ethers.parseUnits("10", 6);
      const nonce = await vault.couponNonces(user1.address);
      const now = (await ethers.provider.getBlock("latest")).timestamp;
      const coupon = {
        account: user1.address,
        to: user1.address,
        amount,
        nonce,
        expiry: BigInt(now + 3600),
      };
      const sig = await signWithdrawCoupon(vault, couponSigner, coupon);

      await vault.connect(user1).withdrawWithCoupon(coupon, sig);

      await expect(vault.connect(user1).withdrawWithCoupon(coupon, sig))
        .to.be.revertedWithCustomError(vault, "InvalidNonce")
        .withArgs(1n, 0n);
    });

    it("1.3 nonce mismatch (jump nonce) must fail", async function () {
      const amount = ethers.parseUnits("10", 6);
      const now = (await ethers.provider.getBlock("latest")).timestamp;
      const coupon = {
        account: user1.address,
        to: user1.address,
        amount,
        nonce: 1,
        expiry: BigInt(now + 3600),
      };
      const sig = await signWithdrawCoupon(vault, couponSigner, coupon);

      await expect(vault.connect(user1).withdrawWithCoupon(coupon, sig))
        .to.be.revertedWithCustomError(vault, "InvalidNonce")
        .withArgs(0n, 1n);
    });

    it("1.4 expired coupon must fail", async function () {
      const amount = ethers.parseUnits("10", 6);
      const nonce = await vault.couponNonces(user1.address);
      const now = (await ethers.provider.getBlock("latest")).timestamp;
      const coupon = {
        account: user1.address,
        to: user1.address,
        amount,
        nonce,
        expiry: BigInt(now + 10),
      };
      const sig = await signWithdrawCoupon(vault, couponSigner, coupon);

      await timeTravel(11);

      await expect(vault.connect(user1).withdrawWithCoupon(coupon, sig))
        .to.be.revertedWithCustomError(vault, "CouponExpired");
    });

    it("1.5 wrong signer must fail", async function () {
      const amount = ethers.parseUnits("10", 6);
      const nonce = await vault.couponNonces(user1.address);
      const now = (await ethers.provider.getBlock("latest")).timestamp;
      const coupon = {
        account: user1.address,
        to: user1.address,
        amount,
        nonce,
        expiry: BigInt(now + 3600),
      };
      const sig = await signWithdrawCoupon(vault, deployer, coupon);

      await expect(vault.connect(user1).withdrawWithCoupon(coupon, sig))
        .to.be.revertedWithCustomError(vault, "InvalidSignature");
    });

    it("1.6 verifyingContract domain separation (cross-contract replay) must fail", async function () {
      const amount = ethers.parseUnits("10", 6);
      const nonce = 0;
      const now = (await ethers.provider.getBlock("latest")).timestamp;

      const UserVault = await ethers.getContractFactory("UserVault");
      const vaultB = await UserVault.deploy(await usdc.getAddress(), deployer.address, couponSigner.address);
      await vaultB.waitForDeployment();

      const coupon = {
        account: user1.address,
        to: user1.address,
        amount,
        nonce,
        expiry: BigInt(now + 3600),
      };
      const sig = await signWithdrawCoupon(vault, couponSigner, coupon);

      await expect(vaultB.connect(user1).withdrawWithCoupon(coupon, sig))
        .to.be.revertedWithCustomError(vaultB, "InvalidSignature");
    });
  });

  describe("2) challengePeriod (ForceExit)", function () {
    beforeEach(async function () {
      const amount = ethers.parseUnits("100", 6);
      await vault.connect(user1).deposit(amount, user1.address);
    });

    it("2.1 emergencyMode disabled: request must fail", async function () {
      await expect(vault.connect(user1).requestForceExit(1, user1.address))
        .to.be.revertedWithCustomError(vault, "EmergencyModeDisabled");
    });

    it("2.2 request computes executableAt correctly", async function () {
      await vault.connect(guardian).setEmergencyMode(true);
      const amount = ethers.parseUnits("50", 6);

      const tx = await vault.connect(user1).requestForceExit(amount, user1.address);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      const requestId = await vault.activeForceExit(user1.address);
      const req = await vault.forceExits(requestId);

      expect(req.status).to.equal(1n); // REQUESTED
      expect(req.requestedAt).to.equal(BigInt(block.timestamp));
      expect(req.executableAt).to.equal(BigInt(block.timestamp + DAY));
    });

    it("2.3 execute before executableAt must fail", async function () {
      await vault.connect(guardian).setEmergencyMode(true);
      const amount = ethers.parseUnits("50", 6);

      await vault.connect(user1).requestForceExit(amount, user1.address);
      const requestId = await vault.activeForceExit(user1.address);
      const req = await vault.forceExits(requestId);

      await expect(vault.connect(user1).executeForceExit(requestId))
        .to.be.revertedWithCustomError(vault, "ForceExitNotExecutable")
        .withArgs(req.executableAt);
    });

    it("2.4 execute after challengePeriod succeeds", async function () {
      await vault.connect(guardian).setEmergencyMode(true);
      const amount = ethers.parseUnits("50", 6);

      await vault.connect(user1).requestForceExit(amount, user1.address);
      const requestId = await vault.activeForceExit(user1.address);

      await timeTravel(DAY + 1);

      await expect(vault.connect(user1).executeForceExit(requestId))
        .to.emit(vault, "ForceExitExecuted")
        .withArgs(requestId, user1.address, user1.address, amount);

      const req = await vault.forceExits(requestId);
      expect(req.status).to.equal(3n); // EXECUTED
      expect(await vault.withdrawn(user1.address)).to.equal(amount);
    });
  });

  describe("3) ForceExit state transitions", function () {
    beforeEach(async function () {
      const amount = ethers.parseUnits("100", 6);
      await vault.connect(user1).deposit(amount, user1.address);
      await vault.connect(guardian).setEmergencyMode(true);
    });

    it("3.1 NONE -> REQUESTED sets activeForceExit", async function () {
      const amount = ethers.parseUnits("50", 6);
      await vault.connect(user1).requestForceExit(amount, user1.address);
      const requestId = await vault.activeForceExit(user1.address);
      expect(requestId).to.not.equal(ethers.ZeroHash);
    });

    it("3.2 second request while active must fail", async function () {
      const amount = ethers.parseUnits("50", 6);
      await vault.connect(user1).requestForceExit(amount, user1.address);
      const activeId = await vault.activeForceExit(user1.address);

      await expect(vault.connect(user1).requestForceExit(amount, user1.address))
        .to.be.revertedWithCustomError(vault, "ForceExitAlreadyActive")
        .withArgs(activeId);
    });

    it("3.3 REQUESTED -> CANCELLED by user", async function () {
      const amount = ethers.parseUnits("50", 6);
      await vault.connect(user1).requestForceExit(amount, user1.address);
      const requestId = await vault.activeForceExit(user1.address);

      await expect(vault.connect(user1).cancelForceExit(requestId, ethers.id("USER_CANCEL")))
        .to.emit(vault, "ForceExitCancelled")
        .withArgs(requestId, user1.address, ethers.id("USER_CANCEL"));

      const req = await vault.forceExits(requestId);
      expect(req.status).to.equal(2n); // CANCELLED
      expect(await vault.activeForceExit(user1.address)).to.equal(ethers.ZeroHash);
    });

    it("3.4 REQUESTED -> CANCELLED by SETTLER; unauthorized cancel fails", async function () {
      const amount = ethers.parseUnits("50", 6);
      await vault.connect(user1).requestForceExit(amount, user1.address);
      const requestId = await vault.activeForceExit(user1.address);

      await expect(vault.connect(other).cancelForceExit(requestId, ethers.id("NO_AUTH")))
        .to.be.revertedWithCustomError(vault, "ForceExitNotAuthorized");

      await expect(vault.connect(settler).cancelForceExit(requestId, ethers.id("SETTLER_CANCEL")))
        .to.emit(vault, "ForceExitCancelled")
        .withArgs(requestId, user1.address, ethers.id("SETTLER_CANCEL"));
    });

    it("3.5 CANCELLED cannot execute", async function () {
      const amount = ethers.parseUnits("50", 6);
      await vault.connect(user1).requestForceExit(amount, user1.address);
      const requestId = await vault.activeForceExit(user1.address);
      await vault.connect(user1).cancelForceExit(requestId, ethers.id("USER_CANCEL"));

      await expect(vault.connect(user1).executeForceExit(requestId))
        .to.be.revertedWithCustomError(vault, "ForceExitNotRequested");
    });

    it("3.6 EXECUTED cannot cancel or re-execute", async function () {
      const amount = ethers.parseUnits("50", 6);
      await vault.connect(user1).requestForceExit(amount, user1.address);
      const requestId = await vault.activeForceExit(user1.address);
      await timeTravel(DAY + 1);
      await vault.connect(user1).executeForceExit(requestId);

      await expect(vault.connect(user1).cancelForceExit(requestId, ethers.id("CANCEL")))
        .to.be.revertedWithCustomError(vault, "ForceExitNotRequested");

      await expect(vault.connect(user1).executeForceExit(requestId))
        .to.be.revertedWithCustomError(vault, "ForceExitNotRequested");
    });

    it("3.7 CANCELLED/EXECUTED can request again with new requestId", async function () {
      const amount = ethers.parseUnits("50", 6);
      await vault.connect(user1).requestForceExit(amount, user1.address);
      const firstId = await vault.activeForceExit(user1.address);
      await vault.connect(user1).cancelForceExit(firstId, ethers.id("USER_CANCEL"));

      await vault.connect(user1).requestForceExit(amount, user1.address);
      const secondId = await vault.activeForceExit(user1.address);
      expect(secondId).to.not.equal(firstId);
    });
  });

  describe("4) Dual-path mutual exclusion (coupon vs forceExit)", function () {
    beforeEach(async function () {
      const amount = ethers.parseUnits("100", 6);
      await vault.connect(user1).deposit(amount, user1.address);
      await vault.connect(guardian).setEmergencyMode(true);
    });

    it("4.1 coupon withdraw reduces emergencyAvailable", async function () {
      const amount = ethers.parseUnits("30", 6);
      const nonce = await vault.couponNonces(user1.address);
      const now = (await ethers.provider.getBlock("latest")).timestamp;
      const coupon = {
        account: user1.address,
        to: user1.address,
        amount,
        nonce,
        expiry: BigInt(now + 3600),
      };
      const sig = await signWithdrawCoupon(vault, couponSigner, coupon);
      await vault.connect(user1).withdrawWithCoupon(coupon, sig);

      expect(await vault.emergencyAvailable(user1.address)).to.equal(ethers.parseUnits("70", 6));

      await expect(vault.connect(user1).requestForceExit(ethers.parseUnits("80", 6), user1.address))
        .to.be.revertedWithCustomError(vault, "InsufficientEmergencyBalance");
    });

    it("4.2 request then coupon: execute must check current available", async function () {
      const requestAmount = ethers.parseUnits("80", 6);
      await vault.connect(user1).requestForceExit(requestAmount, user1.address);
      const requestId = await vault.activeForceExit(user1.address);

      const couponAmount = ethers.parseUnits("30", 6);
      const nonce = await vault.couponNonces(user1.address);
      const now = (await ethers.provider.getBlock("latest")).timestamp;
      const coupon = {
        account: user1.address,
        to: user1.address,
        amount: couponAmount,
        nonce,
        expiry: BigInt(now + 3600),
      };
      const sig = await signWithdrawCoupon(vault, couponSigner, coupon);
      await vault.connect(user1).withdrawWithCoupon(coupon, sig);

      await timeTravel(DAY + 1);

      await expect(vault.connect(user1).executeForceExit(requestId))
        .to.be.revertedWithCustomError(vault, "InsufficientEmergencyBalance");

      await vault.connect(user1).cancelForceExit(requestId, ethers.id("ADJUST"));
      await vault.connect(user1).requestForceExit(ethers.parseUnits("70", 6), user1.address);
      const newRequestId = await vault.activeForceExit(user1.address);
      await timeTravel(DAY + 1);
      await vault.connect(user1).executeForceExit(newRequestId);
    });

    it("4.3 forceExit executed then coupon must fail", async function () {
      const amount = ethers.parseUnits("80", 6);
      await vault.connect(user1).requestForceExit(amount, user1.address);
      const requestId = await vault.activeForceExit(user1.address);
      await timeTravel(DAY + 1);
      await vault.connect(user1).executeForceExit(requestId);

      const couponAmount = ethers.parseUnits("30", 6);
      const nonce = await vault.couponNonces(user1.address);
      const now = (await ethers.provider.getBlock("latest")).timestamp;
      const coupon = {
        account: user1.address,
        to: user1.address,
        amount: couponAmount,
        nonce,
        expiry: BigInt(now + 3600),
      };
      const sig = await signWithdrawCoupon(vault, couponSigner, coupon);

      await expect(vault.connect(user1).withdrawWithCoupon(coupon, sig))
        .to.be.revertedWithCustomError(vault, "InsufficientEmergencyBalance");
    });

    it("4.4 coupon nonce and forceExit nonce are independent", async function () {
      expect(await vault.couponNonces(user1.address)).to.equal(0n);
      expect(await vault.forceExitNonce(user1.address)).to.equal(0n);

      await vault.connect(user1).requestForceExit(ethers.parseUnits("10", 6), user1.address);
      expect(await vault.forceExitNonce(user1.address)).to.equal(1n);
      expect(await vault.couponNonces(user1.address)).to.equal(0n);

      const nonce = await vault.couponNonces(user1.address);
      const now = (await ethers.provider.getBlock("latest")).timestamp;
      const coupon = {
        account: user1.address,
        to: user1.address,
        amount: ethers.parseUnits("5", 6),
        nonce,
        expiry: BigInt(now + 3600),
      };
      const sig = await signWithdrawCoupon(vault, couponSigner, coupon);
      await vault.connect(user1).withdrawWithCoupon(coupon, sig);

      expect(await vault.couponNonces(user1.address)).to.equal(1n);
      expect(await vault.forceExitNonce(user1.address)).to.equal(1n);
    });
  });

  describe("5) Edge/permission checks", function () {
    beforeEach(async function () {
      const amount = ethers.parseUnits("100", 6);
      await vault.connect(user1).deposit(amount, user1.address);
      await vault.connect(guardian).setEmergencyMode(true);
    });

    it("requestForceExit(amount=0) reverts", async function () {
      await expect(vault.connect(user1).requestForceExit(0, user1.address))
        .to.be.revertedWithCustomError(vault, "ZeroAmount");
    });

    it("requestForceExit(to=0) reverts", async function () {
      await expect(vault.connect(user1).requestForceExit(1, ethers.ZeroAddress))
        .to.be.revertedWithCustomError(vault, "InvalidAccount");
    });

    it("executeForceExit only account or to can call", async function () {
      const amount = ethers.parseUnits("10", 6);
      await vault.connect(user1).requestForceExit(amount, user2.address);
      const requestId = await vault.activeForceExit(user1.address);
      await timeTravel(DAY + 1);

      await expect(vault.connect(other).executeForceExit(requestId))
        .to.be.revertedWithCustomError(vault, "ForceExitNotAuthorized");
    });

    it("setChallengePeriod only admin", async function () {
      await expect(vault.connect(guardian).setChallengePeriod(DAY))
        .to.be.revertedWith("AccessControl");
    });

    it("setEmergencyMode only guardian", async function () {
      await expect(vault.connect(user1).setEmergencyMode(false))
        .to.be.revertedWith("AccessControl");
    });

    it("pauseDeposits=true then deposit reverts", async function () {
      await vault.connect(guardian).pauseDeposits(true);
      await expect(vault.connect(user1).deposit(1, user1.address))
        .to.be.revertedWithCustomError(vault, "DepositsPaused");
    });
  });
});
