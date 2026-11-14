#!/usr/bin/env node
import { execSync } from 'child_process';
import https from 'https';

function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch (err) {
    return null;
  }
}

async function checkGitHubPRs() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.github.com',
      path: '/repos/Facussttee/nexo-pedidos/pulls?state=open',
      headers: {
        'User-Agent': 'nexo-pedidos-bot'
      }
    };
    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          resolve({ ok: false, status: res.statusCode, error: data });
          return;
        }
        try {
          const prs = JSON.parse(data);
          resolve({ ok: true, prs });
        } catch (e) {
          resolve({ ok: false, error: e.message });
        }
      });
    }).on('error', (e) => resolve({ ok: false, error: e.message }));
  });
}

async function main() {
  console.log('=== Nexo Pedidos: Auditoría Git & GitHub ===');
  
  // 1. Fetch
  console.log('-> Buscando cambios remotos (git fetch)...');
  run('git fetch origin');

  // 2. Status
  const branch = run('git branch --show-current');
  console.log(`-> Rama actual: ${branch}`);

  // 3. Branches locales vs main
  const branches = run('git for-each-ref --format="%(refname:short)" refs/heads/')
    .split('\n')
    .map(b => b.trim())
    .filter(Boolean);

  console.log(`-> Ramas locales encontradas (${branches.length}): ${branches.join(', ')}`);

  for (const b of branches) {
    if (b === 'main') continue;
    const ahead = run(`git rev-list --count main..${b}`);
    const behind = run(`git rev-list --count ${b}..main`);
    console.log(`   - [${b}]: +${ahead} / -${behind} respecto a main`);
  }

  // 4. Chequeo de Pull Requests
  console.log('-> Consultando PRs abiertas en GitHub...');
  const prRes = await checkGitHubPRs();
  if (prRes.ok) {
    if (prRes.prs.length === 0) {
      console.log('-> 0 Pull Requests abiertas.');
    } else {
      console.log(`-> ${prRes.prs.length} PR(s) abiertas:`);
      prRes.prs.forEach(pr => {
        console.log(`   #${pr.number}: ${pr.title} (${pr.head.ref} -> ${pr.base.ref})`);
      });
    }
  } else {
    console.log(`-> No se pudo conectar a la API de GitHub: ${prRes.error || prRes.status}`);
  }

  console.log('=== Auditoría completada ===');
}

main();
