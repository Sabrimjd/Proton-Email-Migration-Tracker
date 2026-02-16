#!/usr/bin/env ts-node
import { runEmailAnalysis } from '../src/lib/email-analyzer';

async function main() {
  console.log('='.repeat(80));
  console.log('Email Migration Tracker - Manual Analysis');
  console.log('='.repeat(80));
  console.log('');

  try {
    const result = await runEmailAnalysis();

    console.log('');
    console.log('='.repeat(80));
    console.log('Analysis Summary:');
    console.log('='.repeat(80));
    console.log(`Emails scanned: ${result.emailsScanned}`);
    console.log(`Services found: ${result.servicesFound}`);
    console.log(`Services migrated: ${result.servicesMigrated}`);
    
    if (result.errors.length > 0) {
      console.log(`\nErrors encountered: ${result.errors.length}`);
      result.errors.forEach((err, i) => {
        console.log(`  ${i + 1}. ${err}`);
      });
    }
    
    console.log('='.repeat(80));
    console.log('\n✅ Analysis complete! Start the dashboard with: npm run dev\n');
  } catch (error) {
    console.error('\n❌ Analysis failed:', error);
    process.exit(1);
  }
}

main();
