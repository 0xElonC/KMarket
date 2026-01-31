// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Vault
 * @notice Main vault contract that manages USDC funds and LP liquidity
 * @dev Holds all user deposits and LP liquidity, handles fund transfers
 */
contract Vault is ERC20, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // ============ State Variables ============
    
    /// @notice The USDC token contract
    IERC20 public immutable USDC;
    
    /// @notice The trading engine contract (authorized to request transfers)
    address public tradingEngine;
    
    /// @notice The factory contract (authorized to create and authorize proxies)
    address public factory;
    
    /// @notice Total user balance across all proxy wallets
    uint256 public totalUserBalance;
    
    /// @notice Total LP liquidity provided
    uint256 public totalLPBalance;
    
    /// @notice Reserve buffer for risk management (percentage in basis points, e.g., 500 = 5%)
    uint256 public reserveBufferBps;
    
    /// @notice Locked balance for active bets
    uint256 public totalLockedBalance;
    
    /// @notice Mapping of authorized proxy wallets
    mapping(address => bool) public authorizedProxies;
    
    /// @notice Mapping of user address to their proxy wallet
    mapping(address => address) public userToProxy;
    
    /// @notice Minimum LP deposit amount
    uint256 public minLPDeposit;
    
    /// @notice LP lock period (to prevent flash LP attacks)
    uint256 public lpLockPeriod;
    
    /// @notice LP unlock timestamps
    mapping(address => uint256) public lpUnlockTime;

    // ============ Constants ============
    
    uint256 private constant BASIS_POINTS = 10000;
    uint256 private constant DEFAULT_RESERVE_BUFFER_BPS = 500; // 5%
    uint256 private constant DEFAULT_LP_LOCK_PERIOD = 1 days;
    uint256 private constant DEFAULT_MIN_LP_DEPOSIT = 100e6; // 100 USDC (6 decimals)

    // ============ Events ============
    
    event ProxyAuthorized(address indexed proxy, address indexed user);
    event ProxyDeauthorized(address indexed proxy);
    event TradingEngineUpdated(address indexed oldEngine, address indexed newEngine);
    event DepositFromProxy(address indexed user, address indexed proxy, uint256 amount);
    event TransferToProxy(address indexed proxy, uint256 amount);
    event LiquidityProvided(address indexed provider, uint256 usdcAmount, uint256 lpTokens);
    event LiquidityWithdrawn(address indexed provider, uint256 lpTokens, uint256 usdcAmount);
    event ReserveBufferUpdated(uint256 oldBps, uint256 newBps);
    event BalanceUpdated(uint256 totalUserBalance, uint256 totalLPBalance, uint256 totalLockedBalance);

    // ============ Errors ============
    
    error OnlyTradingEngine();
    error OnlyAuthorizedProxy();
    error ProxyAlreadyAuthorized();
    error ProxyNotAuthorized();
    error InvalidAmount();
    error InsufficientLiquidity();
    error InsufficientBalance();
    error LPStillLocked();
    error BelowMinDeposit();
    error InvalidParameter();

    // ============ Modifiers ============
    
    modifier onlyTradingEngine() {
        if (msg.sender != tradingEngine) revert OnlyTradingEngine();
        _;
    }
    
    modifier onlyAuthorizedProxy() {
        if (!authorizedProxies[msg.sender]) revert OnlyAuthorizedProxy();
        _;
    }

    // ============ Constructor ============
    
    /**
     * @notice Initialize the Vault contract
     * @param _usdc The USDC token address
     * @param _owner The owner address (for admin functions)
     */
    constructor(
        address _usdc,
        address _owner
    ) ERC20("KMarket LP Token", "KMLP") Ownable(_owner) {
        require(_usdc != address(0), "Invalid USDC address");
        
        USDC = IERC20(_usdc);
        reserveBufferBps = DEFAULT_RESERVE_BUFFER_BPS;
        lpLockPeriod = DEFAULT_LP_LOCK_PERIOD;
        minLPDeposit = DEFAULT_MIN_LP_DEPOSIT;
    }

    // ============ Admin Functions ============
    
    /**
     * @notice Set the trading engine contract
     * @param _tradingEngine The trading engine address
     */
    function setTradingEngine(address _tradingEngine) external onlyOwner {
        require(_tradingEngine != address(0), "Invalid address");
        address old = tradingEngine;
        tradingEngine = _tradingEngine;
        emit TradingEngineUpdated(old, _tradingEngine);
    }
    
    /**
     * @notice Set the factory contract
     * @param _factory The factory address
     */
    function setFactory(address _factory) external onlyOwner {
        require(_factory != address(0), "Invalid address");
        factory = _factory;
    }
    
    /**
     * @notice Authorize a proxy wallet
     * @param proxy The proxy wallet address
     * @param user The user who owns the proxy
     */
    function authorizeProxy(address proxy, address user) external {
        require(msg.sender == owner() || msg.sender == factory, "Only owner or factory");
        if (authorizedProxies[proxy]) revert ProxyAlreadyAuthorized();
        
        authorizedProxies[proxy] = true;
        userToProxy[user] = proxy;
        
        emit ProxyAuthorized(proxy, user);
    }
    
    /**
     * @notice Deauthorize a proxy wallet
     * @param proxy The proxy wallet address
     */
    function deauthorizeProxy(address proxy) external onlyOwner {
        if (!authorizedProxies[proxy]) revert ProxyNotAuthorized();
        
        authorizedProxies[proxy] = false;
        
        emit ProxyDeauthorized(proxy);
    }
    
    /**
     * @notice Update reserve buffer percentage
     * @param newBps New reserve buffer in basis points
     */
    function setReserveBuffer(uint256 newBps) external onlyOwner {
        if (newBps > 2000) revert InvalidParameter(); // Max 20%
        
        uint256 old = reserveBufferBps;
        reserveBufferBps = newBps;
        
        emit ReserveBufferUpdated(old, newBps);
    }
    
    /**
     * @notice Update LP lock period
     * @param newPeriod New lock period in seconds
     */
    function setLPLockPeriod(uint256 newPeriod) external onlyOwner {
        if (newPeriod > 30 days) revert InvalidParameter();
        lpLockPeriod = newPeriod;
    }
    
    /**
     * @notice Update minimum LP deposit
     * @param newMin New minimum deposit amount
     */
    function setMinLPDeposit(uint256 newMin) external onlyOwner {
        minLPDeposit = newMin;
    }

    // ============ Proxy Wallet Functions ============
    
    /**
     * @notice Record deposit from proxy wallet (funds already transferred)
     * @param user The user address
     * @param amount The amount of USDC deposited
     * @dev Called by proxy wallet AFTER USDC has been transferred directly from user to vault.
     *      This function only updates accounting, no actual transfer happens here.
     */
    function depositFromProxy(address user, uint256 amount) external onlyAuthorizedProxy nonReentrant {
        if (amount == 0) revert InvalidAmount();
        
        // Note: USDC already transferred directly from user to vault in proxy's deposit()
        // We just update the accounting here
        
        // Update user balance tracking
        totalUserBalance += amount;
        
        emit DepositFromProxy(user, msg.sender, amount);
        emit BalanceUpdated(totalUserBalance, totalLPBalance, totalLockedBalance);
    }
    
    /**
     * @notice Transfer USDC directly to user's EOA (for normal withdrawals)
     * @param user The user's EOA address
     * @param amount The amount to transfer
     * @dev Called by authorized proxy wallets during withdrawal
     *      Users can always withdraw their own funds - no LP liquidity check needed
     */
    function transferToUser(address user, uint256 amount) external nonReentrant {
        if (!authorizedProxies[msg.sender]) revert OnlyAuthorizedProxy();
        if (amount == 0) revert InvalidAmount();
        if (amount > totalUserBalance) revert InsufficientBalance();
        
        // Ensure vault has enough USDC (should always be true if accounting is correct)
        uint256 vaultBalance = USDC.balanceOf(address(this));
        if (amount > vaultBalance) revert InsufficientLiquidity();
        
        // Update user balance tracking
        totalUserBalance -= amount;
        
        // Transfer USDC directly to user's EOA (not to proxy)
        USDC.safeTransfer(user, amount);
        
        emit TransferToProxy(msg.sender, amount); // Keep event name for compatibility
        emit BalanceUpdated(totalUserBalance, totalLPBalance, totalLockedBalance);
    }
    
    /**
     * @notice Emergency transfer for user safety (7-day delay enforced by proxy)
     * @param user The user's EOA address
     * @param amount The amount to transfer
     * @dev Only callable by authorized proxy wallets during emergency withdrawal
     */
    function emergencyTransferToUser(address user, uint256 amount) external nonReentrant {
        if (!authorizedProxies[msg.sender]) revert OnlyAuthorizedProxy();
        if (amount == 0) revert InvalidAmount();
        
        // Emergency withdrawals bypass liquidity checks but still validate total balance
        if (amount > totalUserBalance) revert InsufficientBalance();
        
        // Update user balance tracking
        totalUserBalance -= amount;
        
        // Transfer USDC directly to user's EOA
        USDC.safeTransfer(user, amount);
        
        emit TransferToProxy(msg.sender, amount);
        emit BalanceUpdated(totalUserBalance, totalLPBalance, totalLockedBalance);
    }

    // ============ LP Functions ============
    
    /**
     * @notice Provide liquidity and receive LP tokens
     * @param amount The amount of USDC to provide
     * @return lpTokens The amount of LP tokens minted
     */
    function provideLiquidity(uint256 amount) external nonReentrant returns (uint256 lpTokens) {
        if (amount < minLPDeposit) revert BelowMinDeposit();
        
        // Transfer USDC from LP provider
        USDC.safeTransferFrom(msg.sender, address(this), amount);
        
        // Calculate LP tokens to mint
        uint256 supply = totalSupply();
        if (supply == 0) {
            // First LP provider gets 1:1 ratio
            lpTokens = amount;
        } else {
            // Subsequent LPs get proportional share
            // lpTokens = (amount * totalSupply) / totalLPBalance
            lpTokens = (amount * supply) / totalLPBalance;
        }
        
        // Update balances
        totalLPBalance += amount;
        
        // Set lock time
        lpUnlockTime[msg.sender] = block.timestamp + lpLockPeriod;
        
        // Mint LP tokens
        _mint(msg.sender, lpTokens);
        
        emit LiquidityProvided(msg.sender, amount, lpTokens);
        emit BalanceUpdated(totalUserBalance, totalLPBalance, totalLockedBalance);
    }
    
    /**
     * @notice Withdraw liquidity by burning LP tokens
     * @param lpTokens The amount of LP tokens to burn
     * @return usdcAmount The amount of USDC returned
     */
    function withdrawLiquidity(uint256 lpTokens) external nonReentrant returns (uint256 usdcAmount) {
        if (lpTokens == 0) revert InvalidAmount();
        if (block.timestamp < lpUnlockTime[msg.sender]) revert LPStillLocked();
        
        // Calculate USDC amount to return
        // usdcAmount = (lpTokens * totalLPBalance) / totalSupply
        uint256 supply = totalSupply();
        usdcAmount = (lpTokens * totalLPBalance) / supply;
        
        // Check available liquidity
        uint256 available = getAvailableLiquidity();
        if (usdcAmount > available) revert InsufficientLiquidity();
        
        // Update balances
        totalLPBalance -= usdcAmount;
        
        // Burn LP tokens
        _burn(msg.sender, lpTokens);
        
        // Transfer USDC to LP provider
        USDC.safeTransfer(msg.sender, usdcAmount);
        
        emit LiquidityWithdrawn(msg.sender, lpTokens, usdcAmount);
        emit BalanceUpdated(totalUserBalance, totalLPBalance, totalLockedBalance);
    }

    // ============ Trading Engine Functions ============
    
    /**
     * @notice Update locked balance (called when bets are placed/settled)
     * @param delta The change in locked balance (positive or negative)
     */
    function updateLockedBalance(int256 delta) external onlyTradingEngine {
        if (delta > 0) {
            totalLockedBalance += uint256(delta);
        } else if (delta < 0) {
            uint256 decrease = uint256(-delta);
            if (decrease > totalLockedBalance) {
                totalLockedBalance = 0;
            } else {
                totalLockedBalance -= decrease;
            }
        }
        
        emit BalanceUpdated(totalUserBalance, totalLPBalance, totalLockedBalance);
    }
    
    /**
     * @notice Update user and LP balances after settlement
     * @param userDelta Change in total user balance (can be negative if users lost)
     * @param lpDelta Change in LP balance (opposite of userDelta)
     */
    function settleBalances(int256 userDelta, int256 lpDelta) external onlyTradingEngine {
        // Update user balance
        if (userDelta > 0) {
            totalUserBalance += uint256(userDelta);
        } else if (userDelta < 0) {
            uint256 decrease = uint256(-userDelta);
            if (decrease > totalUserBalance) {
                totalUserBalance = 0;
            } else {
                totalUserBalance -= decrease;
            }
        }
        
        // Update LP balance
        if (lpDelta > 0) {
            totalLPBalance += uint256(lpDelta);
        } else if (lpDelta < 0) {
            uint256 decrease = uint256(-lpDelta);
            if (decrease > totalLPBalance) {
                totalLPBalance = 0;
            } else {
                totalLPBalance -= decrease;
            }
        }
        
        emit BalanceUpdated(totalUserBalance, totalLPBalance, totalLockedBalance);
    }

    // ============ View Functions ============
    
    /**
     * @notice Get available liquidity (not locked or reserved)
     * @return uint256 Available USDC amount
     */
    function getAvailableLiquidity() public view returns (uint256) {
        uint256 totalAssets = USDC.balanceOf(address(this));
        
        // Calculate liabilities
        uint256 userLiabilities = totalUserBalance + totalLockedBalance;
        
        // Calculate reserve requirement
        uint256 reserveRequired = (totalLPBalance * reserveBufferBps) / BASIS_POINTS;
        
        // Available = Total - User Liabilities - Reserve
        if (totalAssets <= userLiabilities + reserveRequired) {
            return 0;
        }
        
        return totalAssets - userLiabilities - reserveRequired;
    }
    
    /**
     * @notice Get total assets in the vault
     * @return uint256 Total USDC balance
     */
    function getTotalAssets() external view returns (uint256) {
        return USDC.balanceOf(address(this));
    }
    
    /**
     * @notice Check if a proxy is authorized
     * @param proxy The proxy address
     * @return bool True if authorized
     */
    function isAuthorizedProxy(address proxy) external view returns (bool) {
        return authorizedProxies[proxy];
    }
    
    /**
     * @notice Get LP unlock time for an address
     * @param provider The LP provider address
     * @return uint256 Unix timestamp when LP can withdraw
     */
    function getLPUnlockTime(address provider) external view returns (uint256) {
        return lpUnlockTime[provider];
    }
    
    /**
     * @notice Calculate LP token value in USDC
     * @param lpTokens Amount of LP tokens
     * @return uint256 USDC value
     */
    function getLPTokenValue(uint256 lpTokens) external view returns (uint256) {
        uint256 supply = totalSupply();
        if (supply == 0) return 0;
        
        return (lpTokens * totalLPBalance) / supply;
    }
}
