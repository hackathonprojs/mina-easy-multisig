import { EasyMultisig } from './EasyMultisig.js';
import {
  isReady,
  shutdown,
  Field,
  Mina,
  PrivateKey,
  AccountUpdate,
  PublicKey,
  UInt64,
  Signature,
  Character,
} from 'snarkyjs';

(async function main() {
  await isReady;

  console.log('SnarkyJS loaded');

  const Local = Mina.LocalBlockchain();
  Mina.setActiveInstance(Local);
  const deployerAccount = Local.testAccounts[0].privateKey;
  const account1 = Local.testAccounts[1].privateKey;
  const user0 = deployerAccount.toPublicKey(); // public key
  const user1 = account1.toPublicKey(); // public key

  const salt = Field.random();

  // ----------------------------------------------------

  // create a destination we will deploy the smart contract to
  const zkAppPrivateKey = PrivateKey.random();
  const zkAppAddress = zkAppPrivateKey.toPublicKey();

  const zkAppInstance = new EasyMultisig(zkAppAddress);
  const deploy_txn = await Mina.transaction(deployerAccount, () => {
    AccountUpdate.fundNewAccount(deployerAccount);
    zkAppInstance.deploy({ zkappKey: zkAppPrivateKey });
    zkAppInstance.initState(salt, user0, user1);
    zkAppInstance.sign(zkAppPrivateKey);
  });
  await deploy_txn.send();

  // get the initial state of IncrementSecret after deployment
  const userHash0 = zkAppInstance.userHash0.get();
  const userHash1 = zkAppInstance.userHash1.get();
  console.log(
    'state after init: \n  userHash0: ',
    userHash0.toString() + '\n  userHash1:  ' + userHash1
  );

  // ----------------------------------------------------

  // test easySingleMethodPay
  // this allows easy payment without multiple stage of process
  const payee: PublicKey = user1;
  const payAmount: UInt64 = UInt64.from(1_000_000);

  // construct signed data
  const char1: Character = new Character('');
  const signatureData = char1
    .toFields()
    .concat(payee.toFields())
    .concat(payAmount.toFields());
  const signature0: Signature = Signature.create(
    deployerAccount,
    signatureData
  );
  const signature1: Signature = Signature.create(account1, signatureData);

  const txn1 = await Mina.transaction(deployerAccount, () => {
    zkAppInstance.easySingleMethodPay(
      payee,
      payAmount,
      user0,
      signature0,
      user1,
      signature1,
      salt
    );
    zkAppInstance.sign(zkAppPrivateKey);
  });
  await txn1.send();

  // ----------------------------------------------------

  console.log('Shutting down');

  await shutdown();
})();
