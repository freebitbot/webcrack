import * as t from '@babel/types'
import { expect } from 'vitest'
import { generate } from '../src/ast-utils'

expect.addSnapshotSerializer({
  serialize: (val: t.Node) => generate(val),
  test: (val: unknown) => t.isNode(val) && !('parentPath' in val),
})
