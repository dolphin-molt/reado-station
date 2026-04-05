#!/usr/bin/env node
/**
 * reado-station skills installer — cross-platform (Mac / Linux / Windows)
 *
 * Usage:
 *   node skills/install.js             # auto-detect + install globally
 *   node skills/install.js --project   # also install project-level rules
 */

const fs = require('fs')
const path = require('path')
const os = require('os')
const { execSync } = require('child_process')

const SCRIPT_DIR = __dirname
const PROJECT_DIR = path.resolve(SCRIPT_DIR, '..')
const HOME = os.homedir()
const IS_WIN = process.platform === 'win32'
const PROJECT_FLAG = process.argv.includes('--project')

let installed = 0

// ─── Helpers ───

function green(msg)  { process.stdout.write(`\x1b[32m  ✓ ${msg}\x1b[0m\n`) }
function yellow(msg) { process.stdout.write(`\x1b[33m  ${msg}\x1b[0m\n`) }
function dim(msg)    { process.stdout.write(`\x1b[2m  ${msg}\x1b[0m\n`) }

function commandExists(cmd) {
  try {
    const which = IS_WIN ? 'where' : 'which'
    execSync(`${which} ${cmd}`, { stdio: 'ignore' })
    return true
  } catch { return false }
}

function dirExists(p) { return fs.existsSync(p) && fs.statSync(p).isDirectory() }

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

function rmSync(p) {
  if (!fs.existsSync(p)) return
  fs.rmSync(p, { recursive: true, force: true })
}

/** List skill directories under skills/ (those containing SKILL.md) */
function listSkills() {
  return fs.readdirSync(SCRIPT_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && fs.existsSync(path.join(SCRIPT_DIR, d.name, 'SKILL.md')))
    .map(d => d.name)
}

/** Strip YAML frontmatter from SKILL.md content */
function stripFrontmatter(content) {
  const lines = content.split('\n')
  if (lines[0] !== '---') return content
  let endIdx = -1
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '---') { endIdx = i; break }
  }
  return endIdx >= 0 ? lines.slice(endIdx + 1).join('\n') : content
}

/** Merge all skills into a single markdown file */
function mergeSkills(outPath) {
  let content = `# reado-station — Agent 运营指南\n\n`
  content += `> 自动生成，勿手动编辑。源文件在 reado-station/skills/ 目录。\n`
  content += `> 入职指南: https://raw.githubusercontent.com/dolphin-molt/reado-station/main/ONBOARD.md\n\n`

  for (const name of listSkills()) {
    const skillMd = fs.readFileSync(path.join(SCRIPT_DIR, name, 'SKILL.md'), 'utf-8')
    content += '\n' + stripFrontmatter(skillMd) + '\n'

    // Append reference files
    const refDir = path.join(SCRIPT_DIR, name, 'reference')
    if (dirExists(refDir)) {
      for (const ref of fs.readdirSync(refDir).filter(f => f.endsWith('.md'))) {
        content += '\n' + fs.readFileSync(path.join(refDir, ref), 'utf-8') + '\n'
      }
    }
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, content, 'utf-8')
}

// ═══════════════════════════════════════════════
console.log('\nreado-station skills installer')
console.log('==============================\n')

// 1. Claude Code
const claudeDir = path.join(HOME, '.claude')
if (commandExists('claude') || dirExists(claudeDir)) {
  const target = path.join(claudeDir, 'skills')
  fs.mkdirSync(target, { recursive: true })
  for (const name of listSkills()) {
    rmSync(path.join(target, name))
    copyDirSync(path.join(SCRIPT_DIR, name), path.join(target, name))
  }
  green(`Claude Code  → ${path.join('~', '.claude', 'skills', '')}`)
  installed++
}

// 2. Openclaw
const openclawDir = path.join(HOME, '.openclaw')
if (commandExists('openclaw') || dirExists(openclawDir)) {
  const target = path.join(openclawDir, 'skills')
  fs.mkdirSync(target, { recursive: true })
  for (const name of listSkills()) {
    rmSync(path.join(target, name))
    copyDirSync(path.join(SCRIPT_DIR, name), path.join(target, name))
  }
  green(`Openclaw     → ${path.join('~', '.openclaw', 'skills', '')}`)
  installed++
}

// Codex CLI
const codexDir = path.join(HOME, '.codex')
if (commandExists('codex') || dirExists(codexDir)) {
  fs.mkdirSync(codexDir, { recursive: true })
  mergeSkills(path.join(codexDir, 'reado-station-rules.md'))
  const agentsMd = path.join(codexDir, 'AGENTS.md')
  const needle = 'reado-station-rules.md'
  if (!fs.existsSync(agentsMd)) {
    fs.writeFileSync(agentsMd, `Read and follow the instructions in ~/.codex/${needle}\n`)
  } else {
    const existing = fs.readFileSync(agentsMd, 'utf-8')
    if (!existing.includes(needle)) {
      fs.appendFileSync(agentsMd, `\nRead and follow the instructions in ~/.codex/${needle}\n`)
    }
  }
  green(`Codex CLI    → ${path.join('~', '.codex', 'reado-station-rules.md')}`)
  installed++
}

// 3. Windsurf
const windsurfDir = path.join(HOME, '.codeium', 'windsurf')
if (commandExists('windsurf') || dirExists(windsurfDir)) {
  const memDir = path.join(windsurfDir, 'memories')
  mergeSkills(path.join(memDir, 'reado-station-rules.md'))
  green(`Windsurf     → ${path.join('~', '.codeium', 'windsurf', 'memories', 'reado-station-rules.md')}`)
  installed++
}

// 4. Aider
if (commandExists('aider')) {
  const aiderDir = path.join(HOME, '.aider')
  fs.mkdirSync(aiderDir, { recursive: true })
  const rulesPath = path.join(aiderDir, 'reado-station-rules.md')
  mergeSkills(rulesPath)
  const confPath = path.join(HOME, '.aider.conf.yml')
  const needle = 'reado-station-rules.md'
  if (fs.existsSync(confPath)) {
    const existing = fs.readFileSync(confPath, 'utf-8')
    if (!existing.includes(needle)) {
      fs.appendFileSync(confPath, `\n# reado-station skills (auto-added)\nread: ${rulesPath}\n`)
    }
  } else {
    fs.writeFileSync(confPath, `# reado-station skills (auto-added)\nread: ${rulesPath}\n`)
  }
  green(`Aider        → ${path.join('~', '.aider', 'reado-station-rules.md')}`)
  installed++
}

// 5. Project-level (--project)
if (PROJECT_FLAG) {
  console.log('\nInstalling project-level rules...')

  // Cursor
  const cursorDir = path.join(PROJECT_DIR, '.cursor', 'rules')
  fs.mkdirSync(cursorDir, { recursive: true })
  mergeSkills(path.join(cursorDir, 'reado-station.md'))
  green('Cursor       → .cursor/rules/reado-station.md')

  // Cline
  const clineDir = path.join(PROJECT_DIR, '.clinerules')
  fs.mkdirSync(clineDir, { recursive: true })
  mergeSkills(path.join(clineDir, 'reado-station.md'))
  green('Cline        → .clinerules/reado-station.md')

  // Copilot
  fs.mkdirSync(path.join(PROJECT_DIR, '.github'), { recursive: true })
  mergeSkills(path.join(PROJECT_DIR, '.github', 'copilot-instructions.md'))
  green('Copilot      → .github/copilot-instructions.md')

  // Windsurf project
  const wsProjDir = path.join(PROJECT_DIR, '.windsurf', 'rules')
  fs.mkdirSync(wsProjDir, { recursive: true })
  mergeSkills(path.join(wsProjDir, 'reado-station.md'))
  green('Windsurf     → .windsurf/rules/reado-station.md')

  // Codex project
  mergeSkills(path.join(PROJECT_DIR, 'AGENTS.md'))
  green('Codex        → AGENTS.md')
}

// Summary
console.log('')
if (installed === 0 && !PROJECT_FLAG) {
  yellow('No AI coding tools detected globally.')
  yellow('Supported: Claude Code, Openclaw, Codex CLI, Windsurf, Aider')
  console.log('')
  dim('Use --project to install project-level rules for Cursor/Cline/Copilot.')
} else {
  green(`Done. ${installed} tool(s) configured.`)
  console.log('')
  dim('Skills will be auto-loaded in new sessions.')
  dim('Source: https://github.com/dolphin-molt/reado-station/tree/main/skills')
  if (!PROJECT_FLAG) dim('Tip: run with --project to also install Cursor/Cline/Copilot project rules.')
}
console.log('')
