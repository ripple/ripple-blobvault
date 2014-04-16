FORMAT: 1A
HOST: https://justmoon.net/ripple-blobvault/

# Ripple Vault
The **Ripple Vault** is a server that allows Ripple users to store private and public information about their account.

Its other main function is to act as an _active agent_ on behalf of the user to do things like:

* notify the user about invoices, incoming payments, etc.
* synchronize the user's different clients
* negotiate payment modalities
* &hellip;

Private information is stored in an encrypted format. Even the operator of the Vault can't read it.

Public information is signed. Even the operator of the Vault can't manipulate it.

# Group User
The _blob_ refers to the private data that a user is storing in the vault.

## POST /users
Create a new user.
+ Request (application/json)

        {
          id: [hash],
          name: [Ripple name],
          address: [address],
          signature: [ECDSA signature using account key],
          pubkey: [pubkey],
          auth_secret: [auth_secret],
          blob: [encrypted_blob]
        }

+ Response 201 (application/json)

        {
          "result": "success"
        }

## GET /user/{id}
Fetch user information.
+ Parameters

    + id (required, string, `952de772210118f043a4e2225da5f5943609c653a6736940e0fad4e9c7cd3cfd`) ... ID of the user to fetch

+ Response 200 (application/json)

        {
          id: "952de772210118f043a4e2225da5f5943609c653a6736940e0fad4e9c7cd3cfd",
          name: "alice",
          address: [address],
          blob_url: "/user/952de772210118f043a4e2225da5f5943609c653a6736940e0fad4e9c7cd3cfd/blob"
        }



## Blob [/user/{id}/blob]
+ Parameters

    + id (required, string, `952de772210118f043a4e2225da5f5943609c653a6736940e0fad4e9c7cd3cfd`) ... User ID

### Retrieve blob [GET]
This request will download the latest version of the blob and all available patches.

Note that the revision number refers to the revision of the blob field. Any patches provided a applied on top of it.

+ Response 200 (application/json)

        {
          blob: [encrypted_blob],
          revision: 42,
          patches: [
            [blob_patch_43],
            [blob_patch_44]
          ]
        }
        
### Consolidate blob [PUT]
Over time blobs will accumulate more and more patches, so from time to time, clients should upload a new version of the encrypted blob which consolidates all patches up to a certain revision.

If any new patches are submitted while the client is performing the consolidation, they will receive a revision number that is greater than the revision of the consolidation and will not be removed.

Clients **MUST NOT** make changes that are not part of one of the patches, otherwise those changes may get overwritten by another consolidation being performed by another client at the same time. Applying patches is deterministic, so any two clients performing the same consolidation should arrive at the same result.

+ Request (application/json)

        {
          blob: [encrypted_blob],
          revision: 45,
          signature: [HMAC using auth_secret]
        }

+ Response 201 (application/json)

        {
          result: "success"
        }

## Patches [/user/{id}/blob/patches]
+ Parameters

    + id (required, string, `952de772210118f043a4e2225da5f5943609c653a6736940e0fad4e9c7cd3cfd`)

### Retrieve currently known patches [GET]
This request downloads only the patches, omitting the base blob. This can be used in order to update the locally available blob.

Part of the response is the revision that the patches should be applied on top of. If the client has a lower revision, it should redownload the blob. If the client has a higher revision it should drop the patches its local blob already contains.

+ Response 200 (application/json)

        {
          revision: 42,
          patches: [
            [blob_patch_43],
            [blob_patch_44]
          ]
        }

### Submit a patch [POST]
Submitting a new patch stores it in the Vault. Patches can never be deleted, only consolidated into a new version of the blob.

+ Request (application/json)

        {
          patch: [blob_patch],
          signature: [HMAC using auth_secret]
        }

+ Response 201 (application/json)

        {
          "result": "success",
          "revision": 14
        }

# Group Pay API

## GET /pay

