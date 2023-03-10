import {
  isReady,
  shutdown,
  Field,
  Mina,
  PrivateKey,
  PublicKey,
  Poseidon,
} from 'snarkyjs';

await isReady;

console.log('SnarkyJS loaded');

const Local = Mina.LocalBlockchain();
Mina.setActiveInstance(Local);

const salt = Field.random();

const privateKey = PrivateKey.random();
const publicKey: PublicKey = privateKey.toPublicKey();

console.log(`private key: ${privateKey.toBase58()}`);
console.log(`public key: ${publicKey.toBase58()}`);
console.log(`Fields in private key: ${privateKey.toFields().length}`);
console.log(`Fields in public key: ${publicKey.toFields().length}`);
console.log(`Field[0] in public key: ${publicKey.toFields()[0]}`);
console.log(`Field[1] in public key: ${publicKey.toFields()[1]}`);

console.log(
  `hash of public key: ${Poseidon.hash([salt, publicKey.toFields()[0]])}`
);

const deployerAccount = Local.testAccounts[0].privateKey;
const balance = Mina.getBalance(deployerAccount.toPublicKey());
console.log(`deployeraccount balance: ${balance}`);

const account1 = Local.testAccounts[1].privateKey;
const balance1 = Mina.getBalance(account1.toPublicKey());
console.log(`account1 balance: ${balance1}`);

console.log('Shutting down');

await shutdown();
