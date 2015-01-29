# find ./test -name "test*.js" -exec node_modules/.bin/mocha --ui tdd -R spec '{}' \;
node_modules/.bin/mocha --ui tdd -R spec test/test-user-create.js &&
node_modules/.bin/mocha --ui tdd -R spec test/test-user-get.js &&
node_modules/.bin/mocha --ui tdd -R spec test/test-user-caseinsensitivity-and-uniqueness.js &&
node_modules/.bin/mocha --ui tdd -R spec test/test-blob-patch.js &&
node_modules/.bin/mocha --ui tdd -R spec test/test-signature.js &&
node_modules/.bin/mocha --ui tdd -R spec test/test-usercap.js &&
node_modules/.bin/mocha --ui tdd -R spec test/test-quota.js &&
node_modules/.bin/mocha --ui tdd -R spec test/test-normalize-reserved.js &&
node_modules/.bin/mocha --ui tdd -R spec test/test-email-change-resend.js &&
node_modules/.bin/mocha --ui tdd -R spec test/test-rename.js &&
node_modules/.bin/mocha --ui tdd -R spec test/test-guard.js &&
node_modules/.bin/mocha --ui tdd -R spec test/test-guard-requests.js &&
node_modules/.bin/mocha --ui tdd -R spec test/test-profile-details.js &&
node_modules/.bin/mocha --ui tdd -R spec test/test-2fa.js &&
node test/test-json.js &&
node test/test-libutils.js
