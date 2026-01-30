// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ITradingEngine
 * @notice Interface for the TradingEngine contract that handles settlements
 */
interface ITradingEngine {
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
     * @notice Check if an address is the authorized sequencer
     * @param account The address to check
     * @return bool True if authorized sequencer
     */
    function isSequencer(address account) external view returns (bool);
    
    /**
     * @notice Get the current state root
     * @return bytes32 The merkle root of current state
     */
    function getStateRoot() external view returns (bytes32);
}
