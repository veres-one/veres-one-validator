/*!
 * Copyright (c) 2017-2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const bedrock = require('bedrock');
const {constants} = bedrock.config;
const uuid = require('uuid/v4');
const {BedrockError} = bedrock.util;

const mock = {};
module.exports = mock;

const capabilities = mock.capabilities = {};
const didDocuments = mock.didDocuments = {};
const electorPoolDocument = mock.electorPoolDocument = {};
const ldDocuments = mock.ldDocuments = {};
const ledgerConfigurations = mock.ledgerConfigurations = {};
const operations = mock.operations = {};
const privateDidDocuments = mock.privateDidDocuments = {};

mock.ledgerNode = {
  records: {
    async get({maxBlockHeight, recordId}) {
      if(recordId === didDocuments.beta.id) {
        return {
          record: ldDocuments[didDocuments.beta.id],
          meta: {sequence: 0}
        };
      }
      throw new BedrockError(
        'DID Document not found.', 'NotFoundError', {recordId});
    }
  }
};

const electorEndpoint = mock.electorEndpoint = [];

// NOTE: actual endpoints terminate with a base58 encoded public key
for(let i = 0; i < 10; ++i) {
  electorEndpoint.push('https://example.com/consensus/continuity2017/voters/' +
    uuid());
}

electorPoolDocument.alpha = {
  '@context': constants.VERES_ONE_CONTEXT_URL,
  id: 'urn:uuid:b3275fed-daf4-4c07-b63a-747fa8857609',
  // FIXME: this has to be in the v1 context before we can sign documents
  // veresOneTicketRate: 10, /* TBD */
  invoker: '', // replaced with DID in test
  electorPool: [{
    id: 'urn:uuid:89a62413-0ada-461b-b672-1b28afefaca8',
    elector: 'did:v1:test:nym:50f28192-8f52-4bf2-a9b1-d203f6611456',
    service: 'urn:uuid:50f28192-8f52-4bf2-a9b1-d203f6611456',
    type: ['Continuity2017GuarantorElector', 'Continuity2017Elector'],
    // other restrictions/capabilities like guarantor, recovery,
    // or ocap w/ticket caveat
    capability: [{
      id: '', // replaced with DID in test
      caveat: [{
        type: 'VeresOneElectorTicketAgent' /* TBD */
      }]
    }]
  }],
  maximumElectorCount: 10,
};

privateDidDocuments.alpha = {
  "@context": constants.VERES_ONE_CONTEXT_URL,
  "id": "did:v1:test:nym:z279tjfMvfjqHvkuqXbFFTB5hqWpWNLfAptnQvUFiRFebJgL",
  "authentication": [
    {
      "type": "Ed25519SignatureAuthentication2018",
      "publicKey": [
        {
          "id": "did:v1:test:nym:z279tjfMvfjqHvkuqXbFFTB5hqWpWNLfAptnQvUFiRFebJgL#authn-key-1",
          "type": "Ed25519VerificationKey2018",
          "owner": "did:v1:test:nym:z279tjfMvfjqHvkuqXbFFTB5hqWpWNLfAptnQvUFiRFebJgL",
          "publicKeyBase58": "GhRN3AWmarx4MYUnoLqnZjscyDyzsHxXKuZNmXf9AQ1s",
          "privateKey": {
            "privateKeyBase58": "4r4t7zzyVNiSSuHNj5V8rjJDGYiLZ7N8b5achD9zUbdQ1nrrQ283Ctgq234BWmDGdsJbSVks3J1uotMLPdi34kFf"
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
          "id": "did:v1:test:nym:z279tjfMvfjqHvkuqXbFFTB5hqWpWNLfAptnQvUFiRFebJgL#ocap-delegate-key-1",
          "type": "Ed25519VerificationKey2018",
          "owner": "did:v1:test:nym:z279tjfMvfjqHvkuqXbFFTB5hqWpWNLfAptnQvUFiRFebJgL",
          "publicKeyBase58": "3LRDabY5N4TU5MasAbcXVbXmEAD2QAg1oUiyWnA3Ngnr",
          "privateKey": {
            "privateKeyBase58": "AfoqQ46sTgDCXSs3BLgecRMW2KMMHzJSmc1KxbZSxSpufYX4vmdpAXQSmetmspW5yGKZj4Brhut7fbzxG7RVztv"
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
          "id": "did:v1:test:nym:z279tjfMvfjqHvkuqXbFFTB5hqWpWNLfAptnQvUFiRFebJgL#ocap-invoke-key-1",
          "type": "Ed25519VerificationKey2018",
          "owner": "did:v1:test:nym:z279tjfMvfjqHvkuqXbFFTB5hqWpWNLfAptnQvUFiRFebJgL",
          "publicKeyBase58": "C1ZG2fR9Unz1jdiS2dgBcFGQarTiTCgbs36KKwkQPzqA",
          "privateKey": {
            "privateKeyBase58": "5yiybQnFhQNE7YoAn3EaSL3s6w8KzDQ4SGJapgkVh1tT3PcuGSKWLR1t5ZW1foeVQsRyUY6MoTUv4Kq8Uaph38w6"
          }
        }
      ]
    }
  ]
};

privateDidDocuments.beta = {
  "@context": constants.VERES_ONE_CONTEXT_URL,
  "id": "did:v1:test:nym:z279nCCZVzxreYfLw3EtFLtBMSVVY2pA6uxKengriMCdG3DF",
  "authentication": [
    {
      "type": "Ed25519SignatureAuthentication2018",
      "publicKey": [
        {
          "id": "did:v1:test:nym:z279nCCZVzxreYfLw3EtFLtBMSVVY2pA6uxKengriMCdG3DF#authn-key-1",
          "type": "Ed25519VerificationKey2018",
          "owner": "did:v1:test:nym:z279nCCZVzxreYfLw3EtFLtBMSVVY2pA6uxKengriMCdG3DF",
          "publicKeyBase58": "7tJdgUebDRaVFR2d8LzV9BK7RMz5aw2AuW5LsEBBAKWs",
          "privateKey": {
            "privateKeyBase58": "4kftxewt3RQUW7k1MoTqEbZW5MnsJszNAwgEqbjJvKmJYeyUJFmkzYwwMZfB7Z5bWFyo1pQJzZL2mLL5zagc3dAT"
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
          "id": "did:v1:test:nym:z279nCCZVzxreYfLw3EtFLtBMSVVY2pA6uxKengriMCdG3DF#ocap-delegate-key-1",
          "type": "Ed25519VerificationKey2018",
          "owner": "did:v1:test:nym:z279nCCZVzxreYfLw3EtFLtBMSVVY2pA6uxKengriMCdG3DF",
          "publicKeyBase58": "CWERGaLLTsWGAKzpTKpHs9WyZ5Xczgj8HSbcZ7FjGAtQ",
          "privateKey": {
            "privateKeyBase58": "4bzwvphLSbKF3zWEB18dEFusRPSvpFqefeGqUSfNr3dwcN6KD7xNbAG1q1nBAFu7r6Knj4Lmex1zvWXrv632eS4Q"
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
          "id": "did:v1:test:nym:z279nCCZVzxreYfLw3EtFLtBMSVVY2pA6uxKengriMCdG3DF#ocap-invoke-key-1",
          "type": "Ed25519VerificationKey2018",
          "owner": "did:v1:test:nym:z279nCCZVzxreYfLw3EtFLtBMSVVY2pA6uxKengriMCdG3DF",
          "publicKeyBase58": "5U6TbzeAqQtSq9N52XPHFrF5cWwDPHk96uJvKshP4jN5",
          "privateKey": {
            "privateKeyBase58": "5hvHHCpocudyac6fT6jJCHe2WThQHsKYsjazkGV2L1Umwj5w9HtzcqoZ886yHJdHKbpC4W2qGhUMPbHNPpNDK6Dj"
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
  '@context': constants.WEB_LEDGER_CONTEXT_V1_URL,
  type: 'WebLedgerConfiguration',
  ledger: 'did:v1:c02915fc-672d-4568-8e6e-b12a0b35cbb3',
  consensusMethod: 'Continuity2017',
  operationValidator: [{
    type: 'VeresOneValidator2017',
    validatorFilter: [{
      type: 'ValidatorFilterByType',
      validatorFilterByType: ['CreateWebLedgerRecord', 'UpdateWebLedgerRecord']
    }]
  }],
  ledgerConfigurationValidator: [{
    type: 'VeresOneValidator2017',
  }, /*{
    // FIXME: enable signature validation on configuration as well.  How
    // are keys dereferenced?
    type: 'SignatureValidator2017',
    validatorFilter: [{
      type: 'ValidatorFilterByType',
      validatorFilterByType: ['WebLedgerConfiguration']
    }],
    approvedSigner: [
      'did:v1:53ebca61-5687-4558-b90a-03167e4c2838'
    ],
    minimumSignaturesRequired: 1
  }*/],
};

operations.create = {
  '@context': constants.WEB_LEDGER_CONTEXT_V1_URL,
  type: 'CreateWebLedgerRecord',
  record: didDocuments.alpha
};

operations.createElectorPool = {
  '@context': constants.WEB_LEDGER_CONTEXT_V1_URL,
  type: 'CreateWebLedgerRecord',
  record: didDocuments.alpha
};

operations.update = {
  '@context': constants.WEB_LEDGER_CONTEXT_V1_URL,
  type: 'UpdateWebLedgerRecord',
  recordPatch: {
    '@context': constants.VERES_ONE_CONTEXT_URL,
    target: didDocuments.beta.id,
    sequence: 0,
    patch: [{
      "op": "add",
      "path": "/authentication/1",
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
  '@context': constants.WEB_LEDGER_CONTEXT_V1_URL,
  type: 'UpdateWebLedgerRecord',
  recordPatch: {
    '@context': constants.VERES_ONE_CONTEXT_URL,
    target: didDocuments.beta.id,
    sequence: 0,
    patch: [{
      op: "invalid"
    }]
  }
};

operations.updateInvalidChange = {
  '@context': constants.WEB_LEDGER_CONTEXT_V1_URL,
  type: 'UpdateWebLedgerRecord',
  recordPatch: {
    '@context': constants.VERES_ONE_CONTEXT_URL,
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
    "@context": constants.SECURITY_CONTEXT_V2_URL
  }, didDocuments.alpha.capabilityDelegation[0].publicKey);
ldDocuments[didDocuments.alpha.capabilityInvocation[0].publicKey.id] =
  Object.assign({
    "@context": constants.SECURITY_CONTEXT_V2_URL
  }, didDocuments.alpha.capabilityInvocation[0].publicKey);

// beta
ldDocuments[didDocuments.beta.id] = didDocuments.beta;
ldDocuments[didDocuments.beta.capabilityDelegation[0].publicKey.id] =
  Object.assign({
    "@context": constants.SECURITY_CONTEXT_V2_URL
  }, didDocuments.beta.capabilityDelegation[0].publicKey);
ldDocuments[didDocuments.beta.capabilityInvocation[0].publicKey.id] =
  Object.assign({
    "@context": constants.SECURITY_CONTEXT_V2_URL
  }, didDocuments.beta.capabilityInvocation[0].publicKey);

ldDocuments[capabilities.authorizeRequest] = {
  "@context": constants.SECURITY_CONTEXT_V2_URL,
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
