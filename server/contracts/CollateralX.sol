// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract CollateralX {
    // ---- configuration ----------------------------------------------------
    uint256 public constant PERCENT_DENOMINATOR = 10000; // basis points
    uint256 public renterFeeBP = 100; // 1% of collateral paid by renter
    uint256 public ownerFeeBP  = 100; // 1% of final payment collected from owner
    uint256 public feePool;           // accumulated fees in contract

    uint256 public minTrustScore = 0;
    uint256 public maxTrustScore = 100;
    uint256 public constant MIN_DEPOSIT_PERCENT = 30;  // SAFE floor: owners always protected
    uint256 public constant MAX_SCORE_CHANGE    = 5;   // tighter cap per rental
    uint256 public constant EFFECTIVE_SCORE_CAP = 85;  // score above this doesn't reduce deposit
    uint256 public constant SEVERE_DISPUTE_THRESHOLD = 5;  // 5 SEVERE disputes = permanent max collateral

    // ── DISPUTE SYSTEM CONSTANTS ──────────────────────────────────────────
    uint256 public constant DISPUTE_WINDOW = 48 hours;     // time to raise dispute after rental
    uint256 public constant RESPONSE_WINDOW = 72 hours;    // time for accused to respond
    uint256 public constant REDEMPTION_RENTALS = 3;        // successful rentals to halve dispute weight

    // timestamps and durations are stored in seconds
    enum Status { Active, Completed, Disputed, DisputeResolved }

    // ── DISPUTE SEVERITY ──────────────────────────────────────────────────
    // Minor: late return ≤24h, cosmetic wear       → base penalty 3
    // Moderate: damage needing repair, 2+ days late → base penalty 8
    // Severe: theft, major damage, no-show          → base penalty 15
    enum DisputeSeverity { None, Minor, Moderate, Severe }

    // ── DISPUTE RESOLUTION ────────────────────────────────────────────────
    // Pending: just raised, awaiting response
    // Upheld: dispute valid, accused party penalised
    // Rejected: dispute invalid, raiser penalised (prevents abuse)
    // Withdrawn: raiser cancelled dispute
    enum DisputeOutcome { Pending, Upheld, Rejected, Withdrawn }

    struct Dispute {
        uint256 rentalId;
        address raisedBy;           // owner or renter
        address accusedParty;
        DisputeSeverity severity;
        DisputeOutcome outcome;
        uint256 raisedAt;
        uint256 resolvedAt;
        string evidenceHash;        // IPFS hash of evidence (off-chain)
        string responseHash;        // accused party's response
        uint256 compensationAmount; // collateral to transfer if upheld
    }

    struct UserProfile {
        uint256 totalRentals;         // successful completions
        uint256 trustScore;
        uint256 disputesAgainst;      // disputes where this user was accused
        uint256 disputesRaised;       // disputes this user initiated
        uint256 disputesLost;         // false disputes raised (penalised)
        uint256 severeDisputes;       // count of severe disputes against
        uint256 rentalsAfterLastDispute; // for redemption tracking
        uint8   tier;                 // 0=Bronze, 1=Silver, 2=Gold
    }

    // Owner reputation (separate from renter score)
    struct OwnerProfile {
        uint256 totalListings;
        uint256 totalRentalsAsOwner;
        uint256 ownerScore;           // 10-100, affects listing visibility
        uint256 falseDisputesRaised;  // disputes rejected against renters
    }

    struct Listing {
        uint256 id;
        address owner;
        string name;
        uint256 assetValue;
        bool active;

        uint256 minDuration;      // seconds owner allows
        uint256 maxExtension;     // seconds renter may extend
        uint256 rentalFeePerDay;  // measured in wei
        string ownerPhone;
        string location;          // physical pickup/return address
    }

    struct Rental {
        uint256 id;
        uint256 listingId;
        address renter;
        uint256 collateral;       // amount locked
        uint256 finalAmount;      // rental fee owed (computed at start)
        uint256 startTime;
        uint256 endTime;
        uint256 duration;         // seconds agreed
        string renterPhone;
        Status  status;
        bool    finalPaid;
    }

    mapping(address => UserProfile) public users;
    mapping(address => OwnerProfile) public owners;
    mapping(uint256 => Listing) public listings;
    mapping(uint256 => Rental) public rentals;
    mapping(uint256 => Dispute) public disputes;  // rentalId → Dispute

    uint256 public listingCount;
    uint256 public rentalCount;

    // ---- events -----------------------------------------------------------
    event ListingCreated(uint256 id, address owner);
    event RentalStarted(uint256 id, address renter, uint256 collateral, uint256 duration, uint256 finalAmount);
    event RentalCompleted(uint256 id);
    event TrustUpdated(address user, uint256 score);

    // Dispute events
    event DisputeRaised(uint256 rentalId, address raisedBy, address accusedParty, DisputeSeverity severity);
    event DisputeResponseSubmitted(uint256 rentalId, address responder, string responseHash);
    event DisputeResolved(uint256 rentalId, DisputeOutcome outcome, address penalisedParty, uint256 penaltyApplied);
    event DisputeWithdrawn(uint256 rentalId, address withdrawnBy);

    // receipt with humanreadable details for frontend slip generation
    event Receipt(
        uint256 rentalId,
        address owner,
        address renter,
        uint256 collateral,
        uint256 duration,
        uint256 finalAmount,
        uint256 ownerFee,
        uint256 renterFee,
        string ownerPhone,
        string renterPhone
    );

    // ---- user helpers -----------------------------------------------------
    function _initUser(address user) internal {
        if (users[user].trustScore == 0) {
            users[user].trustScore = 50;
            _updateTier(user);
        }
    }

    function _initOwner(address owner) internal {
        if (owners[owner].ownerScore == 0) {
            owners[owner].ownerScore = 50;
        }
    }

    function getUserProfile(address user)
        public
        view
        returns (UserProfile memory)
    {
        UserProfile memory u = users[user];
        if (u.trustScore == 0) {
            u.trustScore = 50;
            u.tier = 0;
        }
        return u;
    }

    function getOwnerProfile(address owner)
        public
        view
        returns (OwnerProfile memory)
    {
        OwnerProfile memory o = owners[owner];
        if (o.ownerScore == 0) {
            o.ownerScore = 50;
        }
        return o;
    }

    function contractBalance() public view returns (uint256) {
        return address(this).balance;
    }

    /// @dev Calculate effective dispute weight considering redemption
    function _getDisputeWeight(address user) internal view returns (uint256) {
        uint256 rentalsAfter = users[user].rentalsAfterLastDispute;
        // Every REDEMPTION_RENTALS successful rentals halves the weight
        // weight = 100 >> (rentalsAfter / REDEMPTION_RENTALS)
        uint256 halvings = rentalsAfter / REDEMPTION_RENTALS;
        if (halvings > 4) halvings = 4;  // cap at 1/16th weight
        return 100 >> halvings;  // 100, 50, 25, 12, 6
    }

    /// @dev Calculate ratio-based penalty reduction.
    /// Formula (per spec): penalty = basePenalty × (disputesLost+1) / (totalRentals+1) × (weight/100)
    /// Uses disputesLost (confirmed bad outcomes) NOT disputesAgainst (all accusations incl. rejected ones)
    function _getRatioPenalty(uint256 basePenalty, address user) internal view returns (uint256) {
        uint256 totalRentals = users[user].totalRentals + 1;     // +1 avoids div-by-zero for new users
        uint256 badDeals     = users[user].disputesLost + 1;     // +1 ensures minimum non-zero weight
        uint256 weight       = _getDisputeWeight(user);
        // penalty = basePenalty × (disputesLost+1) / (totalRentals+1) × (weight/100)
        return (basePenalty * badDeals * weight) / (totalRentals * 100);
    }

    // ---- listing & pricing ------------------------------------------------
    function createListing(
        string memory _name,
        uint256 _value,
        uint256 _minDuration,
        uint256 _maxExtension,
        uint256 _rentalFeePerDay,
        string memory _ownerPhone,
        string memory _location
    ) public {
        require(_value > 0, "Invalid value");
        require(_rentalFeePerDay > 0, "Fee required");

        _initOwner(msg.sender);
        owners[msg.sender].totalListings += 1;

        listingCount++;
        listings[listingCount] = Listing(
            listingCount,
            msg.sender,
            _name,
            _value,
            true,
            _minDuration,
            _maxExtension,
            _rentalFeePerDay,
            _ownerPhone,
            _location
        );

        emit ListingCreated(listingCount, msg.sender);
    }

    // ── DEPOSIT: quadratic curve with SAFE floor ─────────────────────
    //
    //   BUSINESS LOGIC:
    //   - Collateral protects OWNER against damage/theft/non-return
    //   - Trust reduces EXCESS collateral, not core protection
    //   - 30% floor ensures owner can always recover significant value
    //
    //   depositPercent = max( (100 − effScore)² / 100,  30 )
    //   where effScore = min(score, 85)  ← score above 85 gives no extra benefit
    //
    //   ┌───────┬──────────┬──────────────────┬─────────────────────┐
    //   │ Score │ Ours     │ Competitor (50%) │ Owner Protection    │
    //   ├───────┼──────────┼──────────────────┼─────────────────────┤
    //   │  10   │  81 %    │  50 %            │ Full (risky user)   │
    //   │  30   │  49 %    │  50 %            │ High                │
    //   │  50   │  42 %*   │  50 %            │ Good (new user)     │
    //   │  70   │  34 %*   │  50 %            │ Good                │
    //   │  85+  │  30 %*   │  50 %            │ Safe floor          │
    //   └───────┴──────────┴──────────────────┴─────────────────────┘
    //   * Still BETTER than competitors, but owners are protected
    //
    
    function calculateDeposit(
    uint256 _value,
    uint256 _duration,
    address _user
) public view returns (uint256) {

    uint256 score = users[_user].trustScore;

    // Default neutral trust if not initialized
    if (score == 0) {
        score = 50;
    }

    // Severe dispute override → worst trust
    if (users[_user].severeDisputes >= SEVERE_DISPUTE_THRESHOLD) {
        score = 0;
    }

    // Cap effective score at 85 (no benefit above 85)
    uint256 effScore = score > 85 ? 85 : score;

    /*
        depositPercent =
        max(
            30 + 70.75 * ((85 - effScore)^2 / 85^2),
            30
        )

        Integer-safe version:
        70.75 → 7075
        85^2  → 7225
        So denominator = 7225 * 100 = 722500
    */

    uint256 diff = 85 - effScore;

    uint256 pct = 30 + (7075 * diff * diff) / 722500;

    // Enforce 30% safety floor explicitly
    if (pct < 30) {
        pct = 30;
    }

    uint256 base = (_value * pct) / 100;

    // Duration surcharge: +1% per week (max 10%)
    uint256 weeks_ = _duration / 1 weeks;
    uint256 surcharge = (base * weeks_) / 100;
    uint256 maxSurcharge = (base * 10) / 100;

    if (surcharge > maxSurcharge) {
        surcharge = maxSurcharge;
    }

    return base + surcharge;
}

    // ---- rental lifecycle -------------------------------------------------
    function startRental(
        uint256 _listingId,
        uint256 _duration,
        string memory _renterPhone
    ) public payable {
        Listing storage listing = listings[_listingId];
        require(listing.active, "Inactive");
        require(_duration >= listing.minDuration, "Too short");

        _initUser(msg.sender);

        uint256 collateral = calculateDeposit(
            listing.assetValue,
            _duration,
            msg.sender
        );

        require(msg.value == collateral, "Wrong deposit");

        // compute final rental fee
        uint256 days_ = _duration / 1 days;
        uint256 finalAmt = listing.rentalFeePerDay * days_;

        rentalCount++;
        rentals[rentalCount] = Rental(
            rentalCount,
            _listingId,
            msg.sender,
            collateral,
            finalAmt,
            block.timestamp,
            block.timestamp + _duration,
            _duration,
            _renterPhone,
            Status.Active,
            false
        );

        emit RentalStarted(rentalCount, msg.sender, collateral, _duration, finalAmt);
    }

    function extendRental(uint256 _rentalId, uint256 _extra) public {
        Rental storage r = rentals[_rentalId];
        require(r.status == Status.Active, "Not active");
        require(msg.sender == r.renter, "Only renter");

        Listing storage l = listings[r.listingId];
        require(_extra <= l.maxExtension, "Too long");

        r.endTime += _extra;
        r.duration += _extra;
    }

    // ════════════════════════════════════════════════════════════════════
    // ██  FAIR DISPUTE SYSTEM  ██
    // ════════════════════════════════════════════════════════════════════
    //
    //  PRINCIPLES:
    //  1. RATIO-BASED: 1 bad out of 10 good ≠ serial offender
    //  2. REDEMPTION: bad start + good future = recovery possible
    //  3. BILATERAL: owners can also be penalised for false disputes
    //  4. GRADUATED: severity levels (Minor/Moderate/Severe)
    //  5. TIME-BOUND: dispute window + response window
    //
    //  PENALTY FORMULA:
    //  actualPenalty = basePenalty × (disputes+1)/(total+1) × disputeWeight
    //  where disputeWeight halves every 3 successful rentals after dispute
    //
    // ════════════════════════════════════════════════════════════════════

    /// @notice Raise a dispute against the other party
    /// @param _rentalId The rental to dispute
    /// @param _severity Minor(1), Moderate(2), or Severe(3)
    /// @param _evidenceHash IPFS hash of evidence (photos, messages, etc)
    function raiseDispute(
        uint256 _rentalId,
        DisputeSeverity _severity,
        string memory _evidenceHash
    ) public {
        Rental storage r = rentals[_rentalId];
        Listing storage l = listings[r.listingId];

        require(r.status == Status.Active || r.status == Status.Completed, "Invalid status");
        require(_severity != DisputeSeverity.None, "Must specify severity");
        require(disputes[_rentalId].raisedAt == 0, "Dispute already exists");

        // Only owner or renter can raise
        bool isOwner = msg.sender == l.owner;
        bool isRenter = msg.sender == r.renter;
        require(isOwner || isRenter, "Not participant");

        // Must be within dispute window (48h after rental end)
        require(block.timestamp <= r.endTime + DISPUTE_WINDOW, "Dispute window closed");

        address accused = isOwner ? r.renter : l.owner;

        // Calculate compensation based on severity
        uint256 compensation = 0;
        if (isOwner) {
            // Owner disputing renter: claim portion of collateral
            if (_severity == DisputeSeverity.Minor) compensation = r.collateral / 4;      // 25%
            else if (_severity == DisputeSeverity.Moderate) compensation = r.collateral / 2; // 50%
            else compensation = r.collateral;  // 100% for severe
        }

        disputes[_rentalId] = Dispute({
            rentalId: _rentalId,
            raisedBy: msg.sender,
            accusedParty: accused,
            severity: _severity,
            outcome: DisputeOutcome.Pending,
            raisedAt: block.timestamp,
            resolvedAt: 0,
            evidenceHash: _evidenceHash,
            responseHash: "",
            compensationAmount: compensation
        });

        r.status = Status.Disputed;
        users[msg.sender].disputesRaised += 1;

        emit DisputeRaised(_rentalId, msg.sender, accused, _severity);
    }

    /// @notice Accused party submits response/evidence
    function respondToDispute(uint256 _rentalId, string memory _responseHash) public {
        Dispute storage d = disputes[_rentalId];
        require(d.raisedAt > 0, "No dispute");
        require(d.outcome == DisputeOutcome.Pending, "Already resolved");
        require(msg.sender == d.accusedParty, "Not accused party");
        require(block.timestamp <= d.raisedAt + RESPONSE_WINDOW, "Response window closed");

        d.responseHash = _responseHash;
        emit DisputeResponseSubmitted(_rentalId, msg.sender, _responseHash);
    }

    /// @notice Withdraw dispute (raiser admits mistake or settles off-chain)
    function withdrawDispute(uint256 _rentalId) public {
        Dispute storage d = disputes[_rentalId];
        Rental storage r = rentals[_rentalId];

        require(d.raisedAt > 0, "No dispute");
        require(d.outcome == DisputeOutcome.Pending, "Already resolved");
        require(msg.sender == d.raisedBy, "Not raiser");

        d.outcome = DisputeOutcome.Withdrawn;
        d.resolvedAt = block.timestamp;
        r.status = Status.DisputeResolved;

        // Small penalty for wasting time (but much less than false dispute)
        uint256 smallPenalty = 1;
        if (users[msg.sender].trustScore > smallPenalty) {
            users[msg.sender].trustScore -= smallPenalty;
        }

        emit DisputeWithdrawn(_rentalId, msg.sender);
    }

    /// @notice Resolve dispute (in production: called by arbitrator/DAO)
    /// @dev For hackathon: simplified - owner calls to resolve
    /// @param _outcome Upheld (accused guilty) or Rejected (raiser was wrong)
    function resolveDispute(uint256 _rentalId, DisputeOutcome _outcome) public {
        Dispute storage d = disputes[_rentalId];
        Rental storage r = rentals[_rentalId];
        Listing storage l = listings[r.listingId];

        require(d.raisedAt > 0, "No dispute");
        require(d.outcome == DisputeOutcome.Pending, "Already resolved");
        require(_outcome == DisputeOutcome.Upheld || _outcome == DisputeOutcome.Rejected, "Invalid outcome");

        // For hackathon: allow resolution after response window
        // In production: this would be arbitrator/DAO only
        require(block.timestamp > d.raisedAt + RESPONSE_WINDOW, "Response window active");

        d.outcome = _outcome;
        d.resolvedAt = block.timestamp;
        r.status = Status.DisputeResolved;

        uint256 penaltyApplied = 0;
        address penalisedParty;

        if (_outcome == DisputeOutcome.Upheld) {
            // Dispute valid: accused party is penalised
            penalisedParty = d.accusedParty;
            penaltyApplied = _applyDisputePenalty(d.accusedParty, d.severity, l.assetValue);

            // Transfer compensation if owner raised
            if (d.raisedBy == l.owner && d.compensationAmount > 0) {
                uint256 toTransfer = d.compensationAmount > r.collateral ? r.collateral : d.compensationAmount;
                payable(l.owner).transfer(toTransfer);
                // Remaining collateral (if any) returned to renter
                if (r.collateral > toTransfer) {
                    payable(r.renter).transfer(r.collateral - toTransfer);
                }
            }
        } else {
            // Dispute rejected: raiser was wrong → penalise raiser
            penalisedParty = d.raisedBy;
            penaltyApplied = _applyFalseDisputePenalty(d.raisedBy);
            users[d.raisedBy].disputesLost += 1;

            // Also penalise owner score if owner raised false dispute
            if (d.raisedBy == l.owner) {
                owners[l.owner].falseDisputesRaised += 1;
                if (owners[l.owner].ownerScore > 5) {
                    owners[l.owner].ownerScore -= 5;
                }
            }

            // Return full collateral to renter
            payable(r.renter).transfer(r.collateral);
        }

        emit DisputeResolved(_rentalId, _outcome, penalisedParty, penaltyApplied);
    }

    /// @dev Apply penalty considering ratio and redemption
    function _applyDisputePenalty(
        address user,
        DisputeSeverity severity,
        uint256 assetValue
    ) internal returns (uint256) {
        // Base penalties by severity
        uint256 basePenalty;
        if (severity == DisputeSeverity.Minor) basePenalty = 3;
        else if (severity == DisputeSeverity.Moderate) basePenalty = 8;
        else basePenalty = 15;  // Severe

        // Calculate actual penalty with ratio adjustment
        uint256 actualPenalty = _getRatioPenalty(basePenalty, user);
        if (actualPenalty < 1) actualPenalty = 1;  // minimum 1 point

        // Apply penalty
        if (users[user].trustScore > actualPenalty + minTrustScore) {
            users[user].trustScore -= actualPenalty;
        } else {
            users[user].trustScore = minTrustScore;
        }

        // Update counters
        users[user].disputesAgainst += 1;
        users[user].rentalsAfterLastDispute = 0;  // reset redemption counter
        if (severity == DisputeSeverity.Severe) {
            users[user].severeDisputes += 1;
        }

        _updateTier(user);
        emit TrustUpdated(user, users[user].trustScore);

        return actualPenalty;
    }

    /// @dev Penalty for raising false dispute
    function _applyFalseDisputePenalty(address user) internal returns (uint256) {
        // False disputes are penalised to prevent abuse
        // But less harsh than being accused (2 points)
        uint256 penalty = 2;

        if (users[user].trustScore > penalty + minTrustScore) {
            users[user].trustScore -= penalty;
        } else {
            users[user].trustScore = minTrustScore;
        }

        _updateTier(user);
        emit TrustUpdated(user, users[user].trustScore);

        return penalty;
    }

    /// @notice Legacy function for backward compatibility
    function raiseDispute(uint256 _rentalId) public {
        raiseDispute(_rentalId, DisputeSeverity.Moderate, "");
    }

    // renter transfers rental fee to owner through contract
    function payFinalAmount(uint256 _rentalId) public payable {
        Rental storage r = rentals[_rentalId];
        require(msg.sender == r.renter, "Only renter");
        require(!r.finalPaid, "Already paid");
        require(msg.value == r.finalAmount, "Incorrect amount");

        uint256 ownerFee = (msg.value * ownerFeeBP) / PERCENT_DENOMINATOR;
        uint256 net = msg.value - ownerFee;
        feePool += ownerFee;

        payable(listings[r.listingId].owner).transfer(net);
        r.finalPaid = true;
    }

    function completeRental(uint256 _rentalId) public {
        Rental storage r = rentals[_rentalId];
        Listing storage l = listings[r.listingId];
        require(msg.sender == l.owner, "Only owner can complete");
        require(r.status == Status.Active, "Not active");
        require(r.finalPaid, "Fee unpaid");

        r.status = Status.Completed;

        address renter = r.renter;
        address owner = l.owner;
        uint256 collateral = r.collateral;

        // deduct renter fee and refund remainder
        uint256 renterFee = (collateral * renterFeeBP) / PERCENT_DENOMINATOR;
        uint256 refund = collateral - renterFee;
        feePool += renterFee;

        // Update renter stats
        users[renter].totalRentals += 1;
        users[renter].rentalsAfterLastDispute += 1;  // redemption tracking
        _updateTrust(renter, l.assetValue, r.duration, true);

        // Update owner stats
        owners[owner].totalRentalsAsOwner += 1;

        payable(renter).transfer(refund);
        emit RentalCompleted(_rentalId);

        // emit receipt for both parties (using helper to avoid stack too deep)
        _emitReceipt(_rentalId, owner, renter, collateral, renterFee, r);
    }

    /// @dev Helper function to emit Receipt event (avoids stack too deep)
    function _emitReceipt(
        uint256 _rentalId,
        address _owner,
        address _renter,
        uint256 _collateral,
        uint256 _renterFee,
        Rental storage r
    ) internal {
        Listing storage l = listings[r.listingId];
        emit Receipt(
            _rentalId,
            _owner,
            _renter,
            _collateral,
            r.duration,
            r.finalAmount,
            ownerFeeBP == 0 ? 0 : (r.finalAmount * ownerFeeBP) / PERCENT_DENOMINATOR,
            _renterFee,
            l.ownerPhone,
            r.renterPhone
        );
    }

    // ── TRUST & SCORING (hardened non-linear) ────────────────────────
    //
    //  DESIGN PRINCIPLES:
    //
    //  1. CLIMBING IS HARD (exponential decay)
    //     ─ gain = raw × (remaining/max)²
    //     ─ At score 50: receive 25% of raw
    //     ─ At score 80: receive 4% of raw
    //     ─ At score 90: receive 1% of raw (nearly impossible)
    //     ─ Reaching 85+ requires 50+ flawless high-value rentals
    //
    //  2. FALLING IS DEVASTATING (compounding strikes)
    //     ─ Base penalty = raw × 3 (not 2)
    //     ─ Each prior dispute adds +50% to penalty
    //     ─ 1st dispute: ×3, 2nd: ×4.5, 3rd: ×6
    //     ─ 3 disputes = STRIKE_THRESHOLD → permanent max collateral
    //
    //  3. GAINS CAPPED AT 5 PER RENTAL
    //     ─ Even a massive deal can't shortcut trust
    //     ─ Consistency > single big transaction
    //
    //  4. RENTALS REQUIRED TO REACH TIERS (approximate):
    //     ─ Bronze→Silver (40→41): ~15 successful rentals
    //     ─ Silver→Gold (70→71):   ~40 successful rentals
    //     ─ Gold→Elite (85):       ~80 successful rentals
    //     ─ Score 90+: practically impossible
    //

    function _updateTrust(
        address user,
        uint256 _value,
        uint256 _duration,
        bool positive
    ) internal {
        uint256 raw = _rawScoreChange(_value, _duration);

        if (positive) {
            // EXPONENTIAL diminishing: (remaining/max)² makes high scores nearly unreachable
            uint256 remaining = maxTrustScore - users[user].trustScore;
            // gain = raw × (remaining/100)²
            uint256 gain = (raw * remaining * remaining) / (maxTrustScore * maxTrustScore);
            if (gain == 0 && remaining > 0) gain = 1;  // always at least 1 if room exists
            if (gain > MAX_SCORE_CHANGE) gain = MAX_SCORE_CHANGE;

            users[user].trustScore += gain;
            if (users[user].trustScore > maxTrustScore) {
                users[user].trustScore = maxTrustScore;
            }
        } else {
            // COMPOUNDING PENALTIES: base ×3, +50% per prior dispute
            uint256 priorDisputes = users[user].disputesAgainst;  // before this one
            uint256 multiplier = 300 + (priorDisputes * 150);  // 300 = 3×, each adds 1.5×
            uint256 penalty = (raw * multiplier) / 100;

            if (users[user].trustScore > penalty) {
                users[user].trustScore -= penalty;
            } else {
                users[user].trustScore = minTrustScore;
            }
        }
        _updateTier(user);
        emit TrustUpdated(user, users[user].trustScore);
    }

    /// @dev Raw change uses log₂ of value and duration.
    function _rawScoreChange(uint256 _value, uint256 _duration)
        internal
        pure
        returns (uint256)
    {
        uint256 v = _log2(1 + _value / 1 ether);   // log-scaled value
        uint256 d = _log2(1 + _duration / 1 days);  // log-scaled duration
        uint256 base = 3;
        return base + v + d;
    }

    /// @dev Integer floor(log₂(x)).  Returns 0 for x ≤ 1.
    function _log2(uint256 x) internal pure returns (uint256 n) {
        if (x <= 1) return 0;
        // binary search through powers of two
        if (x >= 2**128) { x >>= 128; n += 128; }
        if (x >= 2**64)  { x >>= 64;  n += 64;  }
        if (x >= 2**32)  { x >>= 32;  n += 32;  }
        if (x >= 2**16)  { x >>= 16;  n += 16;  }
        if (x >= 2**8)   { x >>= 8;   n += 8;   }
        if (x >= 2**4)   { x >>= 4;   n += 4;   }
        if (x >= 2**2)   { x >>= 2;   n += 2;   }
        if (x >= 2**1)   { n += 1; }
    }

    function _updateTier(address user) internal {
        uint256 s = users[user].trustScore;
        if (s <= 40) users[user].tier = 0;       // Bronze
        else if (s <= 70) users[user].tier = 1;  // Silver
        else users[user].tier = 2;               // Gold
    }
}
