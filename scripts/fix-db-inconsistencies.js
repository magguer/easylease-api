import mongoose from 'mongoose';
import Tenant from '../src/models/Tenant.js';
import Contract from '../src/models/Contract.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/easylease";

async function fixInconsistencies() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        console.log('\n--- Fixing Reverse Links (Contract -> Tenant) ---');
        const contracts = await Contract.find({ status: 'active' });
        let fixedCount = 0;

        for (const contract of contracts) {
            if (contract.tenant_id) {
                const tenant = await Tenant.findById(contract.tenant_id);
                if (tenant) {
                    if (!tenant.current_contract_id || tenant.current_contract_id.toString() !== contract._id.toString()) {
                        console.log(`Fixing Tenant ${tenant.name} (${tenant._id}): Setting current_contract_id to ${contract._id}`);
                        tenant.current_contract_id = contract._id;
                        await tenant.save();
                        fixedCount++;
                    }
                } else {
                    console.warn(`Contract ${contract._id} references missing tenant ${contract.tenant_id}`);
                }
            }
        }

        console.log(`\nFixed ${fixedCount} tenant reverse links.`);

    } catch (error) {
        console.error('Fix failed:', error);
    } finally {
        await mongoose.disconnect();
    }
}

fixInconsistencies();
