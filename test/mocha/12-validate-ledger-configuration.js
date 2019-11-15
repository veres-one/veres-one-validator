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
const {purposes: {AssertionProofPurpose}, suites: {Ed25519Signature2018}} =
  jsigs;

describe('validate API WebLedgerConfiguration', () => {
  it('should validate a ledgerConfiguration', async () => {
    const ledgerConfiguration = clone(mockData.ledgerConfigurations.alpha);

    // The public key material is derived from the nym DID because the
    // maintainers DID does not yet exist on the ledger
    const maintainerDoc = await v1.generate();
    const method = maintainerDoc.getVerificationMethod(
      {proofPurpose: 'capabilityInvocation'});
    const signingKey = maintainerDoc.keys[method.id];
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
  it('rejects a ledger configuration with an invalid signature', async () => {
    const ledgerConfiguration = clone(mockData.ledgerConfigurations.alpha);

    // The public key material is derived from the nym DID because the
    // maintainers DID does not yet exist on the ledger
    const maintainerDoc = await v1.generate();
    const method = maintainerDoc.getVerificationMethod(
      {proofPurpose: 'capabilityInvocation'});
    const signingKey = maintainerDoc.keys[method.id];

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
  it('rejects a ledger configuration with an invalid nym did', async () => {
    const ledgerConfiguration = clone(mockData.ledgerConfigurations.alpha);

    // The public key material is derived from the nym DID because the
    // maintainers DID does not yet exist on the ledger
    const maintainerDoc = await v1.generate();
    const method = maintainerDoc.getVerificationMethod(
      {proofPurpose: 'capabilityInvocation'});
    const signingKey = maintainerDoc.keys[method.id];

    const s = await jsigs.sign(ledgerConfiguration, {
      compactProof: false,
      documentLoader,
      suite: new Ed25519Signature2018({key: signingKey}),
      purpose: new AssertionProofPurpose()
    });

    s.proof.verificationMethod =
      'did:v1:nym:z6MksN1qAquFzdSgXwVTAYuuLGfckt3UpkhHwFwPsbSiwrUB#' +
      // the leading `z` has been removed here to break the encoding
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
});
