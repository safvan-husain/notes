import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function gitAmendAndPush() {
  try {
    // Add all changes
    await execAsync('git add .');

    // Amend the commit
    await execAsync('git commit --amend --no-edit');

    // Force push to the repository
    await execAsync('git push --force');

    console.log('Successfully amended and force pushed changes.');
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}
