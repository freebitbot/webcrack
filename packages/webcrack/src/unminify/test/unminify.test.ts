import { test } from 'vitest'
import { testTransform } from '../../../test'
import unminify from '..'

const expectJS = testTransform(unminify)

test('mixed typeof-undefined and yoda', () =>
  expectJS(`
    typeof x < "u";
    "u" > typeof x;
    typeof x > "u";
    "u" < typeof x;
  `).toMatchInlineSnapshot(`
    typeof x !== "undefined";
    typeof x !== "undefined";
    typeof x === "undefined";
    typeof x === "undefined";
  `))
