/*!
 * Copyright (c) 2017-2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const bedrock = require('bedrock');
const BedrockError = bedrock.util.BedrockError;

const mock = {};
module.exports = mock;

const ledgerConfigurations = mock.ledgerConfigurations = {};
const operations = mock.operations = {};
const didDocuments = mock.didDocuments = {};
const privateDidDocuments = mock.privateDidDocuments = {};
const capabilities = mock.capabilities = {};
const ldDocuments = mock.ldDocuments = {};

mock.ledgerNode = {
  stateMachine: {
    get(id, options, callback) {
      if(id === didDocuments.beta.id) {
        return callback(null, {
          object: ldDocuments[didDocuments.beta.id],
          meta: {sequence: 0}
        });
      }
      callback(new BedrockError(
        'DID Document not found.', 'NotFoundError', {id}));
    }
  }
};

privateDidDocuments.alpha = {
  "@context": "https://w3id.org/veres-one/v1",
  "id": "did:v1:test:nym:z279tsMiWpyTGi3DjipGU4MkfZSiDuxsH5ZJT6AA7rYbYNb7",
  "authentication": [
    {
      "type": "Ed25519SignatureAuthentication2018",
      "publicKey": [
        {
          "id": "did:v1:test:nym:z279tsMiWpyTGi3DjipGU4MkfZSiDuxsH5ZJT6AA7rYbYNb7#authn-key-1",
          "type": "Ed25519VerificationKey2018",
          "owner": "did:v1:test:nym:z279tsMiWpyTGi3DjipGU4MkfZSiDuxsH5ZJT6AA7rYbYNb7",
          "publicKeyBase58": "C9FccpemTaGKdpwTFErrZyCJJQ5vZTM7uCnDjP3MM4jw",
          "privateKey": {
            "privateKeyBase58": "5eNqLTZuJ7ip2wvzt2aBDNcW8bBxSNxe7ZM13qQKneHQG72eDzoNJHWf4VcFCGov8SKaTCndnooNtJLEvNxHZ6R3"
          }
        }
      ]
    }
  ],
  "capabilityDelegation": [
    {
      "type": "Ed25519SignatureCapabilityAuthorization2018",
      "publicKey": [
        {
          "id": "did:v1:test:nym:z279tsMiWpyTGi3DjipGU4MkfZSiDuxsH5ZJT6AA7rYbYNb7#ocap-delegate-key-1",
          "type": "Ed25519VerificationKey2018",
          "owner": "did:v1:test:nym:z279tsMiWpyTGi3DjipGU4MkfZSiDuxsH5ZJT6AA7rYbYNb7",
          "publicKeyBase58": "fs5FLf8wBa9UurH92Yq7WXTfTdfykjsejgfyKv4YR8F",
          "privateKey": {
            "privateKeyBase58": "37EoF7tonu6B6Mhbb8YY1oYitmDoh8oVwYejoTExYmZBnDSnsV4SXZPaHewusq8sGzknqNFAHtEACpnWM7FLbG91"
          }
        }
      ]
    }
  ],
  "capabilityInvocation": [
    {
      "type": "Ed25519SignatureCapabilityAuthorization2018",
      "publicKey": [
        {
          "id": "did:v1:test:nym:z279tsMiWpyTGi3DjipGU4MkfZSiDuxsH5ZJT6AA7rYbYNb7#ocap-invoke-key-1",
          "type": "Ed25519VerificationKey2018",
          "owner": "did:v1:test:nym:z279tsMiWpyTGi3DjipGU4MkfZSiDuxsH5ZJT6AA7rYbYNb7",
          "publicKeyBase58": "EZ4jqdeP1zmTca7qLkoPh78YTxGpbmu5pHKdZNxd2cAK",
          "privateKey": {
            "privateKeyBase58": "4xkdXodP4dbWRJqRWnuma1Hgh74nYCKsfcpBc1mKPkDMmQz6pyVPpmUZG4vitYw83HCmqeG6De6exvbQUt4Z2JiT"
          }
        }
      ]
    }
  ]
};

privateDidDocuments.beta = {
  "@context": "https://w3id.org/veres-one/v1",
  "id": "did:v1:test:nym:z279wWXz4nugfh2XATAnFQkqaoSg97AWyNbsvdpr8hujamKJ",
  "authentication": [
    {
      "type": "Ed25519SignatureAuthentication2018",
      "publicKey": [
        {
          "id": "did:v1:test:nym:z279wWXz4nugfh2XATAnFQkqaoSg97AWyNbsvdpr8hujamKJ#authn-key-1",
          "type": "Ed25519VerificationKey2018",
          "owner": "did:v1:test:nym:z279wWXz4nugfh2XATAnFQkqaoSg97AWyNbsvdpr8hujamKJ",
          "publicKeyBase58": "EnRtAnazrZFd4ZHy2bFwVDCGDbHaFkPhNkSukEQVPTU8",
          "privateKey": {
            "privateKeyBase58": "4xj86VfVkfCUcPtMPYTjBB2LZAW6pDdcaybYvy56D7bSpbeGLjnDMRvdpkh6uBXXzN8x7VmQxGSACJ9gGsSKZfa"
          }
        }
      ]
    }
  ],
  "capabilityDelegation": [
    {
      "type": "Ed25519SignatureCapabilityAuthorization2018",
      "publicKey": [
        {
          "id": "did:v1:test:nym:z279wWXz4nugfh2XATAnFQkqaoSg97AWyNbsvdpr8hujamKJ#ocap-delegate-key-1",
          "type": "Ed25519VerificationKey2018",
          "owner": "did:v1:test:nym:z279wWXz4nugfh2XATAnFQkqaoSg97AWyNbsvdpr8hujamKJ",
          "publicKeyBase58": "98DTMwZYAUfivKEcR3BNNAvgbUrmMJgj3bCaAKbWymPk",
          "privateKey": {
            "privateKeyBase58": "4GEjLv796PqciMy4fHwQ1JL1Gq3Dv4zxt5dzvxoEatsdF6wzwrq1RoMwjZRkAh2SUNs8r6buxgzdpG32iwNB8aS2"
          }
        }
      ]
    }
  ],
  "capabilityInvocation": [
    {
      "type": "Ed25519SignatureCapabilityAuthorization2018",
      "publicKey": [
        {
          "id": "did:v1:test:nym:z279wWXz4nugfh2XATAnFQkqaoSg97AWyNbsvdpr8hujamKJ#ocap-invoke-key-1",
          "type": "Ed25519VerificationKey2018",
          "owner": "did:v1:test:nym:z279wWXz4nugfh2XATAnFQkqaoSg97AWyNbsvdpr8hujamKJ",
          "publicKeyBase58": "Ad45k3zrAVUZqSgJ4D6dN38LQo9HTjvcvXr91HwX8UgT",
          "privateKey": {
            "privateKeyBase58": "ixRWi3FaUyN2TXpzcsakatUYPMmQPiPZWGyY7gSj9v6qX1E1uNWzjy6itaqmHVfwh5zbcQo2UwMydZa5yMp1y63"
          }
        }
      ]
    }
  ]
};

didDocuments.alpha = _stripPrivateKeys(privateDidDocuments.alpha);
didDocuments.beta = _stripPrivateKeys(privateDidDocuments.beta);

function _stripPrivateKeys(privateDidDocument) {
  const didDocument = bedrock.util.clone(privateDidDocument);
  delete didDocument.authentication[0].publicKey[0].privateKey;
  delete didDocument.capabilityDelegation[0].publicKey[0].privateKey;
  delete didDocument.capabilityInvocation[0].publicKey[0].privateKey;
  return didDocument;
}

mock.authorizedSigners = {
  // fully valid signer
  alpha: didDocuments.alpha.authentication[0].publicKey[0].id,
  beta: didDocuments.beta.authentication[0].publicKey[0].id
};

ledgerConfigurations.alpha = {
  '@context': 'https://w3id.org/webledger/v1',
  type: 'WebLedgerConfiguration',
  ledger: 'did:v1:c02915fc-672d-4568-8e6e-b12a0b35cbb3',
  consensusMethod: 'UnilateralConsensus2017',
  operationValidator: [{
    type: 'VeresOneValidator2017',
    validatorFilter: [{
      type: 'ValidatorFilterByType',
      validatorFilterByType: ['CreateWebLedgerRecord']
    }]
  }]/*,
  ledgerConfigurationValidator: [{
    type: 'SignatureValidator2017',
    validatorFilter: [{
      type: 'ValidatorFilterByType',
      validatorFilterByType: ['WebLedgerConfiguration']
    }],
    approvedSigner: [
      'did:v1:53ebca61-5687-4558-b90a-03167e4c2838'
    ],
    minimumSignaturesRequired: 1
  }]*/
};

operations.create = {
  '@context': 'https://w3id.org/webledger/v1',
  type: 'CreateWebLedgerRecord',
  record: didDocuments.alpha
};

operations.update = {
  '@context': 'https://w3id.org/webledger/v1',
  type: 'UpdateWebLedgerRecord',
  recordPatch: {
    '@context': 'https://w3id.org/veres-one/v1',
    target: didDocuments.beta.id,
    sequence: 0,
    patch: [{
      "op": "add",
      "path": "/authentication/0/publicKey/1",
      "value": {
        "type": "Ed25519SignatureAuthentication2018",
        "publicKey": [{
          "id": didDocuments.beta.id + "#authn-key-1",
          "type": "Ed25519VerificationKey2018",
          "owner": "did:v1:test:nym:z279wWXz4nugfh2XATAnFQkqaoSg97AWyNbsvdpr8hujamKJ",
          "publicKeyBase58": "EnRtAnazrZFd4ZHy2bFwVDCGDbHaFkPhNkSukEQVPTU8"
        }]
      }
    }]
  }
};

operations.updateInvalidPatch = {
  '@context': 'https://w3id.org/webledger/v1',
  type: 'UpdateWebLedgerRecord',
  recordPatch: {
    '@context': 'https://w3id.org/veres-one/v1',
    target: didDocuments.beta.id,
    sequence: 0,
    patch: [{
      op: "invalid"
    }]
  }
};

operations.updateInvalidChange = {
  '@context': 'https://w3id.org/webledger/v1',
  type: 'UpdateWebLedgerRecord',
  recordPatch: {
    '@context': 'https://w3id.org/veres-one/v1',
    target: didDocuments.beta.id,
    sequence: 0,
    patch: [{
      op: "add",
      path: "/foo:bar",
      value: "test"
    }]
  }
};

capabilities.authorizeRequest =
  'did:v1:test:uuid:652de430-1d6f-11e8-878c-2bfa41196bf6';

// alpha
ldDocuments[didDocuments.alpha.id] = didDocuments.alpha;
ldDocuments[didDocuments.alpha.capabilityDelegation[0].publicKey.id] =
  Object.assign({
    "@context": "https://w3id.org/security/v2"
  }, didDocuments.alpha.capabilityDelegation[0].publicKey);
ldDocuments[didDocuments.alpha.capabilityInvocation[0].publicKey.id] =
  Object.assign({
    "@context": "https://w3id.org/security/v2"
  }, didDocuments.alpha.capabilityInvocation[0].publicKey);

// beta
ldDocuments[didDocuments.beta.id] = didDocuments.beta;
ldDocuments[didDocuments.beta.capabilityDelegation[0].publicKey.id] =
  Object.assign({
    "@context": "https://w3id.org/security/v2"
  }, didDocuments.beta.capabilityDelegation[0].publicKey);
ldDocuments[didDocuments.beta.capabilityInvocation[0].publicKey.id] =
  Object.assign({
    "@context": "https://w3id.org/security/v2"
  }, didDocuments.beta.capabilityInvocation[0].publicKey);

ldDocuments[capabilities.authorizeRequest] = {
  "@context": "https://w3id.org/security/v2",
  "id": capabilities.authorizeRequest,
  // TODO: add capability properties and improve verification testing
};

const jsonld = bedrock.jsonld;
const oldLoader = jsonld.documentLoader;
jsonld.documentLoader = function(url, callback) {
  if(url in mock.ldDocuments) {
    return callback(null, {
      contextUrl: null,
      document: mock.ldDocuments[url],
      documentUrl: url
    });
  }
  oldLoader(url, callback);
};
