// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract UserVault is AccessControl, Pausable, ReentrancyGuard, EIP712 {
    using SafeERC20 for IERC20;

    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");
    bytes32 public constant SETTLER_ROLE = keccak256("SETTLER_ROLE");

    IERC20 public immutable ASSET;
    address public couponSigner;

    mapping(address => uint256) public deposited;
    mapping(address => uint256) public withdrawn;
    mapping(address => uint256) public couponNonces;
    bool public depositsPaused;
    bool public emergencyMode;
    uint256 public challengePeriod;

    enum ForceExitStatus {
        NONE,
        REQUESTED,
        CANCELLED,
        EXECUTED
    }

    struct ForceExit {
        address account;
        address to;
        uint256 amount;
        uint256 requestedAt;
        uint256 executableAt;
        ForceExitStatus status;
    }

    mapping(bytes32 => ForceExit) public forceExits;
    mapping(address => bytes32) public activeForceExit;
    mapping(address => uint256) public forceExitNonce;

    bytes32 public constant WITHDRAW_TYPEHASH =
        keccak256("Withdraw(address account,address to,uint256 amount,uint256 nonce,uint256 expiry)");

    event Deposited(address indexed from, address indexed account, uint256 amount);
    event Withdrawn(address indexed account, address indexed to, uint256 amount, uint256 nonce);
    event CouponSignerUpdated(address indexed oldSigner, address indexed newSigner);
    event BridgeTransfer(address indexed to, uint256 amount, bytes32 reason);
    event ForceExitRequested(
        bytes32 indexed requestId,
        address indexed account,
        address indexed to,
        uint256 amount,
        uint256 executableAt
    );
    event ForceExitCancelled(bytes32 indexed requestId, address indexed account, bytes32 reason);
    event ForceExitExecuted(bytes32 indexed requestId, address indexed account, address indexed to, uint256 amount);
    event EmergencyModeUpdated(bool enabled);
    event ChallengePeriodUpdated(uint256 oldPeriod, uint256 newPeriod);

    error ZeroAmount();
    error DepositsPaused();
    error CouponExpired();
    error InvalidNonce(uint256 expected, uint256 got);
    error InvalidSignature();
    error ZeroAddress();
    error InvalidAccount();
    error InvalidAsset();
    error EmergencyModeDisabled();
    error ForceExitAlreadyActive(bytes32 activeRequestId);
    error ForceExitNotRequested();
    error ForceExitNotExecutable(uint256 executableAt);
    error ForceExitNotAuthorized();
    error NetDepositUnderflow();
    error InsufficientEmergencyBalance(uint256 available, uint256 needed);

    struct WithdrawCoupon {
        address account;
        address to;
        uint256 amount;
        uint256 nonce;
        uint256 expiry;
    }

    constructor(address asset_, address admin_, address couponSigner_)
        EIP712("KMarketUserVault", "1")
    {
        if (asset_ == address(0) || admin_ == address(0) || couponSigner_ == address(0)) {
            revert ZeroAddress();
        }
        if (!_isUSDC(asset_)) {
            revert InvalidAsset();
        }
        ASSET = IERC20(asset_);
        couponSigner = couponSigner_;
        challengePeriod = 1 days;

        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
        _grantRole(GUARDIAN_ROLE, admin_);
        _grantRole(SETTLER_ROLE, admin_);
    }

    function _isUSDC(address asset_) internal view returns (bool) {
        try IERC20Metadata(asset_).decimals() returns (uint8 decimals) {
            if (decimals != 6) return false;
        } catch {
            return false;
        }
        try IERC20Metadata(asset_).symbol() returns (string memory symbol) {
            return keccak256(bytes(symbol)) == keccak256(bytes("USDC"));
        } catch {
            return false;
        }
    }

    function deposit(uint256 amount, address account) external nonReentrant whenNotPaused {
        if (depositsPaused) revert DepositsPaused();
        if (amount == 0) revert ZeroAmount();
        if (account == address(0)) revert InvalidAccount();

        ASSET.safeTransferFrom(msg.sender, address(this), amount);
        deposited[account] += amount;
        emit Deposited(msg.sender, account, amount);
    }

    function withdrawWithCoupon(WithdrawCoupon calldata c, bytes calldata sig)
        external
        nonReentrant
        whenNotPaused
    {
        if (c.amount == 0) revert ZeroAmount();
        if (block.timestamp > c.expiry) revert CouponExpired();
        if (c.account != msg.sender) revert InvalidAccount();

        uint256 currentNonce = couponNonces[c.account];
        if (c.nonce != currentNonce) revert InvalidNonce(currentNonce, c.nonce);

        bytes32 digest = _hashTypedDataV4(
            keccak256(abi.encode(WITHDRAW_TYPEHASH, c.account, c.to, c.amount, c.nonce, c.expiry))
        );
        address signer = ECDSA.recover(digest, sig);
        if (signer != couponSigner) revert InvalidSignature();

        uint256 available = emergencyAvailable(c.account);
        if (c.amount > available) revert InsufficientEmergencyBalance(available, c.amount);

        couponNonces[c.account] = currentNonce + 1;
        withdrawn[c.account] += c.amount;

        ASSET.safeTransfer(c.to, c.amount);
        emit Withdrawn(c.account, c.to, c.amount, c.nonce);
    }

    function requestForceExit(uint256 amount, address to)
        external
        nonReentrant
        returns (bytes32 requestId)
    {
        if (!emergencyMode) revert EmergencyModeDisabled();
        bytes32 activeRequestId = activeForceExit[msg.sender];
        if (activeRequestId != bytes32(0)) revert ForceExitAlreadyActive(activeRequestId);
        if (amount == 0) revert ZeroAmount();
        if (to == address(0)) revert InvalidAccount();

        uint256 available = emergencyAvailable(msg.sender);
        if (amount > available) revert InsufficientEmergencyBalance(available, amount);

        uint256 nonce = forceExitNonce[msg.sender]++;
        requestId = keccak256(abi.encodePacked(msg.sender, nonce, amount, to));

        uint256 executableAt = block.timestamp + challengePeriod;
        forceExits[requestId] = ForceExit({
            account: msg.sender,
            to: to,
            amount: amount,
            requestedAt: block.timestamp,
            executableAt: executableAt,
            status: ForceExitStatus.REQUESTED
        });
        activeForceExit[msg.sender] = requestId;

        emit ForceExitRequested(requestId, msg.sender, to, amount, executableAt);
    }

    function cancelForceExit(bytes32 requestId, bytes32 reason) external nonReentrant {
        ForceExit storage req = forceExits[requestId];
        if (req.status != ForceExitStatus.REQUESTED) revert ForceExitNotRequested();
        if (msg.sender != req.account && !hasRole(SETTLER_ROLE, msg.sender)) {
            revert ForceExitNotAuthorized();
        }

        req.status = ForceExitStatus.CANCELLED;
        activeForceExit[req.account] = bytes32(0);

        emit ForceExitCancelled(requestId, req.account, reason);
    }

    function executeForceExit(bytes32 requestId) external nonReentrant {
        if (!emergencyMode) revert EmergencyModeDisabled();

        ForceExit storage req = forceExits[requestId];
        if (req.status != ForceExitStatus.REQUESTED) revert ForceExitNotRequested();
        if (block.timestamp < req.executableAt) revert ForceExitNotExecutable(req.executableAt);
        if (msg.sender != req.account && msg.sender != req.to) revert ForceExitNotAuthorized();

        uint256 available = emergencyAvailable(req.account);
        if (req.amount > available) revert InsufficientEmergencyBalance(available, req.amount);

        withdrawn[req.account] += req.amount;
        req.status = ForceExitStatus.EXECUTED;
        activeForceExit[req.account] = bytes32(0);

        ASSET.safeTransfer(req.to, req.amount);
        emit ForceExitExecuted(requestId, req.account, req.to, req.amount);
    }

    function emergencyAvailable(address account) public view returns (uint256) {
        uint256 dep = deposited[account];
        uint256 wd = withdrawn[account];
        if (wd > dep) revert NetDepositUnderflow();
        return dep - wd;
    }

    function setEmergencyMode(bool enabled) external onlyRole(GUARDIAN_ROLE) {
        emergencyMode = enabled;
        emit EmergencyModeUpdated(enabled);
    }

    function setChallengePeriod(uint256 newPeriod) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 oldPeriod = challengePeriod;
        challengePeriod = newPeriod;
        emit ChallengePeriodUpdated(oldPeriod, newPeriod);
    }

    function setCouponSigner(address newSigner) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newSigner == address(0)) revert ZeroAddress();
        address oldSigner = couponSigner;
        couponSigner = newSigner;
        emit CouponSignerUpdated(oldSigner, newSigner);
    }

    function nonces(address account) external view returns (uint256) {
        return couponNonces[account];
    }

    function pauseDeposits(bool paused) external onlyRole(GUARDIAN_ROLE) {
        depositsPaused = paused;
    }

    function pause() external onlyRole(GUARDIAN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(GUARDIAN_ROLE) {
        _unpause();
    }

    function bridgeTransferTo(address to, uint256 amount, bytes32 reason)
        external
        onlyRole(SETTLER_ROLE)
        nonReentrant
        whenNotPaused
    {
        if (amount == 0) revert ZeroAmount();
        ASSET.safeTransfer(to, amount);
        emit BridgeTransfer(to, amount, reason);
    }
}
