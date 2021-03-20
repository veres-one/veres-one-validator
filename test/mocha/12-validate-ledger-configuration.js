/*!
 * Copyright (c) 2017-2019 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const {documentLoader} = require('bedrock-jsonld-document-loader');
const {util: {clone}} = require('bedrock');
const jsigs = require('jsonld-signatures');
const mockData = require('./mock.data');
const voValidator = require('veres-one-validator');
const v1 = new (require('did-veres-one')).VeresOne();
const {Ed25519Signature2018} =
  require('@digitalbazaar/ed25519-signature-2018');
const {Ed25519VerificationKey2018} =
  require('@digitalbazaar/ed25519-verification-key-2018');
const {purposes: {AssertionProofPurpose}} = jsigs;

describe('validate API WebLedgerConfiguration', () => {
  it('should validate a ledgerConfiguration', async () => {
    const ledgerConfiguration = clone(mockData.ledgerConfigurations.alpha);

    // The public key material is derived from the nym DID because the
    // maintainers DID does not yet exist on the ledger
    const maintainerDoc = await v1.generate();
    const method = maintainerDoc.getVerificationMethod(
      {proofPurpose: 'capabilityInvocation'});
    const signingKey = new Ed25519VerificationKey2018(
      maintainerDoc.keys[method.id]
    );
    const s = await jsigs.sign(ledgerConfiguration, {
      compactProof: false,
      documentLoader,
      suite: new Ed25519Signature2018({key: signingKey}),
      purpose: new AssertionProofPurpose()
    });

    const result = await voValidator.validate({
      ledgerNode: mockData.ledgerNode,
      validatorInput: s,
    });
    should.exist(result.valid);
    result.valid.should.be.a('boolean');
    result.valid.should.be.true;
  });
  it('rejects a configuration w/missing electorSelectionMethod', async () => {
    const ledgerConfiguration = clone(mockData.ledgerConfigurations.alpha);

    delete ledgerConfiguration.electorSelectionMethod;

    // The public key material is derived from the nym DID because the
    // maintainers DID does not yet exist on the ledger
    const maintainerDoc = await v1.generate();
    const method = maintainerDoc.getVerificationMethod(
      {proofPurpose: 'capabilityInvocation'});
    const signingKey = new Ed25519VerificationKey2018(
      maintainerDoc.keys[method.id]
    );
    const s = await jsigs.sign(ledgerConfiguration, {
      compactProof: false,
      documentLoader,
      suite: new Ed25519Signature2018({key: signingKey}),
      purpose: new AssertionProofPurpose()
    });

    const result = await voValidator.validate({
      ledgerNode: mockData.ledgerNode,
      validatorInput: s,
    });
    should.exist(result.valid);
    result.valid.should.be.a('boolean');
    result.valid.should.be.false;
    should.exist(result.error);
    result.error.name.should.equal('ValidationError');
  });
  it('rejects a configuration w/missing sequence', async () => {
    const ledgerConfiguration = clone(mockData.ledgerConfigurations.alpha);

    delete ledgerConfiguration.sequence;

    // The public key material is derived from the nym DID because the
    // maintainers DID does not yet exist on the ledger
    const maintainerDoc = await v1.generate();
    const method = maintainerDoc.getVerificationMethod(
      {proofPurpose: 'capabilityInvocation'});
    const signingKey = new Ed25519VerificationKey2018(
      maintainerDoc.keys[method.id]
    );
    const s = await jsigs.sign(ledgerConfiguration, {
      compactProof: false,
      documentLoader,
      suite: new Ed25519Signature2018({key: signingKey}),
      purpose: new AssertionProofPurpose()
    });

    const result = await voValidator.validate({
      ledgerNode: mockData.ledgerNode,
      validatorInput: s,
    });
    should.exist(result.valid);
    result.valid.should.be.a('boolean');
    result.valid.should.be.false;
    should.exist(result.error);
    result.error.name.should.equal('ValidationError');
  });
  it('rejects a ledger configuration with an invalid signature', async () => {
    const ledgerConfiguration = clone(mockData.ledgerConfigurations.alpha);

    // The public key material is derived from the nym DID because the
    // maintainers DID does not yet exist on the ledger
    const maintainerDoc = await v1.generate();
    const method = maintainerDoc.getVerificationMethod(
      {proofPurpose: 'capabilityInvocation'});
    const signingKey = new Ed25519VerificationKey2018(
      maintainerDoc.keys[method.id]
    );
    const s = await jsigs.sign(ledgerConfiguration, {
      compactProof: false,
      documentLoader,
      suite: new Ed25519Signature2018({key: signingKey}),
      purpose: new AssertionProofPurpose()
    });
    // replace the proof with a bad one
    s.proof.jws = 'eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..' +
      '9LEA2y7gTD4a009s7LTPQvWTjF23vdAuwGyMhRwaOlD6L5uSDw7ETEItcmXE4OGHKsiRN' +
      'pOE1Z2Pv3V3hDO-CA';
    const result = await voValidator.validate({
      ledgerNode: mockData.ledgerNode,
      validatorInput: s,
    });
    should.exist(result.valid);
    result.valid.should.be.a('boolean');
    result.valid.should.be.false;
    should.exist(result.error);
    result.error.message.should.contain('Proof verification failed.');
  });
  it('rejects configuration signed with an invalid nym did', async () => {
    const ledgerConfiguration = clone(mockData.ledgerConfigurations.alpha);

    // The public key material is derived from the nym DID because the
    // maintainers DID does not yet exist on the ledger
    const maintainerDoc = await v1.generate();
    const method = maintainerDoc.getVerificationMethod(
      {proofPurpose: 'capabilityInvocation'});
    const signingKey = new Ed25519VerificationKey2018(
      maintainerDoc.keys[method.id]
    );
    const s = await jsigs.sign(ledgerConfiguration, {
      compactProof: false,
      documentLoader,
      suite: new Ed25519Signature2018({key: signingKey}),
      purpose: new AssertionProofPurpose()
    });

    s.proof.verificationMethod =
      'did:v1:nym:z6MksN1qAquFzdSgXwVTAYuuLGfckt3UpkhHwFwPsbSiwrUB#' +
      // the leading `z` has been removed here to break the encoding
      // 6 is not a valid encoding prefix
      '6MksN1qAquFzdSgXwVTAYuuLGfckt3UpkhHwFwPsbSiwrUB';

    const result = await voValidator.validate({
      ledgerNode: mockData.ledgerNode,
      validatorInput: s,
    });
    should.exist(result.valid);
    result.valid.should.be.a('boolean');
    result.valid.should.be.false;
    should.exist(result.error);
    result.error.message.should.contain(
      'The signing key is not properly encoded.');
    result.error.cause.message.should.contain('Unsupported encoding');
  });
  it('rejects configuration signed with an invalid nym did', async () => {
    const ledgerConfiguration = clone(mockData.ledgerConfigurations.alpha);

    // The public key material is derived from the nym DID because the
    // maintainers DID does not yet exist on the ledger
    const maintainerDoc = await v1.generate();
    const method = maintainerDoc.getVerificationMethod(
      {proofPurpose: 'capabilityInvocation'});
    const signingKey = new Ed25519VerificationKey2018(
      maintainerDoc.keys[method.id]
    );
    const s = await jsigs.sign(ledgerConfiguration, {
      compactProof: false,
      documentLoader,
      suite: new Ed25519Signature2018({key: signingKey}),
      purpose: new AssertionProofPurpose()
    });

    s.proof.verificationMethod =
      'did:v1:nym:z6MksN1qAquFzdSgXwVTAYuuLGfckt3UpkhHwFwPsbSiwrUB#' +
      // the 9 here specifies a decimal encoding
      '91234';

    const result = await voValidator.validate({
      ledgerNode: mockData.ledgerNode,
      validatorInput: s,
    });
    should.exist(result.valid);
    result.valid.should.be.a('boolean');
    result.valid.should.be.false;
    should.exist(result.error);
    result.error.message.should.contain(
      'The signing key is not properly encoded.');
    result.error.cause.message.should.equal(
      'Key ID is not a multiformats encoded ed25519 public key.');
  });
});
