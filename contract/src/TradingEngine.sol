// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "./interfaces/IVault.sol";
import "./UserProxyWallet.sol";

/**
 * @title TradingEngine
 * @notice Handles batch settlements and state verification
 * @dev This contract is authorized to update user balances and settle markets
 */
contract TradingEngine is Ownable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // ============ State Variables ============
    
    /// @notice The sequencer address (off-chain backend)
    address public sequencer;
    
    /// @notice The vault contract
    IVault public immutable vault;
    
    /// @notice Current state root (Merkle root of off-chain ledger)
    bytes32 public stateRoot;
    
    /// @notice Last update timestamp
    uint256 public lastUpdateTimestamp;
    
    /// @notice Mapping of user nonces (to prevent replay attacks)
    mapping(address => uint256) public userNonces;
    
    /// @notice Settlement batch counter
    uint256 public settlementBatchCount;
    
    /// @notice Minimum time between state root updates
    uint256 public minStateRootInterval;
    
    /// @notice Maximum users per batch settlement
    uint256 public maxBatchSize;

    // ============ Structs ============
    
    /**
     * @notice Settlement data for batch updates
     */
    struct SettlementBatch {
        address[] users;            // List of users to update
        int256[] balanceDeltas;     // Balance changes (positive for wins, negative for losses)
        uint256[] newNonces;        // New nonces for each user
        uint256 timestamp;          // Timestamp of settlement
        bytes signature;            // Sequencer signature
    }
    
    /**
     * @notice Market settlement data
     */
    struct MarketSettlement {
        uint256 marketId;           // Market identifier
        uint256 finalPrice;         // Final settlement price from oracle
        address[] winners;          // List of winning users
        uint256[] payouts;          // Payout amounts for winners
        address[] losers;           // List of losing users
        uint256[] losses;           // Loss amounts for losers
        uint256 timestamp;
        bytes signature;
    }

    // ============ Events ============
    
    event SequencerUpdated(address indexed oldSequencer, address indexed newSequencer);
    event BatchSettled(uint256 indexed batchId, uint256 userCount, uint256 timestamp);
    event UserSettled(address indexed user, int256 balanceDelta, uint256 newNonce);
    event MarketSettled(uint256 indexed marketId, uint256 finalPrice, uint256 timestamp);
    event StateRootSubmitted(bytes32 indexed newRoot, bytes32 indexed oldRoot, uint256 timestamp);
    event ConfigUpdated(uint256 minInterval, uint256 maxBatch);

    // ============ Errors ============
    
    error OnlySequencer();
    error InvalidSignature();
    error InvalidNonce();
    error InvalidBatchSize();
    error ArrayLengthMismatch();
    error StateRootTooSoon();
    error InvalidTimestamp();
    error ZeroAddress();

    // ============ Modifiers ============
    
    modifier onlySequencer() {
        if (msg.sender != sequencer) revert OnlySequencer();
        _;
    }

    // ============ Constructor ============
    
    /**
     * @notice Initialize the Trading Engine
     * @param _vault The vault contract address
     * @param _sequencer The sequencer address
     * @param _owner The owner address
     */
    constructor(
        address _vault,
        address _sequencer,
        address _owner
    ) Ownable(_owner) {
        require(_vault != address(0), "Invalid vault");
        require(_sequencer != address(0), "Invalid sequencer");
        
        vault = IVault(_vault);
        sequencer = _sequencer;
        minStateRootInterval = 1 hours;
        maxBatchSize = 100;
    }

    // ============ Admin Functions ============
    
    /**
     * @notice Update sequencer address
     * @param newSequencer The new sequencer address
     */
    function setSequencer(address newSequencer) external onlyOwner {
        if (newSequencer == address(0)) revert ZeroAddress();
        
        address old = sequencer;
        sequencer = newSequencer;
        
        emit SequencerUpdated(old, newSequencer);
    }
    
    /**
     * @notice Update configuration parameters
     * @param _minInterval Minimum interval between state root updates
     * @param _maxBatch Maximum users per batch
     */
    function updateConfig(uint256 _minInterval, uint256 _maxBatch) external onlyOwner {
        minStateRootInterval = _minInterval;
        maxBatchSize = _maxBatch;
        
        emit ConfigUpdated(_minInterval, _maxBatch);
    }

    // ============ Settlement Functions ============
    
    /**
     * @notice Batch settle multiple users
     * @param batch The settlement batch data
     */
    function batchSettle(SettlementBatch calldata batch) external onlySequencer {
        // Validate batch
        if (batch.users.length == 0 || batch.users.length > maxBatchSize) {
            revert InvalidBatchSize();
        }
        if (batch.users.length != batch.balanceDeltas.length || 
            batch.users.length != batch.newNonces.length) {
            revert ArrayLengthMismatch();
        }
        if (batch.timestamp > block.timestamp) revert InvalidTimestamp();
        
        // Verify signature
        bytes32 messageHash = keccak256(abi.encode(
            batch.users,
            batch.balanceDeltas,
            batch.newNonces,
            batch.timestamp
        ));
        
        if (!_verifySignature(messageHash, batch.signature)) {
            revert InvalidSignature();
        }
        
        // Process settlements
        int256 totalUserDelta = 0;
        
        for (uint256 i = 0; i < batch.users.length; i++) {
            address user = batch.users[i];
            int256 delta = batch.balanceDeltas[i];
            uint256 newNonce = batch.newNonces[i];
            
            // Verify nonce
            if (newNonce <= userNonces[user]) revert InvalidNonce();
            
            // Update nonce
            userNonces[user] = newNonce;
            
            // Get user's proxy wallet
            address proxy = vault.userToProxy(user);
            if (proxy != address(0)) {
                // Settle on the proxy wallet
                UserProxyWallet(proxy).settle(delta, newNonce);
            }
            
            // Accumulate total change
            totalUserDelta += delta;
            
            emit UserSettled(user, delta, newNonce);
        }
        
        // Update vault balances
        // LP profit/loss is opposite of user profit/loss
        int256 lpDelta = -totalUserDelta;
        vault.settleBalances(totalUserDelta, lpDelta);
        
        // Increment batch count
        settlementBatchCount++;
        
        emit BatchSettled(settlementBatchCount, batch.users.length, batch.timestamp);
    }
    
    /**
     * @notice Settle a specific market
     * @param settlement The market settlement data
     */
    function settleMarket(MarketSettlement calldata settlement) external onlySequencer {
        // Validate settlement
        if (settlement.winners.length != settlement.payouts.length ||
            settlement.losers.length != settlement.losses.length) {
            revert ArrayLengthMismatch();
        }
        if (settlement.timestamp > block.timestamp) revert InvalidTimestamp();
        
        // Verify signature
        bytes32 messageHash = keccak256(abi.encode(
            settlement.marketId,
            settlement.finalPrice,
            settlement.winners,
            settlement.payouts,
            settlement.losers,
            settlement.losses,
            settlement.timestamp
        ));
        
        if (!_verifySignature(messageHash, settlement.signature)) {
            revert InvalidSignature();
        }
        
        // Calculate total payouts and losses
        uint256 totalPayouts = 0;
        uint256 totalLosses = 0;
        
        for (uint256 i = 0; i < settlement.payouts.length; i++) {
            totalPayouts += settlement.payouts[i];
        }
        
        for (uint256 i = 0; i < settlement.losses.length; i++) {
            totalLosses += settlement.losses[i];
        }
        
        // Update locked balance (bets are now settled)
        int256 lockedDelta = -int256(totalPayouts + totalLosses);
        vault.updateLockedBalance(lockedDelta);
        
        // Update balances
        // Net user change = payouts - losses
        int256 userDelta = int256(totalPayouts) - int256(totalLosses);
        int256 lpDelta = -userDelta;
        
        vault.settleBalances(userDelta, lpDelta);
        
        emit MarketSettled(settlement.marketId, settlement.finalPrice, settlement.timestamp);
    }

    // ============ State Root Functions ============
    
    /**
     * @notice Submit a new state root (Merkle root of off-chain ledger)
     * @param newRoot The new state root
     * @param timestamp The timestamp of the state
     * @param signature Sequencer signature
     */
    function submitStateRoot(
        bytes32 newRoot,
        uint256 timestamp,
        bytes calldata signature
    ) external onlySequencer {
        // Check minimum interval
        if (block.timestamp < lastUpdateTimestamp + minStateRootInterval) {
            revert StateRootTooSoon();
        }
        if (timestamp > block.timestamp) revert InvalidTimestamp();
        
        // Verify signature
        bytes32 messageHash = keccak256(abi.encode(newRoot, timestamp));
        if (!_verifySignature(messageHash, signature)) {
            revert InvalidSignature();
        }
        
        bytes32 oldRoot = stateRoot;
        stateRoot = newRoot;
        lastUpdateTimestamp = block.timestamp;
        
        emit StateRootSubmitted(newRoot, oldRoot, timestamp);
    }
    
    /**
     * @notice Verify user account state against Merkle proof
     * @param user The user address
     * @param balance The claimed balance
     * @param nonce The claimed nonce
     * @param proof The Merkle proof
     * @return bool True if proof is valid
     */
    function verifyAccountState(
        address user,
        uint256 balance,
        uint256 nonce,
        bytes32[] calldata proof
    ) external view returns (bool) {
        bytes32 leaf = keccak256(abi.encodePacked(user, balance, nonce));
        return _verifyMerkleProof(proof, stateRoot, leaf);
    }

    // ============ View Functions ============
    
    /**
     * @notice Check if an address is the sequencer
     * @param account The address to check
     * @return bool True if sequencer
     */
    function isSequencer(address account) external view returns (bool) {
        return account == sequencer;
    }
    
    /**
     * @notice Get the current state root
     * @return bytes32 The state root
     */
    function getStateRoot() external view returns (bytes32) {
        return stateRoot;
    }
    
    /**
     * @notice Get user's current nonce
     * @param user The user address
     * @return uint256 The nonce
     */
    function getUserNonce(address user) external view returns (uint256) {
        return userNonces[user];
    }

    // ============ Internal Functions ============
    
    /**
     * @notice Verify ECDSA signature from sequencer
     * @param messageHash The message hash
     * @param signature The signature
     * @return bool True if signature is valid
     */
    function _verifySignature(
        bytes32 messageHash,
        bytes memory signature
    ) internal view returns (bool) {
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();
        address signer = ethSignedHash.recover(signature);
        return signer == sequencer;
    }
    
    /**
     * @notice Verify Merkle proof
     * @param proof The Merkle proof
     * @param root The Merkle root
     * @param leaf The leaf to verify
     * @return bool True if proof is valid
     */
    function _verifyMerkleProof(
        bytes32[] memory proof,
        bytes32 root,
        bytes32 leaf
    ) internal pure returns (bool) {
        bytes32 computedHash = leaf;
        
        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 proofElement = proof[i];
            
            if (computedHash <= proofElement) {
                computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
            } else {
                computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
            }
        }
        
        return computedHash == root;
    }
}
