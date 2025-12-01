import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "easylease-secret-key-change-in-production";

// Simular el token para Leonardo Montoya (owner)
const leonardoPayload = {
  id: "someUserId",
  email: "leonardomontoya@easylease.com",
  role: "owner",
  owner_id: "69215a48b76338ade8364aba"
};

const token = jwt.sign(leonardoPayload, JWT_SECRET, { expiresIn: "7d" });

console.log('🔐 Generated Token:');
console.log(token);
console.log('\n📋 Decoded Token:');
const decoded = jwt.verify(token, JWT_SECRET);
console.log(JSON.stringify(decoded, null, 2));

console.log('\n✅ Token includes owner_id:', decoded.owner_id ? 'YES' : 'NO');
console.log('   owner_id value:', decoded.owner_id);
