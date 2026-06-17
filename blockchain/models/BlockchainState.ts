import mongoose, { Schema } from 'mongoose';

// Stores the entire blockchain as a single JSON document.
// This is the Vercel-compatible equivalent of data/blockchain.json.
// There is always exactly one document in this collection.
const BlockchainStateSchema = new Schema({
  data: { type: String, required: true }, // JSON: { chain: Block[], initialBalances: Record<string,number> }
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.BlockchainState ||
  mongoose.model('BlockchainState', BlockchainStateSchema);
