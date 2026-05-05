import type { NodePath } from '@babel/traverse'
import type { CallExpression } from '@babel/types'
import debug from 'debug'
import { generate } from '../ast-utils'
import type { ArrayRotator } from './array-rotator'
import type { Decoder } from './decoder'
import type { StringArray } from './string-array'

export type Sandbox = (code: string) => Promise<unknown>

export function createNodeSandbox(): Sandbox {
  return async (code: string) => {
    const {
      default: { Isolate },
    } = await import('isolated-vm')
    const isolate = new Isolate()
    const context = await isolate.createContext()
    const result = (await context.eval(code, {
      copy: true,
      filename: 'file:///obfuscated.js',
      timeout: 10_000,
    })) as unknown
    context.release()
    isolate.dispose()
    return result
  }
}

export function createBrowserSandbox(): Sandbox {
  return () => {
    // TODO: use sandybox (not available in web workers though)
    throw new Error('Custom Sandbox implementation required.')
  }
}

export class VMDecoder {
  private setupCode: string

  constructor(
    private sandbox: Sandbox,
    stringArray: StringArray,
    public decoders: Decoder[],
    rotator?: ArrayRotator,
  ) {
    // Generate as compact to bypass the self defense
    // (which tests someFunction.toString against a regex)
    const generateOptions = {
      compact: true,
      shouldPrintComment: () => false,
    }
    const stringArrayCode = generate(stringArray.path.node, generateOptions)
    const rotatorCode = rotator ? generate(rotator.node, generateOptions) : ''
    const decoderCode = this.decoders
      .map((decoder) => generate(decoder.path.node, generateOptions))
      .join(';\n')

    this.setupCode = [stringArrayCode, rotatorCode, decoderCode].join(';\n')
  }

  async decode(calls: NodePath<CallExpression>[]): Promise<unknown[]> {
    const code = `(() => {
      ${this.setupCode}
      return [${calls.join(',')}]
    })()`

    try {
      const result = await this.sandbox(code)
      return result as unknown[]
    } catch (error) {
      debug('webcrack:deobfuscate')('vm code:', code)
      if (
        error instanceof Error &&
        (error.message.includes('undefined symbol') ||
          error.message.includes('Segmentation fault'))
      ) {
        throw new Error(
          'isolated-vm version mismatch. Check https://webcrack.netlify.app/docs/guide/common-errors.html#isolated-vm',
          { cause: error },
        )
      }
      throw error
    }
  }
}
