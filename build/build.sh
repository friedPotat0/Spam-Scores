#!/bin/bash
cd "$(dirname "${BASH_SOURCE[0]}")"
cd ..
filename=spam_scores-$(cat manifest.json | sed -nr 's/.*"version": "(.*)".*/\1/p')-tb.xpi
rm $filename
zip -r $filename ./* -x@./build/exclude.lst