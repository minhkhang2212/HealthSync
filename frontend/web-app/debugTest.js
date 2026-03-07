import { execSync } from 'child_process';
import fs from 'fs';

try {
    execSync('npx vitest run src/pages/__tests__/AdminDashboard.test.jsx --reporter=json > out.json', { stdio: 'pipe' });
    console.log('Passed');
} catch {
    const data = JSON.parse(fs.readFileSync('out.json', 'utf8'));
    const failures = data.testResults.flatMap(r => r.assertionResults).filter(a => a.status === 'failed');
    failures.forEach(f => {
        console.log('FAILED TEST:', f.title);
        console.log(f.failureMessages.join('\n'));
    });
}
