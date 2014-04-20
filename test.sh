find ./test -name "test*.js" -exec node_modules/.bin/mocha --ui tdd -R spec '{}' \;
