import { parse } from '@babel/parser'
import template from '@babel/template'
import traverse, { type Visitor, visitors } from '@babel/traverse'
import * as t from '@babel/types'
import * as m from '@codemod/matchers'

export type Stage =
  | 'afterParse'
  | 'afterPrepare'
  | 'afterDeobfuscate'
  | 'afterUnminify'
  | 'afterUnpack'

export type PluginState = { opts: Record<string, unknown> }

export interface PluginObject {
  name?: string
  post?: (this: PluginState, state: PluginState) => Promise<void> | void
  pre?: (this: PluginState, state: PluginState) => Promise<void> | void
  visitor?: Visitor<PluginState>
}

export interface PluginAPI {
  matchers: typeof m
  parse: typeof parse
  template: typeof template
  traverse: typeof traverse
  types: typeof t
}

export type Plugin = (api: PluginAPI) => PluginObject

export async function runPlugins(
  ast: t.File,
  plugins: Plugin[],
  state: PluginState,
): Promise<void> {
  const pluginObjects = plugins.map((plugin) =>
    plugin({
      matchers: m,
      parse,
      template,
      traverse,
      types: t,
    }),
  )

  for (const plugin of pluginObjects) {
    await plugin.pre?.call(state, state)
  }

  const pluginVisitors = pluginObjects.flatMap((plugin) => plugin.visitor ?? [])
  if (pluginVisitors.length > 0) {
    const mergedVisitor = visitors.merge(pluginVisitors)
    traverse(ast, mergedVisitor, undefined, state)
  }

  for (const plugin of pluginObjects) {
    await plugin.post?.call(state, state)
  }
}
