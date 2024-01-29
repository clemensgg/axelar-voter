import db from '../services/database.js';
import { fetchChainMaintainers } from '../jobs/chain-maintainers-job.js'
import { voteStatusGauge, pollStatusGauge } from './metrics.js';
import { getMonikerByProxyAddress } from "../services/validators.js";

export async function exportMetrics() {
    // Export Maintainer Status
    await fetchChainMaintainers();

    // Export Poll Status
    const recentPolls = await db.getRecentPolls(100);
    for (const poll of recentPolls) {
        pollStatusGauge.set({
            poll_id: poll.pollId, 
            tx_hash: poll.txHash
        }, poll.failed ? 4 : (poll.success ? 2 : 1)); // 4 for failed, 2 for confirmed, 1 for pending

        // Export Vote Status
        const votes = await db.getVotesForPoll(poll.pollId); 
        for (const vote of votes) {
            // const address = await db.getAddress({ voterAddress: vote.voter }, poll.network);
            const moniker = await getMonikerByProxyAddress(vote.voter);
            voteStatusGauge.set({
                poll_id: poll.pollId, 
                tx_hash: poll.txHash,
                moniker,
                address: vote.voter
            }, vote.vote ? 2 : (vote.unSubmitted ? 1 : 4)); // 2 for yes, 1 for no vote, 4 for no
        }
    }
}