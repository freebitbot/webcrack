import { statement } from '@babel/template'
import * as t from '@babel/types'
import type { Transform } from '../../ast-utils'

export default {
  name: 'logical-to-if',
  tags: ['safe'],
  visitor: () => {
    const buildIf = statement`if (TEST) { BODY; }`
    const buildIfNot = statement`if (!TEST) { BODY; }`

    return {
      ExpressionStatement: {
        exit(path) {
          const expression = path.node.expression as t.LogicalExpression
          if (!t.isLogicalExpression(expression)) return
          if (expression.operator === '&&') {
            path.replaceWith(
              buildIf({
                BODY: expression.right,
                TEST: expression.left,
              }),
            )
            this.changes++
          } else if (expression.operator === '||') {
            path.replaceWith(
              buildIfNot({
                BODY: expression.right,
                TEST: expression.left,
              }),
            )
            this.changes++
          }
        },
      },
    }
  },
} satisfies Transform
