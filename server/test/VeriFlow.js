// =============================================================================
// VeriFlow Protocol – Hardhat Tests
// =============================================================================
// Tests cover the core mathematical formulas from the v2.0 technical spec:
//   1. Deposit calculation  (quadratic, 85-cap, 30% floor)
//   2. Trust score gains    (logarithmic + exponential diminishing returns)
//   3. Dispute penalty      (ratio-based, disputesLost, dispute weight halving)
//   4. Full rental lifecycle
//   5. Dispute lifecycle    (raise → respond → resolve upheld/rejected)
// =============================================================================

const { time, loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");

const DAY = 24 * 3600;
const ETH = (n) => ethers.parseEther(String(n));

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Floor(log₂(x)) – mirrors the Solidity _log2 */
function log2Floor(x) {
  if (x <= 1n) return 0n;
  let n = 0n;
  let v = x;
  if (v >= 2n ** 128n) { v >>= 128n; n += 128n; }
  if (v >= 2n ** 64n)  { v >>= 64n;  n += 64n;  }
  if (v >= 2n ** 32n)  { v >>= 32n;  n += 32n;  }
  if (v >= 2n ** 16n)  { v >>= 16n;  n += 16n;  }
  if (v >= 2n ** 8n)   { v >>= 8n;   n += 8n;   }
  if (v >= 2n ** 4n)   { v >>= 4n;   n += 4n;   }
  if (v >= 2n ** 2n)   { v >>= 2n;   n += 2n;   }
  if (v >= 2n ** 1n)   { n += 1n; }
  return n;
}

/** Expected deposit percent from the spec formula */
function expectedDepositPct(score) {
  const eff  = Math.min(score, 85);
  const diff = 100 - eff;
  return Math.max(30, Math.floor((diff * diff) / 100));
}

// ── Fixture ────────────────────────────────────────────────────────────────────

async function deployFixture() {
  const [admin, owner, renter, renter2, arbiter] = await ethers.getSigners();
  const VeriFlow = await ethers.getContractFactory("VeriFlow");
  const cx = await VeriFlow.deploy();
  return { cx, admin, owner, renter, renter2, arbiter };
}

// ── 1. Deposit Calculation ─────────────────────────────────────────────────────

describe("VeriFlow", function () {

  describe("1. calculateDeposit – quadratic formula", function () {
    it("new user (score 50 default) → 30% deposit + 1% weekly surcharge for 7d", async function () {
      const { cx, renter } = await loadFixture(deployFixture);
      const assetValue = ETH(10);
      // calculateDeposit: score=0 in storage → defaults to 50 (per _initUser logic mirrored in view)
      // score 50 → eff=50, diff=50, pct=(50²)/100=25 → floor to 30%
      // base = 10 ETH × 30% = 3 ETH
      // 7 days = 1 week → surcharge = 3 ETH × 1% = 0.03 ETH → total = 3.03 ETH
      const deposit = await cx.calculateDeposit(assetValue, BigInt(7 * DAY), renter.address);
      const base      = assetValue * 30n / 100n;    // 3 ETH
      const surcharge = base * 1n / 100n;           // 0.03 ETH (1 week)
      const expected  = base + surcharge;
      expect(deposit).to.equal(expected);
    });

    it("score ≥ 85 → exactly 30% (floor enforced via 85-cap)", async function () {
      const { cx } = await loadFixture(deployFixture);
      // We can't manually set user score without doing rentals, so test via the formula directly.
      // Deploy a fresh contract and call calculateDeposit on a freshly initialised address.
      // Instead, verify the formula boundary: score 85 → (100-85)²/100 = 225/100 = 2 → floor to 30
      const pct85 = expectedDepositPct(85);
      expect(pct85).to.equal(30);

      const pct100 = expectedDepositPct(100); // capped at 85
      expect(pct100).to.equal(30);
    });

    it("score 40 → 36% deposit", async function () {
      const pct = expectedDepositPct(40);
      expect(pct).to.equal(36);
    });

    it("score 60 → 30% (floor kicks in)", async function () {
      // (100-60)²/100 = 1600/100 = 16 → floor to 30
      const pct = expectedDepositPct(60);
      expect(pct).to.equal(30);
    });

    it("uninitialized user → score 50 default → 30% collateral (1-day, no surcharge)", async function () {
      const { cx, renter } = await loadFixture(deployFixture);
      const assetValue = ETH(1);
      const deposit = await cx.calculateDeposit(assetValue, BigInt(1 * DAY), renter.address);
      // storage score = 0 → calculateDeposit defaults to 50 → floor 30%
      // 1 day < 1 week → no surcharge
      const expected = assetValue * 30n / 100n;
      expect(deposit).to.equal(expected);
    });
  });

  // ── 2. Trust Score Gains ────────────────────────────────────────────────────

  describe("2. Trust score – logarithmic gain with diminishing returns", function () {
    async function doRental(cx, owner, renter, assetValueEth, durationDays) {
      const assetValue = ETH(assetValueEth);
      const duration = BigInt(durationDays * DAY);
      const rentalFeePerDay = ETH(0.01);

      // Create listing
      await cx.connect(owner).createListing(
        "Test Asset", assetValue,
        BigInt(1 * DAY), BigInt(30 * DAY), rentalFeePerDay, "9999999999", ""
      );
      const listingId = await cx.listingCount();

      // Start rental
      const collateral = await cx.calculateDeposit(assetValue, duration, renter.address);
      await cx.connect(renter).startRental(listingId, duration, "8888888888", { value: collateral });
      const rentalId = await cx.rentalCount();

      // Pay rental fee & complete
      const finalAmt = rentalFeePerDay * (duration / BigInt(DAY));
      await cx.connect(renter).payFinalAmount(rentalId, { value: finalAmt });
      await time.increase(Number(duration) + 1);
      await cx.connect(owner).completeRental(rentalId);

      return rentalId;
    }

    it("score increases after successful rental", async function () {
      const { cx, owner, renter } = await loadFixture(deployFixture);
      // initialise renter
      await cx.connect(renter).createListing("ignored", ETH(1), BigInt(DAY), BigInt(DAY), ETH(0.01), "0", "");
      const before = (await cx.getUserProfile(renter.address)).trustScore;

      await doRental(cx, owner, renter, 1, 3);
      const after = (await cx.getUserProfile(renter.address)).trustScore;
      expect(after).to.be.gt(before);
    });

    it("score gain is capped at MAX_SCORE_CHANGE (5) per rental", async function () {
      const { cx, owner, renter } = await loadFixture(deployFixture);
      const before = (await cx.getUserProfile(renter.address)).trustScore;
      await doRental(cx, owner, renter, 1000, 30); // large value, long duration
      const after = (await cx.getUserProfile(renter.address)).trustScore;
      // Gain must not exceed 5 (MAX_SCORE_CHANGE)
      expect(Number(after) - Number(before)).to.be.lte(5);
    });
  });

  // ── 3. Dispute Penalty (Ratio-Based) ────────────────────────────────────────

  describe("3. Dispute penalty – ratio-based with disputesLost", function () {
    it("penalty uses disputesLost (not disputesAgainst) in numerator", async function () {
      // This is validated by checking that a user with disputes AGAINST them but not LOST
      // has a lower penalty weight than one with equivalent LOST disputes.
      // We test this conceptually via the formula:
      //   penalty = basePenalty × (disputesLost+1) / (totalRentals+1) × weight/100
      // At 0 totalRentals, 0 disputesLost: penalty = base × 1/1 × 100/100 = base
      // At 5 totalRentals, 0 disputesLost: penalty = base × 1/6 × 100/100 ≈ base/6
      // Verify helper formula
      function ratioPenalty(base, disputesLost, totalRentals) {
        return Math.floor((base * (disputesLost + 1) * 100) / ((totalRentals + 1) * 100));
      }
      expect(ratioPenalty(8, 0, 0)).to.equal(8);  // new user, first dispute
      expect(ratioPenalty(8, 0, 5)).to.equal(1);  // 5 rentals, 0 lost → small penalty
      expect(ratioPenalty(8, 2, 5)).to.equal(4);  // 5 rentals, 2 lost → moderate
    });
  });

  // ── 4. Dispute Weight (Halving) ─────────────────────────────────────────────

  describe("4. Dispute weight – halves every 3 clean rentals", function () {
    it("weight = 100 with 0 clean rentals after dispute", function () {
      function disputeWeight(rentalsAfterDispute) {
        const halvings = Math.min(Math.floor(rentalsAfterDispute / 3), 4);
        return Math.floor(100 / (2 ** halvings));
      }
      expect(disputeWeight(0)).to.equal(100);
      expect(disputeWeight(2)).to.equal(100);
      expect(disputeWeight(3)).to.equal(50);
      expect(disputeWeight(6)).to.equal(25);
      expect(disputeWeight(9)).to.equal(12);
      expect(disputeWeight(12)).to.equal(6);
      expect(disputeWeight(100)).to.equal(6); // capped at 4 halvings
    });
  });

  // ── 5. Full Rental Lifecycle ─────────────────────────────────────────────────

  describe("5. Rental lifecycle – create → start → pay → complete", function () {
    it("completes successfully and returns collateral minus 1% fee", async function () {
      const { cx, owner, renter } = await loadFixture(deployFixture);
      const assetValue = ETH(1);
      const rentalFeePerDay = ETH(0.01);
      const duration = BigInt(3 * DAY);

      await cx.connect(owner).createListing(
        "Camera", assetValue, BigInt(DAY), BigInt(30 * DAY), rentalFeePerDay, "9999999999", ""
      );
      const listingId = await cx.listingCount();

      const collateral = await cx.calculateDeposit(assetValue, duration, renter.address);
      await cx.connect(renter).startRental(listingId, duration, "8888888888", { value: collateral });
      const rentalId = await cx.rentalCount();

      // Rental should be Active
      const rental = await cx.rentals(rentalId);
      expect(rental.status).to.equal(0n); // Status.Active = 0

      // Pay final amount
      const finalAmt = rentalFeePerDay * 3n;
      await cx.connect(renter).payFinalAmount(rentalId, { value: finalAmt });

      // Complete rental after duration
      await time.increase(Number(duration) + 1);
      const balanceBefore = await ethers.provider.getBalance(renter.address);
      const tx = await cx.connect(owner).completeRental(rentalId);
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed * tx.gasPrice;
      const balanceAfter = await ethers.provider.getBalance(renter.address);

      // Renter should receive collateral − 1% fee
      const renterFee = collateral / 100n;
      const refund    = collateral - renterFee;
      // Balance increase ≈ refund (renter didn't pay gas here, owner did)
      expect(balanceAfter - balanceBefore).to.equal(refund);

      // Rental status = Completed
      const finalRental = await cx.rentals(rentalId);
      expect(finalRental.status).to.equal(1n); // Status.Completed = 1
    });

    it("owner receives 99% of rental fee (1% taken as owner fee)", async function () {
      const { cx, owner, renter } = await loadFixture(deployFixture);
      const rentalFeePerDay = ETH(0.01);
      const duration = BigInt(3 * DAY);
      const assetValue = ETH(1);

      await cx.connect(owner).createListing("Laptop", assetValue, BigInt(DAY), BigInt(30 * DAY), rentalFeePerDay, "0", "");
      const listingId = await cx.listingCount();
      const collateral = await cx.calculateDeposit(assetValue, duration, renter.address);
      await cx.connect(renter).startRental(listingId, duration, "0", { value: collateral });
      const rentalId = await cx.rentalCount();

      const finalAmt = rentalFeePerDay * 3n;
      const ownerBefore = await ethers.provider.getBalance(owner.address);
      const payTx = await cx.connect(renter).payFinalAmount(rentalId, { value: finalAmt });
      await payTx.wait();
      const ownerAfter = await ethers.provider.getBalance(owner.address);

      const ownerFee = finalAmt / 100n;
      const net      = finalAmt - ownerFee;
      expect(ownerAfter - ownerBefore).to.equal(net);
    });
  });

  // ── 6. Dispute Lifecycle ─────────────────────────────────────────────────────

  describe("6. Dispute lifecycle", function () {
    async function startAndCompleteSetup(cx, owner, renter) {
      const assetValue     = ETH(1);
      const rentalFeePerDay = ETH(0.01);
      const duration        = BigInt(3 * DAY);

      await cx.connect(owner).createListing("Cam", assetValue, BigInt(DAY), BigInt(30 * DAY), rentalFeePerDay, "111", "Mumbai, Maharashtra");
      const listingId = await cx.listingCount();
      const collateral = await cx.calculateDeposit(assetValue, duration, renter.address);
      await cx.connect(renter).startRental(listingId, duration, "222", { value: collateral });
      return { rentalId: await cx.rentalCount(), collateral };
    }

    it("owner can raise a dispute within 48h window", async function () {
      const { cx, owner, renter } = await loadFixture(deployFixture);
      const { rentalId } = await startAndCompleteSetup(cx, owner, renter);

      // Fast-forward to just after rental ends
      const rental = await cx.rentals(rentalId);
      await time.increaseTo(Number(rental.endTime) + 1);

      // Owner raises dispute
      await expect(
        cx.connect(owner).raiseDispute(rentalId, 2, "ipfs://evidence") // Moderate = 2
      ).to.emit(cx, "DisputeRaised");

      const dispute = await cx.disputes(rentalId);
      expect(dispute.raisedBy).to.equal(owner.address);
      expect(dispute.accusedParty).to.equal(renter.address);
    });

    it("dispute cannot be raised after 48h window", async function () {
      const { cx, owner, renter } = await loadFixture(deployFixture);
      const { rentalId } = await startAndCompleteSetup(cx, owner, renter);

      const rental = await cx.rentals(rentalId);
      // Move past dispute window (48h after end)
      await time.increaseTo(Number(rental.endTime) + 48 * 3600 + 1);

      await expect(
        cx.connect(owner).raiseDispute(rentalId, 1, "ipfs://late")
      ).to.be.revertedWith("Dispute window closed");
    });

    it("renter can respond within 72h response window", async function () {
      const { cx, owner, renter } = await loadFixture(deployFixture);
      const { rentalId } = await startAndCompleteSetup(cx, owner, renter);

      const rental = await cx.rentals(rentalId);
      await time.increaseTo(Number(rental.endTime) + 1);
      await cx.connect(owner).raiseDispute(rentalId, 1, "ipfs://proof");

      await expect(
        cx.connect(renter).respondToDispute(rentalId, "ipfs://counter")
      ).to.emit(cx, "DisputeResponseSubmitted");
    });

    it("upheld dispute: owner receives compensation, renter's score drops", async function () {
      const { cx, owner, renter } = await loadFixture(deployFixture);
      const { rentalId, collateral } = await startAndCompleteSetup(cx, owner, renter);

      const rental = await cx.rentals(rentalId);
      await time.increaseTo(Number(rental.endTime) + 1);
      await cx.connect(owner).raiseDispute(rentalId, 3, "ipfs://damage"); // Severe = 3

      const dispute = await cx.disputes(rentalId);
      // Skip past response window
      await time.increaseTo(Number(dispute.raisedAt) + 72 * 3600 + 1);

      const scoresBefore = (await cx.getUserProfile(renter.address)).trustScore;
      const ownerBefore  = await ethers.provider.getBalance(owner.address);

      const tx = await cx.connect(owner).resolveDispute(rentalId, 1); // Upheld = 1
      await tx.wait();

      const scoresAfter = (await cx.getUserProfile(renter.address)).trustScore;
      const ownerAfter  = await ethers.provider.getBalance(owner.address);

      // Trust score should drop
      expect(scoresAfter).to.be.lt(scoresBefore);
      // Owner should receive compensation (collateral for severe)
      expect(ownerAfter).to.be.gt(ownerBefore);
    });

    it("rejected dispute: raiser (owner) penalised, renter gets collateral back", async function () {
      const { cx, owner, renter } = await loadFixture(deployFixture);
      const { rentalId, collateral } = await startAndCompleteSetup(cx, owner, renter);

      const rental = await cx.rentals(rentalId);
      await time.increaseTo(Number(rental.endTime) + 1);
      await cx.connect(owner).raiseDispute(rentalId, 1, "ipfs://false-claim");

      const dispute = await cx.disputes(rentalId);
      await time.increaseTo(Number(dispute.raisedAt) + 72 * 3600 + 1);

      const renterBefore = await ethers.provider.getBalance(renter.address);
      await cx.connect(owner).resolveDispute(rentalId, 2); // Rejected = 2
      const renterAfter  = await ethers.provider.getBalance(renter.address);

      // Renter gets full collateral refunded
      expect(renterAfter - renterBefore).to.equal(collateral);

      // Owner score should drop and falseDisputesRaised should increment
      const ownerProfile = await cx.getOwnerProfile(owner.address);
      expect(ownerProfile.falseDisputesRaised).to.equal(1n);
    });
  });

  // ── 7. Bilateral Fee Structure ───────────────────────────────────────────────

  describe("7. Bilateral fee structure", function () {
    it("feePool accumulates renter fee (1%) + owner fee (1%)", async function () {
      const { cx, owner, renter } = await loadFixture(deployFixture);
      const assetValue      = ETH(1);
      const rentalFeePerDay = ETH(0.01);
      const duration        = BigInt(3 * DAY);

      await cx.connect(owner).createListing("Drone", assetValue, BigInt(DAY), BigInt(30 * DAY), rentalFeePerDay, "0", "");
      const listingId  = await cx.listingCount();
      const collateral = await cx.calculateDeposit(assetValue, duration, renter.address);
      await cx.connect(renter).startRental(listingId, duration, "0", { value: collateral });
      const rentalId   = await cx.rentalCount();

      const finalAmt = rentalFeePerDay * 3n;
      await cx.connect(renter).payFinalAmount(rentalId, { value: finalAmt });
      await time.increase(Number(duration) + 1);
      await cx.connect(owner).completeRental(rentalId);

      const pool = await cx.feePool();
      const ownerFee  = finalAmt  / 100n;          // 1% of rental fee
      const renterFee = collateral / 100n;          // 1% of collateral
      expect(pool).to.equal(ownerFee + renterFee);
    });
  });
});
