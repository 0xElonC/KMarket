// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./UserProxyWallet.sol";
import "./Vault.sol";

/**
 * @title ProxyWalletFactory
 * @notice Factory contract to deploy UserProxyWallet contracts for users
 * @dev Uses CREATE2 for deterministic addresses
 */
contract ProxyWalletFactory is Ownable {
    // ============ State Variables ============
    
    /// @notice The Vault contract
    Vault public immutable vault;
    
    /// @notice The USDC token address
    address public immutable usdc;
    
    /// @notice The TradingEngine contract
    address public immutable tradingEngine;
    
    /// @notice Mapping of user to their proxy wallet
    mapping(address => address) public userProxies;
    
    /// @notice Reverse mapping: proxy wallet to user
    mapping(address => address) public proxyToUser;
    
    /// @notice List of all deployed proxies
    address[] public allProxies;
    
    /// @notice Whether a user has a proxy
    mapping(address => bool) public hasProxy;

    // ============ Events ============
    
    event ProxyCreated(
        address indexed user,
        address indexed proxy,
        uint256 index
    );

    // ============ Errors ============
    
    error ProxyAlreadyExists();
    error ProxyCreationFailed();
    error InvalidAddress();

    // ============ Constructor ============
    
    /**
     * @notice Initialize the factory
     * @param _vault The Vault contract address
     * @param _usdc The USDC token address
     * @param _tradingEngine The TradingEngine address
     * @param _owner The owner address
     */
    constructor(
        address _vault,
        address _usdc,
        address _tradingEngine,
        address _owner
    ) Ownable(_owner) {
        if (_vault == address(0)) revert InvalidAddress();
        if (_usdc == address(0)) revert InvalidAddress();
        if (_tradingEngine == address(0)) revert InvalidAddress();
        
        vault = Vault(_vault);
        usdc = _usdc;
        tradingEngine = _tradingEngine;
    }

    // ============ External Functions ============
    
    /**
     * @notice Create a proxy wallet for a user
     * @param user The user address
     * @return proxy The deployed proxy wallet address
     */
    function createProxyWallet(address user) external returns (address proxy) {
        if (user == address(0)) revert InvalidAddress();
        if (hasProxy[user]) revert ProxyAlreadyExists();
        
        // Deploy proxy wallet
        proxy = address(new UserProxyWallet(
            user,
            address(vault),
            usdc,
            tradingEngine
        ));
        
        if (proxy == address(0)) revert ProxyCreationFailed();
        
        // Update mappings
        userProxies[user] = proxy;
        proxyToUser[proxy] = user;
        hasProxy[user] = true;
        allProxies.push(proxy);
        
        // Authorize proxy in vault
        vault.authorizeProxy(proxy, user);
        
        emit ProxyCreated(user, proxy, allProxies.length - 1);
    }
    
    /**
     * @notice Create proxy wallet with deterministic address using CREATE2
     * @param user The user address
     * @param salt A salt for CREATE2
     * @return proxy The deployed proxy wallet address
     */
    function createProxyWalletDeterministic(
        address user,
        bytes32 salt
    ) external returns (address proxy) {
        if (user == address(0)) revert InvalidAddress();
        if (hasProxy[user]) revert ProxyAlreadyExists();
        
        // Calculate deterministic address
        bytes memory bytecode = abi.encodePacked(
            type(UserProxyWallet).creationCode,
            abi.encode(user, address(vault), usdc, tradingEngine)
        );
        
        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0xff),
                address(this),
                salt,
                keccak256(bytecode)
            )
        );
        
        proxy = address(uint160(uint256(hash)));
        
        // Deploy using CREATE2
        assembly {
            proxy := create2(0, add(bytecode, 0x20), mload(bytecode), salt)
        }
        
        if (proxy == address(0)) revert ProxyCreationFailed();
        
        // Update mappings
        userProxies[user] = proxy;
        proxyToUser[proxy] = user;
        hasProxy[user] = true;
        allProxies.push(proxy);
        
        // Authorize proxy in vault
        vault.authorizeProxy(proxy, user);
        
        emit ProxyCreated(user, proxy, allProxies.length - 1);
    }
    
    /**
     * @notice Batch create proxy wallets for multiple users
     * @param users Array of user addresses
     * @return proxies Array of deployed proxy addresses
     */
    function batchCreateProxyWallets(
        address[] calldata users
    ) external returns (address[] memory proxies) {
        proxies = new address[](users.length);
        
        for (uint256 i = 0; i < users.length; i++) {
            if (users[i] == address(0)) revert InvalidAddress();
            if (hasProxy[users[i]]) {
                // Skip if already has proxy
                proxies[i] = userProxies[users[i]];
                continue;
            }
            
            // Deploy proxy wallet
            address proxy = address(new UserProxyWallet(
                users[i],
                address(vault),
                usdc,
                tradingEngine
            ));
            
            if (proxy == address(0)) revert ProxyCreationFailed();
            
            // Update mappings
            userProxies[users[i]] = proxy;
            proxyToUser[proxy] = users[i];
            hasProxy[users[i]] = true;
            allProxies.push(proxy);
            proxies[i] = proxy;
            
            // Authorize proxy in vault
            vault.authorizeProxy(proxy, users[i]);
            
            emit ProxyCreated(users[i], proxy, allProxies.length - 1);
        }
    }

    // ============ View Functions ============
    
    /**
     * @notice Get proxy wallet for a user
     * @param user The user address
     * @return proxy The proxy wallet address (0x0 if none)
     */
    function getProxyWallet(address user) external view returns (address proxy) {
        return userProxies[user];
    }
    
    /**
     * @notice Get user for a proxy wallet
     * @param proxy The proxy wallet address
     * @return user The user address (0x0 if none)
     */
    function getProxyUser(address proxy) external view returns (address user) {
        return proxyToUser[proxy];
    }
    
    /**
     * @notice Get total number of proxies deployed
     * @return uint256 The count
     */
    function getProxyCount() external view returns (uint256) {
        return allProxies.length;
    }
    
    /**
     * @notice Get all proxies
     * @return address[] Array of all proxy addresses
     */
    function getAllProxies() external view returns (address[] memory) {
        return allProxies;
    }
    
    /**
     * @notice Get proxies in a range
     * @param start Start index
     * @param end End index (exclusive)
     * @return address[] Array of proxy addresses
     */
    function getProxiesInRange(
        uint256 start,
        uint256 end
    ) external view returns (address[] memory) {
        require(end <= allProxies.length, "Invalid range");
        require(start < end, "Invalid range");
        
        uint256 length = end - start;
        address[] memory proxies = new address[](length);
        
        for (uint256 i = 0; i < length; i++) {
            proxies[i] = allProxies[start + i];
        }
        
        return proxies;
    }
    
    /**
     * @notice Compute deterministic proxy address
     * @param user The user address
     * @param salt The salt
     * @return predicted The predicted proxy address
     */
    function computeProxyAddress(
        address user,
        bytes32 salt
    ) external view returns (address predicted) {
        bytes memory bytecode = abi.encodePacked(
            type(UserProxyWallet).creationCode,
            abi.encode(user, address(vault), usdc, tradingEngine)
        );
        
        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0xff),
                address(this),
                salt,
                keccak256(bytecode)
            )
        );
        
        predicted = address(uint160(uint256(hash)));
    }
}
