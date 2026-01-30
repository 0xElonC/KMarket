// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {UserVault} from "./UserVault.sol";
import {LPPoolVault} from "./LPPoolVault.sol";

contract SettlementBridge is AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");
    bytes32 public constant SETTLER_ROLE = keccak256("SETTLER_ROLE");

    UserVault public immutable userVault;
    LPPoolVault public immutable lpVault;
    address public treasury;

    mapping(uint256 => bool) public epochApplied;

    event EpochApplied(uint256 indexed epochId, int256 userNetPnL, uint256 feesToLP, uint256 feesToTreasury);
    event TreasuryUpdated(address oldTreasury, address newTreasury);

    error EpochAlreadyApplied(uint256 epochId);
    error ZeroAddress();

    constructor(address userVault_, address lpVault_, address admin_, address treasury_) {
        if (userVault_ == address(0) || lpVault_ == address(0) || admin_ == address(0) || treasury_ == address(0)) {
            revert ZeroAddress();
        }
        userVault = UserVault(userVault_);
        lpVault = LPPoolVault(lpVault_);
        treasury = treasury_;

        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
        _grantRole(GUARDIAN_ROLE, admin_);
        _grantRole(SETTLER_ROLE, admin_);
    }

    function applyEpochDelta(
        uint256 epochId,
        int256 userNetPnL,
        uint256 feesToLP,
        uint256 feesToTreasury
    ) external onlyRole(SETTLER_ROLE) nonReentrant whenNotPaused {
        if (epochApplied[epochId]) revert EpochAlreadyApplied(epochId);
        epochApplied[epochId] = true;

        if (userNetPnL > 0) {
            lpVault.bridgePayTo(address(userVault), uint256(userNetPnL), bytes32("USER_WIN"));
        } else if (userNetPnL < 0) {
            uint256 amount = uint256(-userNetPnL);
            userVault.bridgeTransferTo(address(lpVault), amount, bytes32("USER_LOSE"));
            lpVault.bridgeReceiveFrom(address(userVault), amount, bytes32("USER_LOSE"));
        }

        if (feesToLP > 0) {
            userVault.bridgeTransferTo(address(lpVault), feesToLP, bytes32("FEE_TO_LP"));
            lpVault.bridgeReceiveFrom(address(userVault), feesToLP, bytes32("FEE_TO_LP"));
        }

        if (feesToTreasury > 0) {
            userVault.bridgeTransferTo(treasury, feesToTreasury, bytes32("FEE_TO_TREASURY"));
        }

        emit EpochApplied(epochId, userNetPnL, feesToLP, feesToTreasury);
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
}
