install:
	npm install

lint:
	npx eslint .

run test: 
	npm test

test-coverage:
	npm test -- --coverage --coverageProvider=v8

publish:
	npm publish --dry-run