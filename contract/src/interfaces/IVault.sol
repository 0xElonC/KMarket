// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IVault
 * @notice Interface for the main Vault contract that manages USDC funds
 */
interface IVault {
    /**
     * @notice Record deposit from proxy wallet (funds already transferred)
     * @param user The user's address
     * @param amount The amount of USDC deposited
     */
    function depositFromProxy(address user, uint256 amount) external;
    
    /**
     * @notice Transfer USDC directly to user's EOA (for normal withdrawals)
     * @param user The user's EOA address
     * @param amount The amount of USDC to transfer
     */
    function transferToUser(address user, uint256 amount) external;
    
    /**
     * @notice Emergency transfer to user's EOA (bypasses liquidity checks)
     * @param user The user's EOA address
     * @param amount The amount of USDC to transfer
     */
    function emergencyTransferToUser(address user, uint256 amount) external;
    
    /**
     * @notice Check if a proxy wallet is authorized
     * @param proxy The proxy wallet address to check
     * @return bool True if authorized
     */
    function isAuthorizedProxy(address proxy) external view returns (bool);
    
    /**
     * @notice Authorize a proxy wallet
     * @param proxy The proxy wallet address
     * @param user The user who owns the proxy
     */
    function authorizeProxy(address proxy, address user) external;
    
    /**
     * @notice Update locked balance for active bets
     * @param delta The change in locked balance
     */
    function updateLockedBalance(int256 delta) external;
    
    /**
     * @notice Settle balances after market resolution
     * @param userDelta Change in total user balance
     * @param lpDelta Change in LP balance
     */
    function settleBalances(int256 userDelta, int256 lpDelta) external;
    
    /**
     * @notice Get user's proxy wallet address
     * @param user The user address
     * @return proxy The proxy wallet address
     */
    function userToProxy(address user) external view returns (address proxy);
}
