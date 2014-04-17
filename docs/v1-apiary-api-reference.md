FORMAT: 1A
HOST: http://curlpaste.com:8080/v1

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
## POST /user
# Create a new user

Associated test is test/test-user-create.js

+ Request (application/json)

        {
            username : [Ripple name]
            auth_secret : [auth_secret]
            blob_id : [hash]
            data : [encrypted blob] ,
            address : [Ripple address]
            email: [email address],
            hostlink: [hostlink]
        }

+ Response 201 (application/json)

        {
          "result": "success"
        }

## GET /user/{username}
# Get user by name        
Associated test is test/test-user-get.js

+ Parameters

    + username (required, string, `Morgana`) ... username of the user to fetch

+ Response 200 (application/json)

        {
        username : "Morgana",
        address : "r24242asdfe0fe0fe0fea0sfesfjkej",
        "version":3,
        "blobvault":"http://curlpaste.com:8080",
        "pakdf":
            {
             "host":"auth1.ripple.com",
             "url":"https://auth1.ripple.com/api/sign",
            "exponent":"010001",
            "alpha":"7283d19e784f48a96062271a4fa6e2c3addf14e6edf78a4bb61364856d580f13552008d7b9e3b60ebd9555e9f6c7778ec69f976757d206134e54d61ba9d588a7e37a77cf48060522478352d76db000366ef669a1b1ca93c5e3e05bc344afa1e8ccb15d3343da94180dccf590c2c32408c3f3f176c8885e95d988f1565ee9b80c12f72503ab49917792f907bbb9037487b0afed967fefc9ab090164597fcd391c43fab33029b38e66ff4af96cbf6d90a01b891f856ddd3d94e9c9b307fe01e1353a8c30edd5a94a0ebba5fe7161569000ad3b0d3568872d52b6fbdfce987a687e4b346ea702e8986b03b6b1b85536c813e46052a31ed64ec490d3ba38029544aa",
            "modulus":"c7f1bc1dfb1be82d244aef01228c1409c198894eca9e21430f1669b4aa3864c9f37f3d51b2b4ba1ab9e80f59d267fda1521e88b05117993175e004543c6e3611242f24432ce8efa3b81f0ff660b4f91c5d52f2511a6f38181a7bf9abeef72db056508bbb4eeb5f65f161dd2d5b439655d2ae7081fcc62fdcb281520911d96700c85cdaf12e7d1f15b55ade867240722425198d4ce39019550c4c8a921fc231d3e94297688c2d77cd68ee8fdeda38b7f9a274701fef23b4eaa6c1a9c15b2d77f37634930386fc20ec291be95aed9956801e1c76601b09c413ad915ff03bfdc0b6b233686ae59e8caf11750b509ab4e57ee09202239baee3d6e392d1640185e1cd"
            }
        }

## GET /user/{ripple_address}
# Get user by Ripple address
Associated test is test/test-user-get.js

+ Parameters

    + ripple_address (required, string, `r24242asdfe0fe0fe0fea0sfesfjkej`) ... Ripple address of the user to fetch

+ Response 200 (application/json)

        {
        username : "Morgana",
        version : 3,
        address : "r24242asdfe0fe0fe0fea0sfesfjkej",
        exists : true,
        "version":3,
        "blobvault":"http://curlpaste.com:8080",
        "pakdf":
            {
             "host":"auth1.ripple.com",
             "url":"https://auth1.ripple.com/api/sign",
            "exponent":"010001",
            "alpha":"7283d19e784f48a96062271a4fa6e2c3addf14e6edf78a4bb61364856d580f13552008d7b9e3b60ebd9555e9f6c7778ec69f976757d206134e54d61ba9d588a7e37a77cf48060522478352d76db000366ef669a1b1ca93c5e3e05bc344afa1e8ccb15d3343da94180dccf590c2c32408c3f3f176c8885e95d988f1565ee9b80c12f72503ab49917792f907bbb9037487b0afed967fefc9ab090164597fcd391c43fab33029b38e66ff4af96cbf6d90a01b891f856ddd3d94e9c9b307fe01e1353a8c30edd5a94a0ebba5fe7161569000ad3b0d3568872d52b6fbdfce987a687e4b346ea702e8986b03b6b1b85536c813e46052a31ed64ec490d3ba38029544aa",
            "modulus":"c7f1bc1dfb1be82d244aef01228c1409c198894eca9e21430f1669b4aa3864c9f37f3d51b2b4ba1ab9e80f59d267fda1521e88b05117993175e004543c6e3611242f24432ce8efa3b81f0ff660b4f91c5d52f2511a6f38181a7bf9abeef72db056508bbb4eeb5f65f161dd2d5b439655d2ae7081fcc62fdcb281520911d96700c85cdaf12e7d1f15b55ade867240722425198d4ce39019550c4c8a921fc231d3e94297688c2d77cd68ee8fdeda38b7f9a274701fef23b4eaa6c1a9c15b2d77f37634930386fc20ec291be95aed9956801e1c76601b09c413ad915ff03bfdc0b6b233686ae59e8caf11750b509ab4e57ee09202239baee3d6e392d1640185e1cd"
            }
        }

## DELETE /user/{username}{?signature,signature_date,signature_blob_id}
# Delete a user
Associated test is test/test-user-delete.js

+ Parameters
    + signature ... signature
    + signature_date ... the date
    + signature_blob_id ... blob_id 

+ Response 200 (application/json)

        {
          "result": "success"
        }

# Group Email Verification
## GET /user/{username}/verify/{token}

+ Parameters
    + username ... string
    + token ... string

+ Response 200 (application/json)

        {   
            foo : "bar" 
        }

# Group Meta 

The meta lookup returns information about the services here.

## GET /meta

+ Response 200 (application/json)

        {
        "version":3,
        "blobvault":"http://curlpaste.com:8080",
        "pakdf":
            {
             "host":"auth1.ripple.com",
             "url":"https://auth1.ripple.com/api/sign",
            "exponent":"010001",
            "alpha":"7283d19e784f48a96062271a4fa6e2c3addf14e6edf78a4bb61364856d580f13552008d7b9e3b60ebd9555e9f6c7778ec69f976757d206134e54d61ba9d588a7e37a77cf48060522478352d76db000366ef669a1b1ca93c5e3e05bc344afa1e8ccb15d3343da94180dccf590c2c32408c3f3f176c8885e95d988f1565ee9b80c12f72503ab49917792f907bbb9037487b0afed967fefc9ab090164597fcd391c43fab33029b38e66ff4af96cbf6d90a01b891f856ddd3d94e9c9b307fe01e1353a8c30edd5a94a0ebba5fe7161569000ad3b0d3568872d52b6fbdfce987a687e4b346ea702e8986b03b6b1b85536c813e46052a31ed64ec490d3ba38029544aa",
            "modulus":"c7f1bc1dfb1be82d244aef01228c1409c198894eca9e21430f1669b4aa3864c9f37f3d51b2b4ba1ab9e80f59d267fda1521e88b05117993175e004543c6e3611242f24432ce8efa3b81f0ff660b4f91c5d52f2511a6f38181a7bf9abeef72db056508bbb4eeb5f65f161dd2d5b439655d2ae7081fcc62fdcb281520911d96700c85cdaf12e7d1f15b55ade867240722425198d4ce39019550c4c8a921fc231d3e94297688c2d77cd68ee8fdeda38b7f9a274701fef23b4eaa6c1a9c15b2d77f37634930386fc20ec291be95aed9956801e1c76601b09c413ad915ff03bfdc0b6b233686ae59e8caf11750b509ab4e57ee09202239baee3d6e392d1640185e1cd"
            }
        }


# Group Blob
The blob is encrypted client-side and the server has no access to the private keys.
## Reading a blob [/blob/{blob_id}]
### Fetch the blob [GET]
This request will download the latest version of the blob and all available patches.

Note that the revision number refers to the revision of the blob field. Any patches provided a applied on top of it.

+ Parameters

    + blob_id (required, string, `952de772210118f043a4e2225da5f5943609c653a6736940e0fad4e9c7cd3cfd`) ... User ID
    
+ Response 200 (application/json)

        {
          blob: [encrypted_blob],
          revision: 42,
          patches: [
            [blob_patch_43],
            [blob_patch_44]
          ]
        }
        

## Get a blob specific Patch [/blob/{blob_id}/patch/{patch_id}]
### Retrieve currently known patches [GET]
This request downloads only the patches, omitting the base blob. This can be used in order to update the locally available blob.

Part of the response is the revision that the patches should be applied on top of. If the client has a lower revision, it should redownload the blob. If the client has a higher revision it should drop the patches its local blob already contains.
+ Parameters

    + blob_id (required, string, `952de772210118f043a4e2225da5f5943609c653a6736940e0fad4e9c7cd3cfd`)
    + patch_id (required, string, `2`)

+ Response 200 (application/json)

        {
          revision: 42,
          patches: [
            [blob_patch_43],
            [blob_patch_44]
          ]
        }

        
## Update [/blob/patch/{?signature,signature_date,signature_blob_id}]
### Submit a Patch [POST]
Submitting a new patch stores it in the Vault. Patches can never be deleted, only consolidated into a new version of the blob. 

+ Request (application/json)

        {
          blob_id : [blob_id]
          patch: [blob_patch]
        }

+ Response 201 (application/json)

        {
          "result": "success",
          "revision": 14
        }

## Consolidate [/blob/consolidate{?signature,signature_date,signature_blob_id}]
### Consolidate blob [POST]
Over time blobs will accumulate more and more patches, so from time to time, clients should upload a new version of the encrypted blob which consolidates all patches up to a certain revision.

If any new patches are submitted while the client is performing the consolidation, they will receive a revision number that is greater than the revision of the consolidation and will not be removed.

Clients **MUST NOT** make changes that are not part of one of the patches, otherwise those changes may get overwritten by another consolidation being performed by another client at the same time. Applying patches is deterministic, so any two clients performing the same consolidation should arrive at the same result.

+ Request (application/json)

        {
          blob_id: [blob_id],
          data: [encrypted_blob],
          revision: 45
        }

+ Response 201 (application/json)

        {
          result: "success"
        }

# Group Pay API
