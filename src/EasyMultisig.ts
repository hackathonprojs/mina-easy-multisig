import {
  Field,
  SmartContract,
  state,
  State,
  method,
  DeployArgs,
  Poseidon,
  Permissions,
  Bool,
  UInt32,
  UInt64,
  PublicKey,
  Signature,
  Circuit,
  Character,
  Mina,
} from 'snarkyjs';

/**
 * simple zkapp multisig.  this is a one-off multisig.
 * this is a proof-of-concept.
 * there is a lot to be modified and extended to create
 * a more feature-rich version later on.
 */
export class EasyMultisig extends SmartContract {
  // two field with the hash.
  @state(Field) userHash0 = State<Field>();
  @state(Field) userHash1 = State<Field>();
  // proposal - payee and amount
  @state(UInt64) payAmount = State<UInt64>();
  @state(PublicKey) payee = State<PublicKey>();
  // not sure if it is bigendian or little endian.  user0 at 0bit, user1 at 1bit
  @state(UInt32) approvalBitmap = State<UInt32>();

  deploy(args: DeployArgs) {
    super.deploy(args);
    this.setPermissions({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
    });
  }

  @method initState(salt: Field, user0: PublicKey, user1: PublicKey) {
    this.userHash0.set(Poseidon.hash([salt, user0.toFields()[0]]));
    this.userHash1.set(Poseidon.hash([salt, user1.toFields()[0]]));
  }

  // this method allows the person to do everything in one single method.
  // by supplying both signature at the same time.
  //
  // there are 2 modes of operation.
  // 1. someone does proposal, then 2 different people approve.
  // 2. everything can be done in one single method for convenience
  // this method is the second mode.
  @method easySingleMethodPay(
    payee: PublicKey,
    payAmount: UInt64,
    user0: PublicKey,
    signature0: Signature,
    user1: PublicKey,
    signature1: Signature,
    salt: Field
  ) {
    // check if user0 and user1 are approved users
    const userHash0: Field = this.userHash0.get();
    this.userHash0.assertEquals(userHash0);
    const userHash1: Field = this.userHash1.get();
    this.userHash1.assertEquals(userHash1);
    userHash0.assertEquals(
      Poseidon.hash([salt, Field.fromFields(user0.toFields())]),
      'wrong user0'
    );
    userHash1.assertEquals(
      Poseidon.hash([salt, Field.fromFields(user1.toFields())]),
      'wrong user1'
    );

    // construct signed data
    const char1: Character = new Character();
    const signatureData = char1
      .toFields()
      .concat(payee.toFields())
      .concat(payAmount.toFields());

    // check signature
    const b = new Bool(true);
    const verifiedSig0 = signature0.verify(user0, signatureData);
    const verifiedSig1 = signature1.verify(user1, signatureData);
    // todo: assertequals
    b.assertEquals(verifiedSig0, 'wrong signature0');
    b.assertEquals(verifiedSig1, 'wrong signature1');

    // check if enough to pay

    // pay
    this.balance.subInPlace(payAmount);
    Mina.getAccount(payee).balance.add(payAmount); // check?
  }

  // create proposal
  @method propose(payee: PublicKey, payAmount: UInt64) {
    this.payee.set(payee);
    this.payAmount.set(payAmount);
  }

  // approve the current proposal
  @method approveProposal() {
    // todo:
  }

  // pay the current proposal
  @method pay() {
    //const check0 = this.hasUser0Approved();
    //const check1 = this.hasUser1Approved();
    // todo:
  }

  @method hasUser0Approved(): Bool {
    const approvalBitmap = this.approvalBitmap.get();
    this.approvalBitmap.assertEquals(approvalBitmap);

    // suppose to be bitmap.  instead of bit operation, we'll just check numbers.
    return Circuit.if(
      approvalBitmap.equals(UInt32.from(1)) ||
        approvalBitmap.equals(UInt32.from(3)),
      Bool(true),
      Bool(false)
    );
  }

  @method hasUser1Approved(): Bool {
    const approvalBitmap = this.approvalBitmap.get();
    this.approvalBitmap.assertEquals(approvalBitmap);

    // suppose to be bitmap.  instead of bit operation, we'll just check numbers.
    return Circuit.if(
      approvalBitmap.equals(UInt32.from(2)) ||
        approvalBitmap.equals(UInt32.from(3)),
      Bool(true),
      Bool(false)
    );
  }
}
