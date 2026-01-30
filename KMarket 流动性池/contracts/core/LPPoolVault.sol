// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface ILPShare {
    function totalSupply() external view returns (uint256);
    function mint(address to, uint256 amount) external;
    function burn(address from, uint256 amount) external;
}

contract LPPoolVault is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");
    bytes32 public constant SETTLER_ROLE = keccak256("SETTLER_ROLE");
    bytes32 public constant RISK_MANAGER_ROLE = keccak256("RISK_MANAGER_ROLE");

    uint256 public constant RAY = 1e27;

    IERC20 public immutable ASSET;
    ILPShare public immutable LP_SHARE;

    uint256 public equityReserves;
    uint256 public riskReserve;
    uint256 public equityIndexRay;
    address public treasury;

    event LPDeposited(address indexed from, address indexed to, uint256 assets, uint256 scaledShares);
    event LPWithdrawn(address indexed owner, address indexed to, uint256 assets, uint256 scaledShares);
    event EquityUpdated(int256 delta, uint256 newEquityReserves, uint256 newEquityIndexRay);
    event RiskReserveUpdated(uint256 oldReserve, uint256 newReserve);
    event TreasuryUpdated(address oldTreasury, address newTreasury);
    event Skimmed(address indexed to, uint256 amount);
    event BridgeTransfer(address indexed to, uint256 amount, bytes32 reason);

    error ZeroAmount();
    error ZeroAddress();
    error InsufficientLiquidity(uint256 available, uint256 needed);
    error ReserveUnderflow();
    error InvalidAsset();

    constructor(address asset_, address lpShare_, address admin_, address treasury_) {
        if (asset_ == address(0) || lpShare_ == address(0) || admin_ == address(0) || treasury_ == address(0)) {
            revert ZeroAddress();
        }
        if (!_isUSDC(asset_)) {
            revert InvalidAsset();
        }
        ASSET = IERC20(asset_);
        LP_SHARE = ILPShare(lpShare_);
        treasury = treasury_;
        equityIndexRay = RAY;

        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
        _grantRole(GUARDIAN_ROLE, admin_);
        _grantRole(SETTLER_ROLE, admin_);
        _grantRole(RISK_MANAGER_ROLE, admin_);
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

    function depositLP(uint256 assets, address to)
        external
        nonReentrant
        whenNotPaused
        returns (uint256 scaledShares)
    {
        if (assets == 0) revert ZeroAmount();
        if (to == address(0)) revert ZeroAddress();

        ASSET.safeTransferFrom(msg.sender, address(this), assets);

        uint256 totalScaled = LP_SHARE.totalSupply();
        if (totalScaled == 0) {
            equityIndexRay = RAY;
        }
        scaledShares = (assets * RAY) / equityIndexRay;
        if (scaledShares == 0) revert ZeroAmount();

        equityReserves += assets;
        LP_SHARE.mint(to, scaledShares);

        _recomputeIndex(totalScaled + scaledShares);
        emit LPDeposited(msg.sender, to, assets, scaledShares);
        emit EquityUpdated(int256(uint256(assets)), equityReserves, equityIndexRay);
    }

    function redeemLP(uint256 scaledShares, address to)
        external
        nonReentrant
        whenNotPaused
        returns (uint256 assetsOut)
    {
        if (scaledShares == 0) revert ZeroAmount();
        if (to == address(0)) revert ZeroAddress();

        uint256 totalScaled = LP_SHARE.totalSupply();
        assetsOut = (scaledShares * equityIndexRay) / RAY;

        uint256 available = availableLiquidity();
        if (assetsOut > available) revert InsufficientLiquidity(available, assetsOut);

        LP_SHARE.burn(msg.sender, scaledShares);
        equityReserves -= assetsOut;

        _recomputeIndex(totalScaled - scaledShares);
        emit LPWithdrawn(msg.sender, to, assetsOut, scaledShares);
        emit EquityUpdated(-int256(uint256(assetsOut)), equityReserves, equityIndexRay);

        ASSET.safeTransfer(to, assetsOut);
    }

    function bridgePayTo(address to, uint256 amount, bytes32 reason)
        external
        onlyRole(SETTLER_ROLE)
        nonReentrant
        whenNotPaused
    {
        if (amount == 0) revert ZeroAmount();
        if (to == address(0)) revert ZeroAddress();

        uint256 available = availableLiquidity();
        if (amount > available) revert InsufficientLiquidity(available, amount);

        uint256 totalScaled = LP_SHARE.totalSupply();
        equityReserves -= amount;
        _recomputeIndex(totalScaled);
        emit EquityUpdated(-int256(uint256(amount)), equityReserves, equityIndexRay);

        ASSET.safeTransfer(to, amount);
        emit BridgeTransfer(to, amount, reason);
    }

    function bridgeReceiveFrom(address, uint256 amount, bytes32 reason)
        external
        onlyRole(SETTLER_ROLE)
        nonReentrant
        whenNotPaused
    {
        if (amount == 0) revert ZeroAmount();

        uint256 totalScaled = LP_SHARE.totalSupply();
        equityReserves += amount;
        _recomputeIndex(totalScaled);
        emit EquityUpdated(int256(uint256(amount)), equityReserves, equityIndexRay);
        emit BridgeTransfer(address(this), amount, reason);
    }

    function setRiskReserve(uint256 newReserve) external onlyRole(RISK_MANAGER_ROLE) {
        if (newReserve > equityReserves) revert ReserveUnderflow();
        uint256 oldReserve = riskReserve;
        riskReserve = newReserve;
        emit RiskReserveUpdated(oldReserve, newReserve);
    }

    function setTreasury(address newTreasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newTreasury == address(0)) revert ZeroAddress();
        address oldTreasury = treasury;
        treasury = newTreasury;
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }

    function pause() external onlyRole(GUARDIAN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(GUARDIAN_ROLE) {
        _unpause();
    }

    function availableLiquidity() public view returns (uint256) {
        if (equityReserves < riskReserve) revert ReserveUnderflow();
        return equityReserves - riskReserve;
    }

    function skimExcess(address to) external onlyRole(RISK_MANAGER_ROLE) nonReentrant whenNotPaused returns (uint256 amount) {
        if (to == address(0)) revert ZeroAddress();
        uint256 bal = ASSET.balanceOf(address(this));
        if (bal <= equityReserves) return 0;
        amount = bal - equityReserves;
        ASSET.safeTransfer(to, amount);
        emit Skimmed(to, amount);
    }

    function _recomputeIndex(uint256 totalScaled) internal {
        if (totalScaled == 0) {
            equityIndexRay = RAY;
        } else {
            equityIndexRay = (equityReserves * RAY) / totalScaled;
        }
    }
}
