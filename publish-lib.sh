#!/bin/bash

rm -r ./lib

npm run build

cp -rf package.json lib

cd lib
npm publish