/*!
 * Copyright (c) 2017-2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const bedrock = require('bedrock');

const mock = {};
module.exports = mock;

const ledgerConfigurations = mock.ledgerConfigurations = {};
const operations = mock.operations = {};
const didDocuments = mock.didDocuments = {};
const privateDidDocuments = mock.privateDidDocuments = {};
const keys = mock.keys = {};

mock.authorizedSigners = {
  // fully valid signer
  alpha:
    'did:v1:test:nym:FEPcLNgdfOz4uruoWY9VALiAETdu848om_8sGuYJccE#authn-key-1',
  beta: 'did:v1:5627622e-0ab3-479a-bfe7-0f4983a1f7ce/keys/1'
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

privateDidDocuments.alpha = {
  "@context": "https://w3id.org/veres-one/v1",
  "id": "did:v1:test:nym:FEPcLNgdfOz4uruoWY9VALiAETdu848om_8sGuYJccE",
  "authentication": [
    {
      "type": "RsaSignatureAuthentication2018",
      "publicKey": {
        "id": "did:v1:test:nym:FEPcLNgdfOz4uruoWY9VALiAETdu848om_8sGuYJccE#authn-key-1",
        "type": "RsaSigningKey2018",
        "owner": "did:v1:test:nym:FEPcLNgdfOz4uruoWY9VALiAETdu848om_8sGuYJccE",
        "publicKeyPem": "-----BEGIN PUBLIC KEY-----\r\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1c6NPf2m8J98o6FO65HY\r\n6iD+RE1uSoOfR3OY91EKSu/I7Ntdckqgoygv6W5L5moypUvLe3ZNON1gfdiKGZz+\r\nRmV2HFiC1kYHNWDJLTbpDwfDHTvmwFjGl5btlrsnsSOixJkiUlpMCNhPUEVx1a+P\r\nSANNblrPFHpJJQ5rwBB9DUlJI9sp5WiBSt2fNacymFMb24m8YmKxU4ImB/vJwSOY\r\n5IrkU/AFysicewgpkSRGCOMqn9Z/R4hllq/6x1HIpEH8WqBIQJIadEXLZyQador0\r\nSuvtK7ioexrxfc3uCFZiioiVX4SidawxxMPyi85Rm0ykRQXhkNY0gnnfgLyz3Tbs\r\nGQIDAQAB\r\n-----END PUBLIC KEY-----\r\n",
        "privateKey": {
          "privateKeyPem": "-----BEGIN RSA PRIVATE KEY-----\r\nMIIEowIBAAKCAQEA1c6NPf2m8J98o6FO65HY6iD+RE1uSoOfR3OY91EKSu/I7Ntd\r\nckqgoygv6W5L5moypUvLe3ZNON1gfdiKGZz+RmV2HFiC1kYHNWDJLTbpDwfDHTvm\r\nwFjGl5btlrsnsSOixJkiUlpMCNhPUEVx1a+PSANNblrPFHpJJQ5rwBB9DUlJI9sp\r\n5WiBSt2fNacymFMb24m8YmKxU4ImB/vJwSOY5IrkU/AFysicewgpkSRGCOMqn9Z/\r\nR4hllq/6x1HIpEH8WqBIQJIadEXLZyQador0SuvtK7ioexrxfc3uCFZiioiVX4Si\r\ndawxxMPyi85Rm0ykRQXhkNY0gnnfgLyz3TbsGQIDAQABAoIBAFYxMpdvDkGqyeBd\r\nQyeMYFniex6l6HR5o1h2rY/mR7P1/pYdyQouM5wSs13zbP2yikBA0gMvqenmtOOG\r\nzAWPWKKgfIDo3bXr/TPzlKZ5oHLCulGquFeKcmTiH13IjTPIHfILmd6BMG3QZgkC\r\nNeXjJGvviOOYECs9MQeTTLTc8MzNpTRrJRFiHzC5xat/f78fuvDx4YLBoYpMIQaM\r\nM7TyTURkksOCdHYjz3Ebi6WXYexiWOvswDBi5rFjMbD3ya3Lge0S6oR4mJrkCfVl\r\nbmZc4quZDBR6dtal903qV7pC7eu0dge7HfUjbhE1vIaVBXnJreyfBjdFsdOXIoUK\r\nIdIsDgECgYEA/pb3WSAJ93PBV+Jad1txlt7eTpuLvU8DuBt/cfgM+4XjESqZ84Pt\r\nhHW7QjVJvt92zADa6kF3eGaYWW7bptjEKyyEMY4T7KAzWuxyUTfu5/RVrJ9Wxr81\r\nOIZZRWk2FBKHVmposV5op8hs6idL7eIyVraMn/9qGFt3IH8iTOCcJikCgYEA1v3A\r\nVkn4U6DW1sIjRGD4XfNcEPuPPz+fiSUjhnp3c2gsHaePlt0oomE056hpPdU8uQXK\r\n+lPTE6wZ7QoT0JSZESov3AXVEK/dhpizES6vzhZd5n9fo/EuuYKpC1VrprwyX/pU\r\nlyFABQmsv/MqGNpnjSz8nrillAUgYD1wobPz9HECgYAQhYGFwiODcHqilmjiiAem\r\nD86DcWqvHVqTbw1lOwC0reqfaZFWEUCvsOg3Erg3b88IzCFoxFjZcmb+nsgYWsbY\r\nOmpVwO+gEoFirCd7B9M0MFIDAtAh07TDd0yByaMdyFoKDJvAruzBvqr6wxQVWvGD\r\nWRNlKrEa5YykijuSm5zmiQKBgHDO7SFZ5udaueAuNfsnNqt1ipWOqfdyFvALgLyL\r\nfiocOynERl/O5AdwIiZ8A9ziCt6632rCmTr1TxVF+Ge10Stki4BTvxzmasK5VRxq\r\n9uyYZ+UOaMzJPM8ydCjyRW5Tycr6u3AhjkoWbYK6wRgRYcx+En/mO1uT5Q0asALp\r\nPdTBAoGBAJzIMhN9p8xvDt/RlNcgpse8O4jVJKEvV/86mEAX6iYYPDjjtovkiwnp\r\n/CO0RSaTYhdmWI9t8L1lpUvgSgS766lYoeATBwAm25WBzaG3EkvpcliFDAVE/9gC\r\n7hrvE+pLF41+sUalitkYNnucLPmq75wm9WePPFw3T3ZJJkiVL1e/\r\n-----END RSA PRIVATE KEY-----\r\n"
        }
      }
    }
  ],
  "grantCapability": [
    {
      "type": "RsaSignatureCapabilityAuthorization2018",
      "publicKey": {
        "id": "did:v1:test:nym:FEPcLNgdfOz4uruoWY9VALiAETdu848om_8sGuYJccE#ocap-grant-key-1",
        "type": "RsaSigningKey2018",
        "owner": "did:v1:test:nym:FEPcLNgdfOz4uruoWY9VALiAETdu848om_8sGuYJccE",
        "publicKeyPem": "-----BEGIN PUBLIC KEY-----\r\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1iOv4JvL7SB8RLv8z7r1\r\nAjfhozN3hOCbuGd0h5kCA56Kq0a9Ip2d2s4Asv1gzCwS92D3q+UPpqSrR4/afI4L\r\n+0NjNRHWFxjp0ML9jI0S2PFmYBRZhCqVGseBi11pOBthsLjY3Sxuj/ZgxgSQPYAa\r\n5qHu+VwyWXNcKQhSlEUgeCckODA4OEMk+2U67Vt2FiyggS7uZd4+6UJKuvyzEl6D\r\ntGbZLkeGh3lHISz+jeYY0D+El+8+PyDBcjjam4qiLfpQGwI73eMeOoTnXU9huT9M\r\njiEPuS5RkmMaNajTAYKN6qrpHjJPOVJlNAGLTSFKvDGN0/iivrRDbzOVcMarJ1Ur\r\nDQIDAQAB\r\n-----END PUBLIC KEY-----\r\n",
        "privateKey": {
          "privateKeyPem": "-----BEGIN RSA PRIVATE KEY-----\r\nMIIEpQIBAAKCAQEA1iOv4JvL7SB8RLv8z7r1AjfhozN3hOCbuGd0h5kCA56Kq0a9\r\nIp2d2s4Asv1gzCwS92D3q+UPpqSrR4/afI4L+0NjNRHWFxjp0ML9jI0S2PFmYBRZ\r\nhCqVGseBi11pOBthsLjY3Sxuj/ZgxgSQPYAa5qHu+VwyWXNcKQhSlEUgeCckODA4\r\nOEMk+2U67Vt2FiyggS7uZd4+6UJKuvyzEl6DtGbZLkeGh3lHISz+jeYY0D+El+8+\r\nPyDBcjjam4qiLfpQGwI73eMeOoTnXU9huT9MjiEPuS5RkmMaNajTAYKN6qrpHjJP\r\nOVJlNAGLTSFKvDGN0/iivrRDbzOVcMarJ1UrDQIDAQABAoIBAQCq92sgRMMX22vb\r\n5Mr/fyDGWJ9JkXnHGRy6qb6b1EmLYjUMcjnnPTgezYI5ZZq26ClsYHrdPtC0F5y4\r\nUd36u95NCYxXfpoTbsye5E9Su/9kPbei1hxyLR1GeCqxfi7XoOTqF2rtit/rCKZS\r\n8qnGsFTJ9le5tyZrzHK0P/TOdDJsOj0y/haILCIpRa5PWCEvjFoIdLO8AcStWImB\r\nPjki/zrObh6ZFiYmWUqUp04IQ8gPExfciab5tKZ9XvtYPH5kG59wXlIQvpSQcVFp\r\nlFRNPJV4OxNXStdCXibFak4VFOoxcuhTMj1ExI7PhA1xiilslWPrkz+lWnHFeeRc\r\nNprGQxBxAoGBAPqHtAfB6PS3pDTXbfUS+c/dp/rPpwqIkP9sHlFGYedAYZ9avhXR\r\nesUUWdEAIy91MCN00lYLUQ8UHmkTb4s4JEAAnerYY4ALIzQemrAIRlha1heLcqdY\r\nsDPp7xmBFodRiWW0v6AO0SDqGrsye5UYtY4TWsgnAnQWDz5T66lGwWGXAoGBANrQ\r\nlYGDAFRdeGFvZDwbVz9OJdeoCXIbY0/W9l0YDhQjMLTKc9ufFHsh2pT8Oiv6lRHh\r\nBDEp8x4/yBZ+f1/+dPT6hc8eMXKMReGw2e1kkL9+TawY1z8mZUIkRC/70WxkRBXi\r\nxY/+y53cpVNk1ys+O6s0JQK6ev9k072Sp5TTsOT7AoGBAMhVd5q0bsoxhzdSBXVx\r\n5R1ZTBf9sL91kS0Okfe/5k37Z5T8BQCBcEDkEyZTi89JUGMp6YAwsHL0TZUMm6ei\r\nDyq205CV1IrxXQcyadPV6hqBGK3fLqGvA8efizjDxvYSN2KC9LDS6Fv/l7yVk8kX\r\n5yZjR7bBqu6VLT9T8CB+meilAoGBAIk1ODqQ8bj1L5IxbjH+lvP8ReB33wxtPhYH\r\nXk670cAw3M7REFtL4mTfspevna6MH8OpTJ6jhm6WYhow0iBYh/BB03wvm6QPb5Z4\r\n9f5VDCr3wS7EGNzhb6dM5HEOP6DvMn5ix61mgTmI7SZg2keka3gMZ5TRaGUTTW7X\r\nMjwxjf/XAoGALHMBbAmSCt5Q8lMaqexoT4N32t9XBJ16za0sb/KO+BUYWuAL0Sw/\r\nI+vnQGzXiYlLdLzgF4N8z0rdI7n6/mcIxI//T937iGvN4FYvOA7faxlS34tCGjmE\r\nnmcyBgRMDH0beLjfWQ900Y1Rhfv2HuFYUPjn65RSsJ7LXZP2q5NLeBY=\r\n-----END RSA PRIVATE KEY-----\r\n"
        }
      }
    }
  ],
  "invokeCapability": [
    {
      "type": "RsaSignatureCapabilityAuthorization2018",
      "publicKey": {
        "id": "did:v1:test:nym:FEPcLNgdfOz4uruoWY9VALiAETdu848om_8sGuYJccE#ocap-invoke-key-1",
        "type": "RsaSigningKey2018",
        "owner": "did:v1:test:nym:FEPcLNgdfOz4uruoWY9VALiAETdu848om_8sGuYJccE",
        "publicKeyPem": "-----BEGIN PUBLIC KEY-----\r\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEArocfciiSJ34t4bjduB+b\r\nd+VjAQpZE+d4c2iIm9D3ScN+d+kIJK+U2NAcbX7Yfw1xvmjypQTutPbirfFMzjr0\r\nTYQnl2Qzzr0gZHT6WbRcx9FAxT8QYnqbUPtvgw3SrORPgfv69RzLO1k4HPKLhjBE\r\nxYjcmyqTeSYLYHiYB6qLXSlEAyNW+BJ23dpUyeYNbX+hBmx5jL1q+txOBMI1YV/W\r\nOSehCO3HLDtzT4P951InxqqsRlrn4m6PVHxiR2N/H6jHSMpDfCmEWtJvJpLSVX3q\r\nEB5WYz1Fs3SlwCG7XezFrCAj/ik4miFtwf6+BTUnxJCuSMHYG90CWydSwYgUrUZ3\r\nOQIDAQAB\r\n-----END PUBLIC KEY-----\r\n",
        "privateKey": {
          "privateKeyPem": "-----BEGIN RSA PRIVATE KEY-----\r\nMIIEowIBAAKCAQEArocfciiSJ34t4bjduB+bd+VjAQpZE+d4c2iIm9D3ScN+d+kI\r\nJK+U2NAcbX7Yfw1xvmjypQTutPbirfFMzjr0TYQnl2Qzzr0gZHT6WbRcx9FAxT8Q\r\nYnqbUPtvgw3SrORPgfv69RzLO1k4HPKLhjBExYjcmyqTeSYLYHiYB6qLXSlEAyNW\r\n+BJ23dpUyeYNbX+hBmx5jL1q+txOBMI1YV/WOSehCO3HLDtzT4P951InxqqsRlrn\r\n4m6PVHxiR2N/H6jHSMpDfCmEWtJvJpLSVX3qEB5WYz1Fs3SlwCG7XezFrCAj/ik4\r\nmiFtwf6+BTUnxJCuSMHYG90CWydSwYgUrUZ3OQIDAQABAoIBAAoq4RAbgPhAB5hA\r\n1tnlLX98o5np6mqYb5H5owvAzsdDVljSAKFygS9oYF+YpjAwrlGzd39ZnDZ6s5YC\r\nmsDg+l6RtmTBd6sxpXN0xSj4svcJH8bd96xlDCtZmpN9+KoN2vvtnB8vgD+C4Rv+\r\nnVZB9Z+0a3W2s0S5jKwgGmtH6jqRFinz5VPiCwYqlidHTvav71o6Avsvri2bG6Hp\r\nX/9V1IlWJd1iDn55nW2vD8eDzWqX2qZybKH24tGq2GPO13RTNPktTXvGZTkJvcst\r\nHyNVQIsoux2hVpnqr9VRtBJM29qzh/SgH5NkoOgrPg2pUb+UwIdJmCzLpsFoWuvn\r\nBEQf1AkCgYEA5RM9qwnVK4ENEb1AOVD0YnMUXYiUWroCzs8bgPRgmlt2qUmot8pM\r\ncZmPLaOVTtwpfKRdOI+ghpa61IjSw+nACpPGUn56i5+uRyqr/ec1cXFWvTOTeJAL\r\noxqzob5isxvdeQ36SxoZbVetidOipypmMyWsc3jfc2gtRY314nw2zp8CgYEAwwqU\r\nUfaYjoiLh9pC+rupjHpPT9VQiDAif8/M7gq2Son3SmKcXlUvyMO8ZIrW70jTtZSC\r\nPS1J5Dp+OxgQCw6SsOFicFCzVH6YxNJE0GCUHN39fSJ9qpcNtDJEkccryejxW6x0\r\n6lBpVtt9LJ+T4gih0viQqyXiolKmnkg6FHqK4ycCgYEAik+twmGzdgr7aySLbI/2\r\nnqLBPyBCAu2g2GGwR5JF6a0j3l79IcthkI2ZJ4NHmU/RNNLA/m+qCtljgQQDzgqK\r\ny1giPJjlQPxu68VWB33chNxb9Oz5M6g1fouWvigHzAEdHgRUhZgClkSEIV3JLYmq\r\nH2O11hq7QCE8hGyMc+1v4h0CgYBC22CGTBJ1YWb69Z1aF3QCHHcNdaC6Xk2lJFUq\r\nD+/20x46mFzjlS3hEv+EM3eD5KH1r2eJkvmuS0Kz/Qaa068DBO9acr9WKmMxrKY8\r\nC68Zyhq3h1guXsMqzsRkeDKRbtE1TINzQocpZ+mbn0PxCmZ2TBBDKqRqYgyNW1LV\r\nbEAppwKBgHIF6KnK/XoBufX/IfbpFNY04dw45IxrSxuDdAR0wPadIqXJBK5xw1wi\r\nR64KvaGODII621ozOac37yFyPdn0ri8IQf/4mgUXlXmLHCTnZU8BFzG6978R6X6/\r\njLPM9x0Dmknq/gX0SMpGgIkT5O8NVrlx3I47WIr0xXn1FykOw6Bg\r\n-----END RSA PRIVATE KEY-----\r\n"
        }
      }
    }
  ]
};
didDocuments.alpha = bedrock.util.clone(privateDidDocuments.alpha);
delete didDocuments.alpha.authentication[0].publicKey.privateKey;
delete didDocuments.alpha.grantCapability[0].publicKey.privateKey;
delete didDocuments.alpha.invokeCapability[0].publicKey.privateKey;

operations.alpha = {
  '@context': 'https://w3id.org/webledger/v1',
  type: 'CreateWebLedgerRecord',
  record: didDocuments.alpha
};

keys.beta = {
  publicKey: '-----BEGIN PUBLIC KEY-----\n' +
    'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA3Keb82mEEcdsocDDGz4V\n' +
    'q4qetnlONh9KMNtyOTIiDmAx+cNUZj2ApJH64Gsz7EfmXGyai/l4NvtlAKXGEEw3\n' +
    'dPJGjiE1DckXisTWIc5uRt+Yih4593LVPcrgWfspmg+UqqvmqsSKGYHrKhZ09Wi1\n' +
    'a+vD+6iaYcqydBnUK6X1m9DFtoCbu5eCaBlIVt4j7OhKHN8XkPFfwwbKms3g+O2U\n' +
    'Pj3atdlmQGuJjd5fjfzrtG32sn6+FPV3+nlJ6kncppR0io4gh05Pv5DeAY3vrJdN\n' +
    'c8az9ph0xLK7p/n5o7RI4g+o0RHiczNqsv/I5YknFmGjqPOnThB9Jfy2ctLvDW5a\n' +
    'bQIDAQAB\n' +
    '-----END PUBLIC KEY-----',
  privateKey: '-----BEGIN RSA PRIVATE KEY-----\n' +
    'MIIEpQIBAAKCAQEA3Keb82mEEcdsocDDGz4Vq4qetnlONh9KMNtyOTIiDmAx+cNU\n' +
    'Zj2ApJH64Gsz7EfmXGyai/l4NvtlAKXGEEw3dPJGjiE1DckXisTWIc5uRt+Yih45\n' +
    '93LVPcrgWfspmg+UqqvmqsSKGYHrKhZ09Wi1a+vD+6iaYcqydBnUK6X1m9DFtoCb\n' +
    'u5eCaBlIVt4j7OhKHN8XkPFfwwbKms3g+O2UPj3atdlmQGuJjd5fjfzrtG32sn6+\n' +
    'FPV3+nlJ6kncppR0io4gh05Pv5DeAY3vrJdNc8az9ph0xLK7p/n5o7RI4g+o0RHi\n' +
    'czNqsv/I5YknFmGjqPOnThB9Jfy2ctLvDW5abQIDAQABAoIBAQCZLCjQAjFR/jPk\n' +
    '3WETKjf0ytd+KBso6vOfktZp6elGPXSzwup1xr/kfgm/e+uhXBAHnMRz4ouW71Cf\n' +
    '8HPboGzm28AqrdacaTnUdOuIsDpRLKpBRtZKdgadTJYNIJMyhRpYl9gaNzD+n/dV\n' +
    'Uh2CtlsqPZHgwpvYwtK6Uau9WQl0TWDYMQdLef//r8btrQZ935UDPn0O77cyrjFH\n' +
    'SpUv8ldDml/0KJEuzXBLwiOTkn+ydBZ4E0xEidSKtBBb3vyhCLbGloWtZzDdv4Ka\n' +
    'OyA2O2JeuSBW9ZMwVd1UHobEobLeMsFufTxuHFhfi2lqp7WeAftnR9oVinZajJto\n' +
    '4BMM6vJBAoGBAO6WKHmKmdMaRqogURVtvrRrq22AnZmZRuekhRVPNQiBoPUw6vw1\n' +
    'txpAVZgCYlwAH0XcsviSizhAk/vMxUCA0jaXFXM21lxr55unCSg/kWeqqO9Afpjl\n' +
    'xL+KuqX5pkvKDqUeoSCCczyF8oTNuaWlxyicIJj9S4mVAzala0z/CWB5AoGBAOzC\n' +
    'Z+o1wWYY0+uIYXqze6JkwS8/5P93p59n4qZDHmPLurYlrw5+ADyydbURR/WbJOYL\n' +
    'Uon8mgc/2fdVlDpe4K+OIYi0aZmOye2iGNwUvGGuzoV5K8waqUHSsz2LDtAiOZSN\n' +
    '81LxkWHvT/QB7Q7Fp2dhwMhZ8yDNeNGOVskufdSVAoGAK5sSJrSoTKb+x1VEvI/k\n' +
    'TQFowYjCRTJ4fRnaoPxrCvT2QBoCuLnwj0G24yN8aqgzDwe5RikyfMOAyIKygomI\n' +
    '4iVW7EnXf+jQ2ef7inmjz7inS6MUAEnuXbuzRWaNeEijyJYCiPiOqz8oBhG7noTg\n' +
    'E5IFezDAP5MWlURCij4KrrECgYEA6s7/ymvXzA8RlkXjD5MUKgGtCtReo/MivliE\n' +
    'k4p7iFQUb/O9wyy5xXjkfliOOorMtI5EJO/uPwRXgxJP+PgB9HqMzYzIMnBH2jLq\n' +
    'XtL95g89aWi8RCeo98wk0gOpBEj9PFTwHrHQEwYKEKEcX4sttL1hOhLjqwO9MG/v\n' +
    'qIVAbGUCgYEAxZ1d/u2QJYSy9Lho9zTpOCgFPY3R9Bju0XK37lqsNxlVxE9OU3uC\n' +
    'X7E1UgvC4FbWSjRzCdsSq7ixkuYXzcHDch0UEX+4mZweKvodtAjFtLAkrGmAH7cC\n' +
    'N/2BNGqcYPn2i/AJqFIrhLHHG+oPl8XCQUr3YOuxlSuAn/Y+nVCd4WE=\n' +
    '-----END RSA PRIVATE KEY-----'
};

mock.ldDocuments = {};

// alpha
mock.ldDocuments[didDocuments.alpha.id] = didDocuments.alpha;
mock.ldDocuments[didDocuments.alpha.grantCapability[0].publicKey.id] =
  Object.assign({
    "@context": "https://w3id.org/identity/v1"
  }, didDocuments.alpha.grantCapability[0].publicKey);
mock.ldDocuments[didDocuments.alpha.invokeCapability[0].publicKey.id] =
  Object.assign({
    "@context": "https://w3id.org/identity/v1"
  }, didDocuments.alpha.invokeCapability[0].publicKey);

// beta
mock.ldDocuments['did:v1:5627622e-0ab3-479a-bfe7-0f4983a1f7ce'] = {
  "@context": "https://w3id.org/identity/v1",
  "id": "did:v1:5627622e-0ab3-479a-bfe7-0f4983a1f7ce",
  "publicKey": [{
    "id": 'did:v1:5627622e-0ab3-479a-bfe7-0f4983a1f7ce/keys/1',
    "type": "CryptographicKey",
    "owner": "did:v1:5627622e-0ab3-479a-bfe7-0f4983a1f7ce",
    "publicKeyPem": keys.beta.publicKey
  }]
};
mock.ldDocuments['did:v1:5627622e-0ab3-479a-bfe7-0f4983a1f7ce/keys/1'] = {
  "@context": "https://w3id.org/identity/v1",
  "type": "CryptographicKey",
  "owner": "did:v1:5627622e-0ab3-479a-bfe7-0f4983a1f7ce",
  "label": "Signing Key 1",
  "id": 'did:v1:5627622e-0ab3-479a-bfe7-0f4983a1f7ce/keys/1',
  "publicKeyPem": keys.beta.publicKey
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
