const { execSync } = require('child_process');
const path = require('path');

console.log('🧪 Running Portfolio Management Tests');
console.log('====================================\n');

const testTypes = process.argv[2];

try {
    switch (testTypes) {
        case 'unit':
            console.log('Running unit tests...');
            execSync('npm run test:unit', { stdio: 'inherit' });
            break;
            
        case 'integration':
            console.log('Running integration tests...');
            execSync('npm run test:integration', { stdio: 'inherit' });
            break;
            
        case 'coverage':
            console.log('Running tests with coverage...');
            execSync('npm run test:coverage', { stdio: 'inherit' });
            break;
            
        case 'watch':
            console.log('Running tests in watch mode...');
            execSync('npm run test:watch', { stdio: 'inherit' });
            break;
            
        default:
            console.log('Running all tests...');
            execSync('npm test', { stdio: 'inherit' });
            break;
    }
    
    console.log('\n✅ Tests completed successfully!');
    
} catch (error) {
    console.error('\n❌ Tests failed:', error.message);
    process.exit(1);
}
