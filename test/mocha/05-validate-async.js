/*!
 * Copyright (c) 2017-2019 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const bedrock = require('bedrock');
const didVeresOne = require('did-veres-one');
const {documentLoader} = didVeresOne;
const {Ed25519KeyPair} = require('crypto-ld');
const jsigs = require('jsonld-signatures');
const jsonpatch = require('fast-json-patch');
const mockData = require('./mock.data');
const voValidator = require('veres-one-validator');
const {CapabilityInvocation} = require('ocapld');
const {Ed25519Signature2018} = jsigs.suites;

describe.only('validate API', () => {
  it('validates a proper CreateWebLedgerRecord operation', async () => {
    const {did, mockDoc, capabilityInvocationKey} = await _generateDid();
    const mockOperation = bedrock.util.clone(mockData.operations.create);
    const capabilityAction = 'RegisterDid';
    mockOperation.record = mockDoc;
    // add an AuthorizeRequest proof that will pass json-schema validation for
    // testnet v2 *not* a valid signature
    mockOperation.proof = bedrock.util.clone(mockData.proof);
    const s = await jsigs.sign(mockOperation, {
      documentLoader,
      suite: new Ed25519Signature2018(
        {compactProof: false, key: capabilityInvocationKey}),
      purpose: new CapabilityInvocation({capability: did, capabilityAction})
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
  it('rejects a duplicate create operation', async () => {
    const {did, mockDoc, capabilityInvocationKey} = await _generateDid();
    const mockOperation = bedrock.util.clone(mockData.operations.create);
    const capabilityAction = 'RegisterDid';
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
      suite: new Ed25519Signature2018(
        {compactProof: false, key: capabilityInvocationKey}),
      purpose: new CapabilityInvocation({capability: did, capabilityAction})
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
    should.exist(result.error);
    result.error.name.should.equal('DuplicateError');
  });
  it('validates an update operation', async () => {
    const {did, mockDoc, capabilityInvocationKey} = await _generateDid();
    const mockOperation = bedrock.util.clone(mockData.operations.update);
    let capabilityAction = 'RegisterDid';
    // add the new document to the mock document loader as if it were on ledger
    // clone here so we can proceed with making changes to mockDoc
    mockData.existingDids[did] = bedrock.util.clone(mockDoc);

    const observer = jsonpatch.observe(mockDoc);
    const newKey = await Ed25519KeyPair.generate({controller: did});
    newKey.id = _generateKeyId({did, key: newKey});
    mockDoc.authentication.push({
      id: newKey.id,
      type: newKey.type,
      controller: newKey.controller,
      publicKeyBase58: newKey.publicKeyBase58
    });
    mockOperation.recordPatch.patch = jsonpatch.generate(observer);
    mockOperation.recordPatch.target = did;
    // add an AuthorizeRequest proof that will pass json-schema validation for
    // testnet v2 *not* a valid signature
    mockOperation.proof = bedrock.util.clone(mockData.proof);
    capabilityAction = 'UpdateDidDocument';
    const s = await jsigs.sign(mockOperation, {
      documentLoader,
      suite: new Ed25519Signature2018(
        {compactProof: false, key: capabilityInvocationKey}),
      purpose: new CapabilityInvocation({capability: did, capabilityAction})
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
    result.valid.should.be.true;
    should.not.exist(result.error);
  });
  it('does not validate an update operation with invalid proof', async () => {
    const {did, mockDoc, capabilityInvocationKey} = await _generateDid();
    const mockOperation = bedrock.util.clone(mockData.operations.update);
    let capabilityAction = 'RegisterDid';
    // add the new document to the mock document loader as if it were on ledger
    // clone here so we can proceed with making changes to mockDoc
    mockData.existingDids[did] = bedrock.util.clone(mockDoc);
    const observer = jsonpatch.observe(mockDoc);
    const newKey = await Ed25519KeyPair.generate({controller: did});
    newKey.id = _generateKeyId({did, key: newKey});
    mockDoc.authentication.push({
      id: newKey.id,
      type: newKey.type,
      controller: newKey.controller,
      publicKeyBase58: newKey.publicKeyBase58
    });
    mockOperation.recordPatch.patch = jsonpatch.generate(observer);
    mockOperation.recordPatch.target = did;
    // add an AuthorizeRequest proof that will pass json-schema validation for
    // testnet v2 *not* a valid signature
    mockOperation.proof = bedrock.util.clone(mockData.proof);

    // capability action must be `UpdateDidDocument`
    capabilityAction = 'RegisterDid';

    const s = await jsigs.sign(mockOperation, {
      documentLoader,
      suite: new Ed25519Signature2018(
        {compactProof: false, key: capabilityInvocationKey}),
      purpose: new CapabilityInvocation({capability: did, capabilityAction})
    });
    const result = await voValidator.validate({
      basisBlockHeight: 10,
      ledgerNode: mockData.ledgerNode,
      validatorInput: s,
      validatorConfig: mockData.ledgerConfigurations.alpha
        .operationValidator[0],
    });
    result.valid.should.be.false;
    should.exist(result.error);
    // schema validation ensures that proofs with the proper capabilityAction
    // are provided
    result.error.name.should.equal('ValidationError');
  });
});

function _generateKeyId({did, key}) {
  // `did` + multibase base58 (0x7a / z) encoding + key fingerprint
  return `${did}#z${key.fingerprint()}`;
}

async function _generateDid() {
  const mockDoc = bedrock.util.clone(mockData.privateDidDocuments.alpha);
  const capabilityInvocationKey = await Ed25519KeyPair.generate();
  const keyFingerprint = `z${capabilityInvocationKey.fingerprint()}`;

  const did = `did:v1:test:nym:${keyFingerprint}`;
  // cryptonym dids are based on fingerprint of capabilityInvokation key
  mockDoc.id = did;
  capabilityInvocationKey.id = _generateKeyId(
    {did, key: capabilityInvocationKey});
  const controller = did;
  capabilityInvocationKey.controller = controller;
  mockDoc.capabilityInvocation[0] = {
    id: capabilityInvocationKey.id,
    type: capabilityInvocationKey.type,
    controller: capabilityInvocationKey.controller,
    publicKeyBase58: capabilityInvocationKey.publicKeyBase58
  };
  return {did, mockDoc, capabilityInvocationKey};
}
