const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🧪 Testing KataGo Windows Setup...\n');

// Test 1: Check if KataGo executable exists
const katagoPath = path.join(__dirname, 'katago', 'katago.exe');
console.log('1. Checking KataGo executable...');
if (fs.existsSync(katagoPath)) {
    console.log('   ✅ KataGo executable found');
} else {
    console.log('   ❌ KataGo executable not found');
    process.exit(1);
}

// Test 2: Check if neural network model exists
console.log('\n2. Checking neural network models...');
const katagoDir = path.join(__dirname, 'katago');
const modelFiles = fs.readdirSync(katagoDir).filter(file => 
    file.endsWith('.bin.gz') || file.endsWith('.txt.gz') || file.endsWith('.txt'));

if (modelFiles.length === 0) {
    console.log('   ⚠️  No neural network models found');
    console.log('   📋 Please download a model manually:');
    console.log('      1. Visit https://katagotraining.org/');
    console.log('      2. Download a b6c96 model (~8MB)');
    console.log('      3. Save it to server/katago/ directory');
    console.log('      4. Run this test again');
    process.exit(1);
} else {
    console.log(`   ✅ Found ${modelFiles.length} model(s):`);
    modelFiles.forEach(model => {
        const modelPath = path.join(katagoDir, model);
        const stats = fs.statSync(modelPath);
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        console.log(`      - ${model} (${sizeMB} MB)`);
        
        if (stats.size < 1000000) { // Less than 1MB is probably corrupted
            console.log(`        ⚠️  This file seems too small (${sizeMB} MB)`);
            console.log(`        💡 Try downloading it again manually`);
        }
    });
}

// Test 3: Test KataGo version
console.log('\n3. Testing KataGo version...');
const versionProcess = spawn(katagoPath, ['version'], { cwd: katagoDir });

versionProcess.stdout.on('data', (data) => {
    console.log(`   ✅ ${data.toString().trim()}`);
});

versionProcess.stderr.on('data', (data) => {
    console.log(`   ❌ Error: ${data.toString().trim()}`);
});

versionProcess.on('close', (code) => {
    if (code === 0) {
        console.log('   ✅ KataGo version check passed');
        
        // Test 4: Test with model if available
        const validModels = modelFiles.filter(model => {
            const modelPath = path.join(katagoDir, model);
            const stats = fs.statSync(modelPath);
            return stats.size > 1000000; // At least 1MB
        }).sort((a, b) => {
            // Prioritize .txt files over .bin.gz files
            if (a.endsWith('.txt') && !b.endsWith('.txt')) return -1;
            if (!a.endsWith('.txt') && b.endsWith('.txt')) return 1;
            return 0;
        });
        
        if (validModels.length > 0) {
            console.log('\n4. Testing KataGo with neural network...');
            const testModel = validModels[0];
            const configPath = path.join(__dirname, 'engines', 'katago-cpu-config.cfg');
            
            // Check if config exists
            if (!fs.existsSync(configPath)) {
                console.log('   ⚠️  Config file not found, creating basic config...');
                // Create basic config
                const basicConfig = `# Basic KataGo Config for Testing
logAllGTPCommunication = true
numSearchThreads = 1
maxVisits = 10
maxTime = 5.0
rules = tromp-taylor
nnCacheSizePowerOfTwo = 16
`;
                fs.writeFileSync(configPath, basicConfig);
                console.log('   ✅ Created basic config file');
            }
            
            console.log(`   🧪 Testing with model: ${testModel}`);
            const testProcess = spawn(katagoPath, [
                'gtp',
                '-model', testModel,
                '-config', configPath
            ], { cwd: katagoDir });
            
            let testOutput = '';
            testProcess.stdout.on('data', (data) => {
                testOutput += data.toString();
            });
            
            testProcess.stderr.on('data', (data) => {
                console.log(`   ⚠️  Warning: ${data.toString().trim()}`);
            });
            
            // Send a simple GTP command to test
            setTimeout(() => {
                testProcess.stdin.write('version\n');
                setTimeout(() => {
                    testProcess.stdin.write('quit\n');
                }, 1000);
            }, 2000);
            
            testProcess.on('close', (code) => {
                if (testOutput.includes('GTP ready') || testOutput.includes('Model name:') || testOutput.includes('Loaded model') || testOutput.includes('= 1.16.2')) {
                    console.log('   ✅ KataGo GTP test passed');
                    console.log('\n🎉 KataGo setup is working correctly!');
                    console.log('\n📋 Next steps:');
                    console.log('   1. Start your server: node server.js');
                    console.log('   2. Open http://localhost:3000');
                    console.log('   3. Create an AI game and test it');
                    console.log('\n💡 Your model: ' + testModel);
                    console.log('🚀 Performance: Optimized for 9x9 boards with 8 threads');
                } else {
                    console.log('   ❌ KataGo GTP test failed');
                    console.log('   💡 Check the model file and config');
                    console.log('   📝 Output: ' + testOutput.substring(0, 200) + '...');
                }
            });
        } else {
            console.log('\n⚠️  No valid neural network models found');
            console.log('   Please download a proper model file (should be several MB)');
        }
    } else {
        console.log('   ❌ KataGo version check failed');
        console.log('   💡 Check if all DLL files are present');
    }
});

versionProcess.on('error', (error) => {
    console.log(`   ❌ Failed to run KataGo: ${error.message}`);
    console.log('   💡 Make sure KataGo executable is in the right location');
}); 