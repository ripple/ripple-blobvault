Format: 1A

# Blobvault v1
Welcome to the Blobvault v1 API. This API provides access to
the Ripple Blobvaut.

# Blobvault Links
+ [This: Raw API Blueprint](https://raw.githubusercontent.com/rook2pawn/ripple-blobvault/master/docs/v1-apiary-api-reference.md)
+ [Blobvault GitHub Repository](https://github.com/ripple/ripple-blobvault)

There are two types of signing, HMAC and ECDSA and will be presented first

# Group ECDSA Signing

example:'https://id.staging.ripple.com/v1/user?signature=AAAAHC2k5dWAnmC7zXr2N0ZEDbiF0kNQxHgf1xS-bixub5pmQFo-SMcDe0U-n6jkGaFrKfOn7NAlraTogHISkdzyUDY&signature_date=2014-05-19T17:21:34.000Z&signature_blob_id=92da7f762e240b40c23c1f15c55cee6f488c8cc8adfea079d5e738b5b152ab2b&signature_account=rfaPezp7ShpR2c89J3pZehnXHmSKd85MCY&signature_type=RIPPLE1-ECDSA-SHA512'

In this example we just use GET but it applies to any HTTP Method (GET, POST) that is marked as using ECDSA

## GET /your/path{?signature_account,signature_type,signature,signature_date,signature_blob_id}

+ Parameters

    + signature_account   (required, string,`rwUNHL9AdSupre4tGb7NXZpRS1ift5sR7W`) ... the Ripple address
    + signature (required, string, `AAAAHC2k5dWAnmC7zXr2N0ZEDbiF0kNQxHgf1xS-bixub5pmQFo-SMcDe0U-n6jkGaFrKfOn7NAlraTogHISkdzyUDY`) ... the computed signature
    + signature_date (required, string, `2014-05-19T17:21:34.000Z`) ... the date string
    + signature_blob_id (required, string,`003bb8cfbe753657d312de52bb9863ace009e649712157d6a71fdb14a6ff249c`) ... the hexadecimal id
    + signature_type (required, string, `RIPPLE1-ECDSA-SHA512`) ... for ECDSA use this exact string
    
+ Response 200

# Group HMAC Signing

In this example we use GET but it can apply to any HTTP Method for any route marked using HMAC

## GET /your/path{?signature,signature_blob_id,signature_date}


+ Parameters

    + signature (required, string) ... the HMAC signature
    + signature_blob_id (required, string) ... the blob id
    + signature_date (required, string) ... the date string
    
+ Response 200


# Group Creating a user - uses ECDSA

## POST /v1/user

+ Request (application/json)

        {
            "address": "",
            "encrypted_blobdecrypt_key": "",
            "blob_id" : "",
            "username" : "",
            "auth_secret": "",
            "data" : "",
            "email" : "",
            "hostlink" : "",
            "encrypted_secret" : ""
        }
+ Response 201 (application/json)

         {
         "result" : "success"
         }
         
+ Response 400 (application/json)

        { 
        "result" : "error",
        "message" : ""
        }

# Group Deleting a user - uses HMAC

example: DELETE /v1/user/foo will delete user foo

## DELETE /v1/user/{username}

+ Parameters 

    + username (required, string) ... the username to delete

+ Response 200 (application/json)

        {
        result: "success"
        }

+ Response 400 (application/json)

        { 
        "result" : "error",
        }
        

# Group Looking up a user - by username

## GET /v1/user/{username}

+ Parameters

    + username (required, string) ... the username to lookup

    
+ Response 200 (application/json)

        {
        username : "<username>",
        version : 3,
        address : "<ripple address>",
        exists : true (or false),
        "version":3,
        "blobvault":"http://<blobvault url>",
        "pakdf":
            {
             "host":"auth1.ripple.com",
             "url":"https://auth1.ripple.com/api/sign",
            "exponent":"010001",
            "alpha":"7283d19e784f48a96062271a4fa6e2c3addf14e6edf78a4bb61364856d580f13552008d7b9e3b60ebd9555e9f6c7778ec69f976757d206134e54d61ba9d588a7e37a77cf48060522478352d76db000366ef669a1b1ca93c5e3e05bc344afa1e8ccb15d3343da94180dccf590c2c32408c3f3f176c8885e95d988f1565ee9b80c12f72503ab49917792f907bbb9037487b0afed967fefc9ab090164597fcd391c43fab33029b38e66ff4af96cbf6d90a01b891f856ddd3d94e9c9b307fe01e1353a8c30edd5a94a0ebba5fe7161569000ad3b0d3568872d52b6fbdfce987a687e4b346ea702e8986b03b6b1b85536c813e46052a31ed64ec490d3ba38029544aa",
            "modulus":"c7f1bc1dfb1be82d244aef01228c1409c198894eca9e21430f1669b4aa3864c9f37f3d51b2b4ba1ab9e80f59d267fda1521e88b05117993175e004543c6e3611242f24432ce8efa3b81f0ff660b4f91c5d52f2511a6f38181a7bf9abeef72db056508bbb4eeb5f65f161dd2d5b439655d2ae7081fcc62fdcb281520911d96700c85cdaf12e7d1f15b55ade867240722425198d4ce39019550c4c8a921fc231d3e94297688c2d77cd68ee8fdeda38b7f9a274701fef23b4eaa6c1a9c15b2d77f37634930386fc20ec291be95aed9956801e1c76601b09c413ad915ff03bfdc0b6b233686ae59e8caf11750b509ab4e57ee09202239baee3d6e392d1640185e1cd"
            }
        }
        

# Group Looking up a user - by address

## GET /v1/user/{address}

+ Parameters

    + address (required, string) ... the address of user to lookup

+ Response 200 (application/json)

        {
        username : "<username>",
        version : 3,
        address : "<ripple address>",
        exists : true,
        "version":3,
        "blobvault":"http://<blobvault url>",
        "pakdf":
            {
             "host":"auth1.ripple.com",
             "url":"https://auth1.ripple.com/api/sign",
            "exponent":"010001",
            "alpha":"7283d19e784f48a96062271a4fa6e2c3addf14e6edf78a4bb61364856d580f13552008d7b9e3b60ebd9555e9f6c7778ec69f976757d206134e54d61ba9d588a7e37a77cf48060522478352d76db000366ef669a1b1ca93c5e3e05bc344afa1e8ccb15d3343da94180dccf590c2c32408c3f3f176c8885e95d988f1565ee9b80c12f72503ab49917792f907bbb9037487b0afed967fefc9ab090164597fcd391c43fab33029b38e66ff4af96cbf6d90a01b891f856ddd3d94e9c9b307fe01e1353a8c30edd5a94a0ebba5fe7161569000ad3b0d3568872d52b6fbdfce987a687e4b346ea702e8986b03b6b1b85536c813e46052a31ed64ec490d3ba38029544aa",
            "modulus":"c7f1bc1dfb1be82d244aef01228c1409c198894eca9e21430f1669b4aa3864c9f37f3d51b2b4ba1ab9e80f59d267fda1521e88b05117993175e004543c6e3611242f24432ce8efa3b81f0ff660b4f91c5d52f2511a6f38181a7bf9abeef72db056508bbb4eeb5f65f161dd2d5b439655d2ae7081fcc62fdcb281520911d96700c85cdaf12e7d1f15b55ade867240722425198d4ce39019550c4c8a921fc231d3e94297688c2d77cd68ee8fdeda38b7f9a274701fef23b4eaa6c1a9c15b2d77f37634930386fc20ec291be95aed9956801e1c76601b09c413ad915ff03bfdc0b6b233686ae59e8caf11750b509ab4e57ee09202239baee3d6e392d1640185e1cd"
            }
        }



# Group Looking up a user via querstring

Example: /v1/authinfo?username=foo

## GET /v1/authinfo{?username}

+ Response 200 (application/json)

        {
        username : "<username>",
        version : 3,
        address : "<ripple address>",
        exists : true,
        "version":3,
        "blobvault":"http://<blobvault url>",
        "pakdf":
            {
             "host":"auth1.ripple.com",
             "url":"https://auth1.ripple.com/api/sign",
            "exponent":"010001",
            "alpha":"7283d19e784f48a96062271a4fa6e2c3addf14e6edf78a4bb61364856d580f13552008d7b9e3b60ebd9555e9f6c7778ec69f976757d206134e54d61ba9d588a7e37a77cf48060522478352d76db000366ef669a1b1ca93c5e3e05bc344afa1e8ccb15d3343da94180dccf590c2c32408c3f3f176c8885e95d988f1565ee9b80c12f72503ab49917792f907bbb9037487b0afed967fefc9ab090164597fcd391c43fab33029b38e66ff4af96cbf6d90a01b891f856ddd3d94e9c9b307fe01e1353a8c30edd5a94a0ebba5fe7161569000ad3b0d3568872d52b6fbdfce987a687e4b346ea702e8986b03b6b1b85536c813e46052a31ed64ec490d3ba38029544aa",
            "modulus":"c7f1bc1dfb1be82d244aef01228c1409c198894eca9e21430f1669b4aa3864c9f37f3d51b2b4ba1ab9e80f59d267fda1521e88b05117993175e004543c6e3611242f24432ce8efa3b81f0ff660b4f91c5d52f2511a6f38181a7bf9abeef72db056508bbb4eeb5f65f161dd2d5b439655d2ae7081fcc62fdcb281520911d96700c85cdaf12e7d1f15b55ade867240722425198d4ce39019550c4c8a921fc231d3e94297688c2d77cd68ee8fdeda38b7f9a274701fef23b4eaa6c1a9c15b2d77f37634930386fc20ec291be95aed9956801e1c76601b09c413ad915ff03bfdc0b6b233686ae59e8caf11750b509ab4e57ee09202239baee3d6e392d1640185e1cd"
            }
        }
        
# Group Renaming a user - uses ECDSA

## POST /v1/user/rename

+ Request (application/json)

        {
            blob_id: "<blob id>",
            new_username: "<new username>",
            new_blob_id: "<new blob id>"
        }

+ Response 200 (application/json)

        {   
            result : 'success'
        }


+ Response 400 (application/json)
    
        { 
            result : "error" 
        }

# Group Changing email address - uses ECDSA

## POST /v1/user/email

+ Request (application/json)

        {
            email : "<email address>",
            blob_id : "<blob id>",
            username : "<username>",
            hostlink : "<hostlink>"
        }

+ Response 200 (application/json)

        {
            result : "success"
        }

+ Response 400 (application/json)
    
        { 
            result : "error" 
        }

# Group Resending Email - uses ECDSA

## POST /v1/user/email/resend

+ Request (application/json)

        {
            email : "<email address>",
            username : "<username>",
            hostlink : "<hostlink>"
        }

+ Response 200 (application/json)

        {
            result : "success"
        }

+ Response 400 (application/json)
    
        { 
            result : "error" 
        }

# Group Verifying Email Token

## GET /v1/user/{username}/verify/{token}

+ Parameters

    + username ... string
    + token ... string
    
+ Response 200 (application/json)

        { 
            "result" : "success"
        }
        
# Group Retrieve a blob

## GET /v1/blob/{blob_id}

+ Parameters

    + blob_id (required,string) ... the blob id

+ Response 200 (application/json)

        {   
            result: 'success',
            encrypted_secret : '<base 64 encrypted secret>',
            blob : '<base 64 blob data>',
            revision : '<revision number>',
            email: '<email address>',
            quota: '<disk usage>',
            patches: '<array of patches>'
        }

+ Response 400 (application/json)
    
        { 
            result : "error" 
        }



# Group Add a blob patch - uses HMAC

## POST /v1/blob/patch

+ Request (application/json)

        {
          blob_id : "<blob id>"
          patch: "<blob patch>"
        }

+ Response 201 (application/json)

        {
          result: "success",
          revision: "<revision number>"
        }
        
+ Response 400 (application/json)
    
        { 
            result : "error" 
        }
        

# Group Get a blob Patch

## GET /v1/blob/{blob_id}/patch/{patch_id}


+ Parameters

    + blob_id ... string
    + patch_id ... string
    
+ Response 200 (application/json)

        { 
            result : "success",
            patch : "<patch>"
        }
        
+ Response 400 (application/json)
    
        { 
            result : "error" 
        }


# Group Consolidate a set of blob patches - uses HMAC

## POST /v1/blob/consolidate

+ Response 200 (application/json)

        { 
            "result" : "success"
        }
        
+ Response 400 (application/json)
    
        { 
            result : "error" 
        }


# Group Checking if a user is locked

## GET /v1/locked{?address}

+ Response 403 (application/json)

        { 
            "result" : "locked"
            "reason" : ""
        }
        
+ Response 200 (application/json)

        { 
            "result" : "not locked"
        }
