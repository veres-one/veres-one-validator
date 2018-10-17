/*!
 * Copyright (c) 2017-2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const bedrock = require('bedrock');
const config = bedrock.config;
const cfg = config['veres-one-validator'];
const didv1 = require('did-veres-one');
const dids = require('did-io');
const voValidator = require('veres-one-validator');
const equihashSigs = require('equihash-signature');
const jsigs = require('jsonld-signatures');
const {BedrockError} = bedrock.util;

jsigs.use('jsonld', bedrock.jsonld);
equihashSigs.install(jsigs);
didv1.use('jsonld', bedrock.jsonld);
didv1.use('jsonld-signatures', jsigs);

dids.use('jsonld', bedrock.jsonld);

const ldDocuments = new Map();

const ledgerNode = {
  records: {
    async get({maxBlockHeight, recordId}) {
      if(ldDocuments.has(recordId)) {
        return {
          record: ldDocuments.get(recordId),
          meta: {sequence: 0}
        };
      }
      throw new BedrockError(
        'DID Document not found.', 'NotFoundError', {recordId});
    }
  }
};

const mockData = require('./mock.data');

const capabilityActions = {
  authorize: 'AuthorizeRequest',
  register: 'RegisterDid',
  update: 'UpdateDidDocument'
};

let maintainerDidFull;
const v1 = dids.methods.veres();
describe('validate API ElectorPool', () => {
  describe('operationValidator', () => {
    describe('create electorPool operation', () => {
      before(async () => {
        maintainerDidFull = await v1.generate();
        const {doc: maintainerDidDocument} = maintainerDidFull;
        ldDocuments.set(maintainerDidDocument.id, maintainerDidDocument);
      });
      it('validates an operation with proper proof', async () => {
        const maintainerDid = maintainerDidFull.doc.id;
        const electorPoolDoc = bedrock.util.clone(
          mockData.electorPoolDocument.alpha);
        electorPoolDoc.electorPool[0].capability[0].id = maintainerDid;
        // the invocationTarget is the ledger ID
        electorPoolDoc.electorPool[0].capability[0].invocationTarget =
          'urn:uuid:e9e63a07-15b1-4e8f-b725-a71a362cfd99';
        electorPoolDoc.invoker = maintainerDid;
        let operation = v1.client.wrap({didDocument: electorPoolDoc});
        const invokePublicKey = maintainerDidFull.doc.capabilityInvocation[0]
          .publicKey[0];
        const creator = invokePublicKey.id;
        const {privateKey: privateKeyBase58} =
          maintainerDidFull.keys[invokePublicKey.id];

        operation = await v1.attachInvocationProof({
          algorithm: 'Ed25519Signature2018',
          operation,
          capability: maintainerDid,
          // capabilityAction: operation.type,
          capabilityAction: 'RegisterDid',
          creator,
          privateKeyBase58
        });
        operation = await v1.attachInvocationProof({
          algorithm: 'Ed25519Signature2018',
          operation,
          capability: maintainerDid,
          // capabilityAction: operation.type,
          capabilityAction: 'AuthorizeRequest',
          creator,
          privateKeyBase58
        });
        // console.log('OOOOOOO', JSON.stringify(operation, null, 2));
        try {
          const r = await voValidator.validate(
            operation,
            mockData.ledgerConfigurations.alpha.operationValidator[0],
            {ledgerNode});
        } catch(e) {
          assertNoError(e);
        }
      });
    });
  });
});
