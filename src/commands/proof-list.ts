import { defineCommand } from 'citty'
import { listAllProofs } from '../core/proof-dispatcher'
import { getGlobalProofsPath, getProjectProofsPath } from '../core/custom-proofs-scanner'
import { existsSync } from 'fs'
import { resolve } from 'path'

export default defineCommand({
  meta: {
    name: 'proof-list',
    description: 'List all available proofs (built-in, project, and global)'
  },
  args: {
    project: {
      alias: 'p',
      type: 'string',
      description: 'Project root directory',
      default: process.cwd()
    },
    format: {
      alias: 'f',
      type: 'string',
      description: 'Output format (text or json)',
      default: 'text',
      validation: (value: string) => {
        if (!['text', 'json'].includes(value)) {
          throw new Error('Format must be "text" or "json"')
        }
      }
    }
  },
  async run({ args }) {
    const projectRoot = resolve(args.project as string)
    const format = args.format as string
    
    try {
      const proofs = listAllProofs(projectRoot)
      
      if (format === 'json') {
        console.log(JSON.stringify(proofs, null, 2))
        return
      }
      
      console.log('\nAvailable Proofs\n')
      console.log('================\n')
      
      const builtInProofs = proofs.filter(p => p.category === 'built-in')
      const projectProofs = proofs.filter(p => p.category === 'project')
      const globalProofs = proofs.filter(p => p.category === 'global')
      
      if (builtInProofs.length > 0) {
        console.log('Built-in Proofs [built-in]:')
        console.log('---------------------------')
        for (const proof of builtInProofs) {
          const layer = proof.layer ? ` (${proof.layer})` : ''
          console.log(`  - ${proof.id}${layer}`)
          if (proof.description) {
            console.log(`    ${proof.description}`)
          }
        }
        console.log()
      }
      
      if (projectProofs.length > 0) {
        console.log('Project-level Custom Proofs [project]:')
        console.log('---------------------------------------')
        const projectProofsPath = getProjectProofsPath(projectRoot)
        console.log(`Path: ${projectProofsPath}\n`)
        for (const proof of projectProofs) {
          console.log(`  - ${proof.id}`)
        }
        console.log()
      }
      
      if (globalProofs.length > 0) {
        console.log('Global Custom Proofs [global]:')
        console.log('------------------------------')
        const globalProofsPath = getGlobalProofsPath()
        console.log(`Path: ${globalProofsPath}\n`)
        for (const proof of globalProofs) {
          console.log(`  - ${proof.id}`)
        }
        console.log()
      }
      
      console.log('Summary:')
      console.log('--------')
      console.log(`Total proofs: ${proofs.length}`)
      console.log(`  Built-in: ${builtInProofs.length}`)
      console.log(`  Project: ${projectProofs.length}`)
      console.log(`  Global: ${globalProofs.length}`)
      console.log()
      
      const projectProofsPath = getProjectProofsPath(projectRoot)
      const globalProofsPath = getGlobalProofsPath()
      
      if (!existsSync(projectProofsPath)) {
        console.log(`Tip: Project proofs directory does not exist: ${projectProofsPath}`)
      }
      
      if (!existsSync(globalProofsPath)) {
        console.log(`Tip: Global proofs directory does not exist: ${globalProofsPath}`)
      }
      
    } catch (error) {
      console.error('Error listing proofs:', error instanceof Error ? error.message : String(error))
      process.exit(1)
    }
  }
})
