#!/usr/bin/env node

import { execute, run } from '@oclif/core'

await run(process.argv.slice(2), import.meta.url)
  .catch(async error => {
    const { handle } = await import('@oclif/core')
    await handle(error)
  })
