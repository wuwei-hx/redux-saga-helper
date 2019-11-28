#!/bin/bash

rm -r ./lib

npm run build

cp -rf package.json lib
cp -rf LICENSE lib

cd lib
npm publish