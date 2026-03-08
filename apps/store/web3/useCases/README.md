# Web3 Use Cases

This directory contains all the contract interaction functions organized by contract type.

## Structure

```
useCases/
├── factory/          # Factory contract functions
├── campaign/         # Campaign contract functions
├── utils/            # Utility functions (contract instances)
├── types.ts          # TypeScript type definitions
└── index.ts          # Main export file
```

## Usage Examples

### Factory Contract

```typescript
import { createCampaign, getDeployedCampaigns } from '@/web3/useCases';
import { BrowserProvider } from 'ethers';

// Get signer
const provider = new BrowserProvider(window.ethereum);
const signer = await provider.getSigner();

// Create a new campaign with minimum contribution of 0.1 ETH
const minimum = BigInt('100000000000000000'); // 0.1 ETH in wei
const tx = await createCampaign(minimum, signer);
console.log('Campaign created:', tx);

// Get all deployed campaigns
const campaigns = await getDeployedCampaigns(provider);
console.log('Deployed campaigns:', campaigns);
```

### Campaign Contract

```typescript
import { 
  contribute,
  createRequest,
  approveRequest,
  finalizeRequest,
  getCampaignSummary,
  getAllRequests
} from '@/web3/useCases';
import { BrowserProvider } from 'ethers';

const provider = new BrowserProvider(window.ethereum);
const signer = await provider.getSigner();
const campaignAddress = '0x...'; // Campaign contract address

// Contribute to a campaign
const contribution = BigInt('50000000000000000'); // 0.05 ETH
await contribute(campaignAddress, contribution, signer);

// Get campaign summary
const summary = await getCampaignSummary(campaignAddress, provider);
console.log('Campaign balance:', summary.balance);
console.log('Manager:', summary.manager);

// Create a spending request (only manager)
await createRequest(
  campaignAddress,
  'Buy supplies',
  BigInt('100000000000000000'), // 0.1 ETH
  '0xRecipientAddress...',
  signer
);

// Approve a request (contributors only)
await approveRequest(campaignAddress, BigInt(0), signer);

// Finalize a request (only manager, after enough approvals)
await finalizeRequest(campaignAddress, BigInt(0), signer);

// Get all requests
const requests = await getAllRequests(campaignAddress, provider);
console.log('All requests:', requests);
```

## Available Functions

### Factory Contract
- `createCampaign(minimum, signer)` - Create a new campaign
- `getDeployedCampaigns(signerOrProvider)` - Get all campaign addresses

### Campaign Contract - Transactions
- `contribute(campaignAddress, amount, signer)` - Contribute to a campaign
- `createRequest(campaignAddress, description, value, recipient, signer)` - Create a spending request
- `approveRequest(campaignAddress, requestIndex, signer)` - Approve a request
- `finalizeRequest(campaignAddress, requestIndex, signer)` - Finalize and execute a request

### Campaign Contract - View Functions
- `getCampaignSummary(campaignAddress, signerOrProvider)` - Get campaign overview
- `getRequestsCount(campaignAddress, signerOrProvider)` - Get number of requests
- `getAllRequests(campaignAddress, signerOrProvider)` - Get all requests
- `getRequest(campaignAddress, requestIndex, signerOrProvider)` - Get a specific request
- `getApprovers(campaignAddress, address, signerOrProvider)` - Check if address is an approver
- `getApproversCount(campaignAddress, signerOrProvider)` - Get number of contributors
- `getManager(campaignAddress, signerOrProvider)` - Get manager address
- `getMinimumContribution(campaignAddress, signerOrProvider)` - Get minimum contribution
- `getVoters(campaignAddress, requestIndex, address, signerOrProvider)` - Check if address voted on request

