#!/bin/sh
npm i
npm i forever -g
NODES='178.62.238.175' forever start index.js
