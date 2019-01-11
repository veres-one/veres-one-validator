/*!
 * Copyright (c) 2017-2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const bedrock = require('bedrock');
const didVeresOne = require('did-veres-one');
const {documentLoader} = didVeresOne;
const {Ed25519KeyPair} = require('crypto-ld');
const jsigs = require('jsonld-signatures');
const mockData = require('./mock.data');
const voValidator = require('veres-one-validator');

describe.only('validate API', () => {
  it('validates a proper CreateWebLedgerRecord operation', async () => {
    const mockOperation = bedrock.util.clone(mockData.operations.create);
    const mockDoc = bedrock.util.clone(mockData.privateDidDocuments.alpha);
    const key = await Ed25519KeyPair.generate();
    const keyFingerprint = `z${key.fingerprint()}`;
    const {CapabilityInvocation} = require('ocapld');
    const {Ed25519Signature2018} = jsigs.suites;
    const capabilityAction = 'RegisterDid';
    const did = `did:v1:test:nym:${keyFingerprint}`;
    // cryptonym dids are based on fingerprint of capabilityInvokation key
    mockDoc.id = did;
    key.id = generateKeyId({did, key});
    const controller = did;
    key.controller = controller;
    const capability = controller;
    mockDoc.capabilityInvocation[0] = {
      id: key.id,
      type: key.type,
      controller: key.controller,
      publicKeyBase58: key.publicKeyBase58
    };
    // must clone this going into the document loader, otherwise it will be
    // mutated
    // mockData.existingDids[did] = bedrock.util.clone(mockDoc);
    mockOperation.record = mockDoc;
    // add an AuthorizeRequest proof that will pass json-schema validation for
    // testnet v2 *not* a valid signature
    mockOperation.proof = bedrock.util.clone(mockData.proof);
    const s = await jsigs.sign(mockOperation, {
      documentLoader,
      suite: new Ed25519Signature2018({compactProof: false, key}),
      purpose: new CapabilityInvocation({capability, capabilityAction})
    });
    const result = await voValidator.validate({
      basisBlockHeight: 0,
      ledgerNode: mockData.ledgerNode,
      validatorInput: s,
      validatorConfig: mockData.ledgerConfigurations.alpha
        .operationValidator[0],
    });
    should.exist(result);
    result.valid.should.be.a('boolean');
    result.valid.should.be.true;
  });
  it('validates a proper UpdateWebLedgerRecord operation', async () => {
    const mockOperation = bedrock.util.clone(mockData.operations.create);
    const mockDoc = bedrock.util.clone(mockData.privateDidDocuments.alpha);
    const key = await Ed25519KeyPair.generate();
    const keyFingerprint = `z${key.fingerprint()}`;
    const {CapabilityInvocation} = require('ocapld');
    const {Ed25519Signature2018} = jsigs.suites;
    const capabilityAction = 'RegisterDid';
    const did = `did:v1:test:nym:${keyFingerprint}`;
    // cryptonym dids are based on fingerprint of capabilityInvokation key
    mockDoc.id = did;
    key.id = generateKeyId({did, key});
    const controller = did;
    key.controller = controller;
    const capability = controller;
    mockDoc.capabilityInvocation[0] = {
      id: key.id,
      type: key.type,
      controller: key.controller,
      publicKeyBase58: key.publicKeyBase58
    };
    // add the new document to the mock document loader as if it were on ledger
    // must clone this going into the document loader, otherwise it will be
    // mutated
    mockData.existingDids[did] = bedrock.util.clone(mockDoc);
    mockOperation.record = mockDoc;
    // add an AuthorizeRequest proof that will pass json-schema validation for
    // testnet v2 *not* a valid signature
    mockOperation.proof = bedrock.util.clone(mockData.proof);
    const s = await jsigs.sign(mockOperation, {
      documentLoader,
      suite: new Ed25519Signature2018({compactProof: false, key}),
      purpose: new CapabilityInvocation({capability, capabilityAction})
    });
    const result = await voValidator.validate({
      basisBlockHeight: 10,
      ledgerNode: mockData.ledgerNode,
      validatorInput: s,
      validatorConfig: mockData.ledgerConfigurations.alpha
        .operationValidator[0],
    });
    should.exist(result);
    result.valid.should.be.a('boolean');
    result.valid.should.be.false;
  });
});

function generateKeyId({did, key}) {
  // `did` + multibase base58 (0x7a / z) encoding + key fingerprint
  return `${did}#z${key.fingerprint()}`;
}
