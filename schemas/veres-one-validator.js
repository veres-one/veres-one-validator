/*!
 * Copyright (c) 2017-2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const {constants} = require('bedrock').config;
const {schemas} = require('bedrock-validation');
const did = require('./did');
const urnUuid = require('./urn-uuid');
const {serviceDescriptor, serviceId} = require('./service');

const caveat = {
  additionalProperties: false,
  required: [
    'type'
  ],
  type: 'object',
  properties: {
    type: {
      type: 'string',
      // FIXME: enable when term is finalized
      // enum: ['VeresOneElectorTicketAgent']
    }
  }
};

const capability = {
  additionalProperties: false,
  type: 'object',
  required: [
    'caveat',
    'id',
    'invocationTarget',
  ],
  properties: {
    caveat: {
      type: 'array',
      minItems: 1,
      items: caveat,
    },
    id: did(),
    invocationTarget: {
      // FIXME: more specific pattern?
      type: 'string',
    }
  },
};

const config = {
  title: 'Veres One Validator Config',
  required: [
    'type',
    // 'validatorFilter',
  ],
  type: 'object',
  properties: {
    type: {
      type: 'string',
      enum: ['VeresOneValidator2017'],
    },
    validatorFilter: {
      title: 'Validator Type Filter',
      type: 'array',
      minItems: 1,
      maxItems: 1,
      items: {
        required: [
          'type',
          'validatorFilterByType'
        ],
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['ValidatorFilterByType']
          },
          validatorFilterByType: {
            type: 'array',
            minItems: 2,
            maxItems: 2,
            uniqueItems: true,
            items: {
              type: 'string',
              enum: ['CreateWebLedgerRecord', 'UpdateWebLedgerRecord']
            },
          }
        },
        additionalProperties: false
      },
    }
  },
  additionalProperties: false
};

const publicKey = {
  title: 'Veres One DID Public Key',
  additionalProperties: false,
  required: [
    'controller',
    'id',
    'type',
  ],
  type: 'object',
  properties: {
    id: {
      type: 'string',
    },
    type: {
      type: 'string',
      enum: ['RsaVerificationKey2018', 'Ed25519VerificationKey2018'],
    },
    controller: did(),
    // FIXME: make schema require this for RsaVerificationKey2018
    publicKeyPem: schemas.publicKeyPem(),
    // FIXME: make schema require this for Ed25519VerificationKey2018
    publicKeyBase58: {
      type: 'string',
    }
  },
};

const didDocumentContext = {
  type: 'array',
  items: [{
    type: 'string',
    enum: [constants.DID_CONTEXT_URL]
  }, {
    type: 'string',
    enum: [constants.VERES_ONE_CONTEXT_URL]
  }],
  maxItems: 2,
  minItems: 2,
};

const didDocument = {
  title: 'Veres One DID Document',
  additionalProperties: false,
  // FIXME: what *are* required properties?
  required: [
    'id',
    'authentication',
    'capabilityDelegation',
    'capabilityInvocation',
  ],
  type: 'object',
  properties: {
    '@context': didDocumentContext,
    id: did(),
    // FIXME: be more specific with restrictions for all properties below
    invocationTarget: {
      type: 'string',
    },
    invoker: {
      type: 'string',
    },
    authentication: {
      type: 'array',
      minItems: 1,
      items: publicKey,
    },
    capabilityDelegation: {
      type: 'array',
      minItems: 1,
      items: publicKey,
    },
    capabilityInvocation: {
      type: 'array',
      minItems: 1,
      items: publicKey,
    },
    service: {
      type: 'array',
      minItems: 1,
      items: serviceDescriptor(),
    },
  },
};

const didDocumentPatch = {
  title: 'DID Document Patch',
  required: [
    '@context',
    'patch',
    'sequence',
    'target'
  ],
  type: 'object',
  properties: {
    '@context': {
      // TODO: be more explicit here
      type: 'array'
    },
    target: {
      anyOf: [did(), urnUuid()],
    },
    // FIXME: also support `frame` property later
    patch: {
      type: 'array',
      minItems: 1,
      items: {
        required: [
          'op',
          'path'
        ],
        type: 'object',
        // FIXME: more strictly validate properties based on value of `op`
        properties: {
          op: {
            type: 'string',
            enum: ['add', 'copy', 'move', 'remove', 'replace', 'test']
          },
          from: {
            type: 'string',
          },
          path: {
            type: 'string',
          },
          value: {
            //type: ['number', 'string', 'boolean', 'object', 'array'],
          }
        },
        additionalProperties: false
      }
    },
    sequence: {
      type: 'integer',
      minimum: 0,
      maximum: Number.MAX_SAFE_INTEGER
    }
  },
  additionalProperties: false
};

const ContinuityElectorTypes = {
  type: 'string',
  enum: [
    'Continuity2017Elector',
    'Continuity2017GuarantorElector',
  ],
};

const Continuity2017Elector = {
  type: 'string',
  enum: ['Continuity2017Elector'],
};

const electorPoolDocument = {
  title: 'ElectorPool Document',
  required: [
    '@context',
    'id',
    'electorPool',
    'invoker',
    'maximumElectorCount'
  ],
  type: 'object',
  properties: {
    '@context': schemas.jsonldContext(constants.VERES_ONE_CONTEXT_URL),
    id: urnUuid(),
    invoker: did(),
    electorPool: {
      type: 'array',
      items: {
        type: 'object',
        required: [
          'capability',
          'elector',
          'id',
          'service',
          'type',
        ],
        properties: {
          elector: did(),
          id: urnUuid(),
          service: {
            anyOf: [serviceDescriptor(), serviceId()]
          },
          type: {
            anyOf: [
              Continuity2017Elector, {
                type: 'array',
                maxItems: 1,
                minItems: 1,
                items: Continuity2017Elector
              }, {
                type: 'array',
                maxItems: 2,
                minItems: 2,
                uniqueItems: true,
                items: ContinuityElectorTypes
              }]
          },
          capability: {
            type: 'array',
            minItems: 1,
            items: capability
          }
        }
      }
    },
    maximumElectorCount: {
      type: 'integer',
      minimum: 1,
    }
  },
  additionalProperties: false,
};

const proof = {
  required: [
    'type'
  ],
  type: 'object',
  properties: {
    type: {
      type: 'string',
      enum: ['RsaSignature2018', 'Ed25519Signature2018'],
    }
  }
};

const baseCapability = {
  type: 'object',
  additionalProperties: false,
  required: [
    'capability', 'capabilityAction', 'created', 'jws', 'proofPurpose', 'type'
  ],
  properties: {
    capability: {type: 'string'},
    capabilityAction: {
      type: 'string',
      enum: ['AuthorizeRequest', 'RegisterDid', 'UpdateDidDocument'],
    },
    created: schemas.w3cDateTime(),
    creator: {type: 'string'},
    jws: {type: 'string'},
    proofPurpose: {
      type: 'string',
      enum: ['capabilityInvocation'],
    },
    type: {
      type: 'string',
      enum: ['RsaSignature2018', 'Ed25519Signature2018']
    },
    verificationMethod: {type: 'string'},
  }
};

const creatorOrVerificationMethod = {
  oneOf: [{
    required: ['creator'],
    properties: {
      verificationMethod: {not: {}}
    }
  }, {
    required: ['verificationMethod'],
    properties: {
      creator: {not: {}}
    }
  }]
};

const authorizedRequestCapability = {
  allOf: [
    baseCapability,
    creatorOrVerificationMethod, {
      properties: {
        capabilityAction: {
          enum: ['AuthorizeRequest'],
        },
        // FIXME: this is for testnet v2 only
        jws: {
          enum: ['MOCKPROOF'],
        },
      }
    }]
};

const registerDidCapability = {
  allOf: [
    baseCapability,
    creatorOrVerificationMethod, {
      properties: {
        capabilityAction: {
          enum: ['RegisterDid'],
        },
      }
    }]
};

const updateDidCapability = {
  allOf: [
    baseCapability,
    creatorOrVerificationMethod, {
      properties: {
        capabilityAction: {
          enum: ['UpdateDidDocument'],
        },
      }
    }]
};

const createDid = {
  title: 'Veres One Create DID',
  required: [
    '@context',
    'creator',
    'proof',
    'record',
    'type',
  ],
  type: 'object',
  properties: {
    // TODO: require did context
    '@context': schemas.jsonldContext(constants.WEB_LEDGER_CONTEXT_V1_URL),
    creator: {
      type: 'string'
    },
    type: {
      type: 'string',
      enum: ['CreateWebLedgerRecord'],
    },
    record: didDocument,
    proof: {
      anyOf: [{
        type: 'array',
        items: [authorizedRequestCapability, registerDidCapability],
        additionalItems: false,
      }, {
        type: 'array',
        items: [registerDidCapability, authorizedRequestCapability],
        additionalItems: false,
      }],
    }
  },
  additionalProperties: false
};

const createElectorPool = {
  title: 'Create ElectorPool',
  required: [
    '@context',
    'proof',
    'record',
    'type',
  ],
  type: 'object',
  properties: {
    '@context': schemas.jsonldContext(constants.WEB_LEDGER_CONTEXT_V1_URL),
    type: {
      type: 'string',
      enum: ['CreateWebLedgerRecord'],
    },
    record: electorPoolDocument,
    proof: {
      anyOf: [proof, {
        type: 'array',
        minItems: 1,
        items: proof,
      }]
    }
  },
  additionalProperties: false
};

const updateDid = {
  title: 'Update DID',
  required: [
    '@context',
    'creator',
    'proof',
    'recordPatch',
    'type'
  ],
  type: 'object',
  properties: {
    '@context': schemas.jsonldContext(constants.WEB_LEDGER_CONTEXT_V1_URL),
    creator: {type: 'string'},
    type: {
      type: 'string',
      enum: ['UpdateWebLedgerRecord'],
    },
    recordPatch: didDocumentPatch,
    proof: {
      anyOf: [{
        type: 'array',
        items: [authorizedRequestCapability, updateDidCapability],
        additionalItems: false,
      }, {
        type: 'array',
        items: [updateDidCapability, authorizedRequestCapability],
        additionalItems: false,
      }],
    }
  },
  additionalProperties: false
};

const ledgerConfiguration = {
  title: 'Veres One WebLedgerConfiguration',
  additionalProperties: false,
  required: [
    '@context',
    'consensusMethod',
    'electorSelectionMethod',
    'ledger',
    'ledgerConfigurationValidator',
    'operationValidator',
    'proof',
    'sequence',
    'type',
  ],
  type: 'object',
  properties: {
    '@context': schemas.jsonldContext(constants.WEB_LEDGER_CONTEXT_V1_URL),
    consensusMethod: {
      type: 'string',
      enum: ['Continuity2017'],
    },
    creator: {type: 'string'},
    electorSelectionMethod: {
      additionalProperties: false,
      required: [
        // maximumElectorCount is *not* required in the configuration
        // FIXME: electorPool not required for testnet_v2
        // 'electorPool',
        'type',
      ],
      type: 'object',
      properties: {
        maximumElectorCount: {
          type: 'integer',
          minimum: 1,
        },
        electorPool: urnUuid(),
        type: {
          type: 'string',

          // FIXME: using MostRecentParticipants for now
          enum: ['MostRecentParticipants']
        }
      }
    },
    ledger: {
      // FIXME: enforce? did:v1:eb8c22dc-bde6-4315-92e2-59bd3f3c7d59
      type: 'string',
    },
    ledgerConfigurationValidator: {
      type: 'array',
      maxItems: 1,
      minItems: 1,
      items: {
        additionalProperties: false,
        required: ['type'],
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['VeresOneValidator2017'],
          }
        }
      }
    },
    operationValidator: {
      type: 'array',
      maxItems: 1,
      minItems: 1,
      items: {
        additionalProperties: false,
        required: [
          'type',
          'validatorFilter',
        ],
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['VeresOneValidator2017'],
          },
          validatorFilter: {
            type: 'array',
            maxItems: 1,
            minItems: 1,
            items: {
              additionalProperties: false,
              required: ['type', 'validatorFilterByType'],
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['ValidatorFilterByType'],
                },
                validatorFilterByType: {
                  type: 'array',
                  maxItems: 2,
                  minItems: 2,
                  uniqueItems: true,
                  items: {
                    type: 'string',
                    enum: ['CreateWebLedgerRecord', 'UpdateWebLedgerRecord'],
                  },
                }
              }
            }
          }
        }
      }
    },
    proof: {
      allOf: [
        schemas.linkedDataSignature2018(), {
          // FIXME: this is only for testnet_v2
          type: 'object',
          required: ['proofPurpose'],
          properties: {
            proofPurpose: {
              type: 'string',
              enum: ['assertionMethod']
            }
          }
        }
      ]
    },
    sequence: {
      type: 'integer',
      // FIXME: this is only for testnet_v2
      enum: [0],
      // minimum: 0,
    },
    type: {
      type: 'string',
      enum: ['WebLedgerConfiguration']
    }
  },
};

module.exports.config = () => config;
module.exports.didDocument = () => didDocument;
module.exports.didDocumentPatch = () => didDocumentPatch;
module.exports.electorPoolDocument = () => electorPoolDocument;
module.exports.ledgerConfiguration = () => ledgerConfiguration;
module.exports.operation = () => ({
  title: 'Veres One WebLedgerOperation',
  anyOf: [createDid, updateDid, createElectorPool]
});
