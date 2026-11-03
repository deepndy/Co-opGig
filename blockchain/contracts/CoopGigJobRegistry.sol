// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Academic demo registry. Stores only opaque references and hashes; no PII or payment escrow.
contract CoopGigJobRegistry {
    address public owner;
    enum Status { OPEN, ACCEPTED, IN_PROGRESS, COMPLETED, CUSTOMER_CONFIRMED, CANCELLED }
    struct JobRecord { bytes32 agreementHash; Status status; uint64 updatedAt; bool exists; }
    mapping(bytes32 => JobRecord) private jobs;
    mapping(address => bool) public operators;
    mapping(address => mapping(bytes32 => bool)) public credentialHashes;
    event OperatorUpdated(address indexed operator, bool enabled);
    event CredentialHashRegistered(address indexed worker, bytes32 indexed credentialHash);
    event JobCreated(bytes32 indexed jobRef, bytes32 agreementHash);
    event JobStatusChanged(bytes32 indexed jobRef, Status status);
    event CustomerCompletionConfirmed(bytes32 indexed jobRef);
    modifier onlyOwner(){require(msg.sender==owner,"NOT_OWNER");_;}
    modifier onlyOperator(){require(msg.sender==owner||operators[msg.sender],"NOT_OPERATOR");_;}
    constructor(){owner=msg.sender;}
    function setOperator(address operator,bool enabled) external onlyOwner {operators[operator]=enabled;emit OperatorUpdated(operator,enabled);}
    function registerCredential(bytes32 credentialHash) external onlyOperator {require(credentialHash!=bytes32(0),"EMPTY_HASH");credentialHashes[msg.sender][credentialHash]=true;emit CredentialHashRegistered(msg.sender,credentialHash);}
    function createJob(bytes32 jobRef,bytes32 agreementHash) external onlyOperator {require(jobRef!=bytes32(0)&&agreementHash!=bytes32(0),"EMPTY_HASH");require(!jobs[jobRef].exists,"JOB_EXISTS");jobs[jobRef]=JobRecord(agreementHash,Status.OPEN,uint64(block.timestamp),true);emit JobCreated(jobRef,agreementHash);}
    function updateJobStatus(bytes32 jobRef,Status next) external onlyOperator {JobRecord storage j=jobs[jobRef];require(j.exists,"JOB_NOT_FOUND");require(next!=Status.CUSTOMER_CONFIRMED,"USE_CONFIRM");require(_allowed(j.status,next),"INVALID_TRANSITION");j.status=next;j.updatedAt=uint64(block.timestamp);emit JobStatusChanged(jobRef,next);}
    function confirmCompletion(bytes32 jobRef) external onlyOperator {JobRecord storage j=jobs[jobRef];require(j.exists,"JOB_NOT_FOUND");require(j.status==Status.COMPLETED,"NOT_COMPLETED");j.status=Status.CUSTOMER_CONFIRMED;j.updatedAt=uint64(block.timestamp);emit CustomerCompletionConfirmed(jobRef);}
    function getJob(bytes32 jobRef) external view returns(bytes32 agreementHash,uint8 status,uint64 updatedAt,bool exists){JobRecord memory j=jobs[jobRef];return(j.agreementHash,uint8(j.status),j.updatedAt,j.exists);}
    function _allowed(Status from,Status to) private pure returns(bool){return(from==Status.OPEN&&to==Status.ACCEPTED)||(from==Status.ACCEPTED&&(to==Status.IN_PROGRESS||to==Status.CANCELLED))||(from==Status.IN_PROGRESS&&(to==Status.COMPLETED||to==Status.CANCELLED));}
}
