// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IVault.sol";
import "./interfaces/ITradingEngine.sol";

/**
 * @title UserProxyWallet
 * @notice Individual proxy wallet for each user to hold USDC and market positions
 * @dev This contract acts as a custodial wallet controlled by the user but authorized for trading engine operations
 */
contract UserProxyWallet is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ Immutable State Variables ============
    
    /// @notice The owner of this proxy wallet (user's EOA)
    address public immutable owner;
    
    /// @notice The main vault contract
    IVault public immutable vault;
    
    /// @notice The USDC token contract
    IERC20 public immutable USDC;
    
    /// @notice The trading engine contract
    ITradingEngine public immutable tradingEngine;

    // ============ Mutable State Variables ============
    
    /// @notice Last settled nonce (tracks synchronization with on-chain state)
    uint256 public lastSettledNonce;
    
    /// @notice Current on-chain deposit balance
    uint256 public depositBalance;
    
    /// @notice Emergency withdrawal request timestamp (0 if not requested)
    uint256 public emergencyRequestTime;
    
    /// @notice Emergency withdrawal delay period (7 days)
    uint256 public constant EMERGENCY_DELAY = 7 days;

    // ============ Events ============
    
    event Deposited(address indexed user, uint256 amount, uint256 newBalance);
    event Withdrawn(address indexed user, uint256 amount, uint256 newBalance);
    event Settled(uint256 indexed nonce, int256 balanceDelta, uint256 timestamp);
    event EmergencyWithdrawRequested(address indexed user, uint256 timestamp);
    event EmergencyWithdrawExecuted(address indexed user, uint256 amount);
    event EmergencyWithdrawCancelled(address indexed user);

    // ============ Errors ============
    
    error OnlyOwner();
    error OnlyTradingEngine();
    error InsufficientBalance();
    error InvalidAmount();
    error EmergencyAlreadyRequested();
    error EmergencyNotRequested();
    error EmergencyDelayNotMet();
    error InvalidNonce();
    error DepositFailed();
    error WithdrawFailed();

    // ============ Modifiers ============
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }
    
    modifier onlyTradingEngine() {
        if (msg.sender != address(tradingEngine)) revert OnlyTradingEngine();
        _;
    }

    // ============ Constructor ============
    
    /**
     * @notice Initialize the proxy wallet for a user
     * @param _owner The user's EOA address
     * @param _vault The main vault contract
     * @param _usdc The USDC token contract
     * @param _tradingEngine The trading engine contract
     */
    constructor(
        address _owner,
        address _vault,
        address _usdc,
        address _tradingEngine
    ) {
        require(_owner != address(0), "Invalid owner");
        require(_vault != address(0), "Invalid vault");
        require(_usdc != address(0), "Invalid USDC");
        require(_tradingEngine != address(0), "Invalid trading engine");
        
        owner = _owner;
        vault = IVault(_vault);
        USDC = IERC20(_usdc);
        tradingEngine = ITradingEngine(_tradingEngine);
    }

    // ============ External Functions ============
    
    /**
     * @notice Deposit USDC directly into the Vault (proxy doesn't hold funds)
     * @param amount The amount of USDC to deposit
     * @dev User must approve this proxy contract to spend USDC first.
     *      Funds are transferred directly from user to Vault in a single transaction.
     *      This proxy only tracks the balance but never holds USDC.
     */
    function deposit(uint256 amount) external onlyOwner nonReentrant {
        if (amount == 0) revert InvalidAmount();
        
        // Transfer USDC directly from user to Vault (single transfer, gas efficient)
        USDC.safeTransferFrom(msg.sender, address(vault), amount);
        
        // Update balance tracking
        depositBalance += amount;
        
        // Notify vault to update accounting (funds already received)
        vault.depositFromProxy(owner, amount);
        
        emit Deposited(owner, amount, depositBalance);
    }
    
    function depositmock(uint256 amount) external onlyOwner nonReentrant {
        if (amount == 0) revert InvalidAmount();
        
        // Transfer USDC directly from user to Vault (single transfer, gas efficient)
        //USDC.safeTransferFrom(msg.sender, address(vault), amount);
        
        // Update balance tracking
        depositBalance += amount;
        
        // Notify vault to update accounting (funds already received)
        //vault.depositFromProxy(owner, amount);
        
        emit Deposited(owner, amount, depositBalance);
    }

    /**
     * @notice Withdraw USDC directly from Vault to user (proxy doesn't hold funds)
     * @param amount The amount to withdraw
     * @dev This requires prior settlement of off-chain balance via trading engine.
     *      Funds are transferred directly from Vault to user's EOA.
     */
    function withdraw(uint256 amount) external onlyOwner nonReentrant {
        if (amount == 0) revert InvalidAmount();
        if (amount > depositBalance) revert InsufficientBalance();
        
        // Update balance tracking first
        depositBalance -= amount;
        
        // Request Vault to transfer directly to user's EOA (not to this proxy)
        vault.transferToUser(owner, amount);
        
        emit Withdrawn(owner, amount, depositBalance);
    }
    
    /**
     * @notice Settle the user's off-chain balance changes on-chain
     * @param balanceDelta The balance change (positive for profit, negative for loss)
     * @param nonce The new nonce after settlement
     * @dev Only callable by trading engine during batch settlement
     */
    function settle(int256 balanceDelta, uint256 nonce) external onlyTradingEngine {
        if (nonce <= lastSettledNonce) revert InvalidNonce();
        
        // Update on-chain balance based on off-chain trading results
        if (balanceDelta > 0) {
            // User won, increase balance
            depositBalance += uint256(balanceDelta);
        } else if (balanceDelta < 0) {
            // User lost, decrease balance
            uint256 loss = uint256(-balanceDelta);
            if (loss > depositBalance) {
                // Should not happen, but protect against underflow
                depositBalance = 0;
            } else {
                depositBalance -= loss;
            }
        }
        
        // Update nonce
        lastSettledNonce = nonce;
        
        emit Settled(nonce, balanceDelta, block.timestamp);
    }

    // ============ Emergency Withdrawal Functions ============
    
    /**
     * @notice Request emergency withdrawal (in case backend is down or malicious)
     * @dev Starts a 7-day delay period before execution is allowed
     */
    function requestEmergencyWithdraw() external onlyOwner {
        if (emergencyRequestTime != 0) revert EmergencyAlreadyRequested();
        
        emergencyRequestTime = block.timestamp;
        
        emit EmergencyWithdrawRequested(owner, block.timestamp);
    }
    
    /**
     * @notice Execute emergency withdrawal after delay period
     * @dev Withdraws all user balance from Vault directly to owner.
     *      Since this proxy never holds USDC, we retrieve from Vault.
     */
    function executeEmergencyWithdraw() external onlyOwner nonReentrant {
        if (emergencyRequestTime == 0) revert EmergencyNotRequested();
        if (block.timestamp < emergencyRequestTime + EMERGENCY_DELAY) {
            revert EmergencyDelayNotMet();
        }
        
        uint256 balance = depositBalance;
        
        // Reset emergency state
        emergencyRequestTime = 0;
        depositBalance = 0;
        
        // Request Vault to transfer user's balance directly to owner
        if (balance > 0) {
            vault.emergencyTransferToUser(owner, balance);
        }
        
        emit EmergencyWithdrawExecuted(owner, balance);
    }
    
    /**
     * @notice Cancel emergency withdrawal request
     * @dev Allows user to cancel if backend comes back online
     */
    function cancelEmergencyWithdraw() external onlyOwner {
        if (emergencyRequestTime == 0) revert EmergencyNotRequested();
        
        emergencyRequestTime = 0;
        
        emit EmergencyWithdrawCancelled(owner);
    }

    // ============ View Functions ============
    
    /**
     * @notice Get the tracked deposit balance (actual USDC is in Vault, not here)
     * @return uint256 The tracked deposit balance
     * @dev This proxy wallet does NOT hold USDC. All funds are in the Vault.
     *      This returns the tracked balance, not USDC.balanceOf(this).
     */
    function getUSDCBalance() external view returns (uint256) {
        return depositBalance;
    }
    
    /**
     * @notice Check if emergency withdrawal is pending
     * @return bool True if emergency withdrawal was requested
     */
    function isEmergencyPending() external view returns (bool) {
        return emergencyRequestTime != 0;
    }
    
    /**
     * @notice Get time remaining until emergency withdrawal can be executed
     * @return uint256 Seconds remaining (0 if executable or not requested)
     */
    function emergencyTimeRemaining() external view returns (uint256) {
        if (emergencyRequestTime == 0) return 0;
        
        uint256 executeTime = emergencyRequestTime + EMERGENCY_DELAY;
        if (block.timestamp >= executeTime) return 0;
        
        return executeTime - block.timestamp;
    }
}
