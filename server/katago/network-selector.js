#!/usr/bin/env node

/**
 * KataGo Network Selector
 * Helps select appropriate network based on player level
 * 
 * Categories:
 * - Beginner: 1000-1500 Elo
 * - Normal: 1500-1900 Elo  
 * - Dan: 1941-2400 Elo
 * - Pro: 2545-3050 Elo
 */

const fs = require('fs');
const path = require('path');

class NetworkSelector {
    constructor() {
        this.networks = {
            beginner: [
                { file: 'kata1-b6c96-s1995008-d1329786.txt', elo: 1071.5, level: 'Beginner', rank: '8k-7k' }
            ],
            normal: [
                { file: 'kata1-b6c96-s4136960-d1510003.txt', elo: 1539.5, level: 'Weak Normal', rank: '6k-5k' },
                { file: 'kata1-b6c96-s5214720-d1690538.txt', elo: 1611.3, level: 'Mid Normal', rank: '5k-4k' },
                { file: 'kata1-b6c96-s6127360-d1754797.txt', elo: 1711.0, level: 'Strong Normal', rank: '4k-3k' },
                { file: 'kata1-b6c96-s8080640-d1961030.txt', elo: 1862.5, level: 'Very Strong Normal', rank: '2k-1k' }
            ],
            dan: [
                { file: 'kata1-b6c96-s8982784-d2082583.txt', elo: 1941.4, level: 'Low Dan', rank: '1d' },
                { file: 'kata1-b6c96-s10014464-d2201128.txt', elo: 2113.0, level: 'Mid Dan', rank: '2d' },
                { file: 'kata1-b6c96-s10825472-d2300510.txt', elo: 2293.5, level: 'Strong Dan', rank: '3d' },
                { file: 'kata1-b6c96-s11888896-d2416753.txt', elo: 2398.4, level: 'Very Strong Dan', rank: '4d' }
            ],
            pro: [
                { file: 'kata1-b6c96-s12849664-d2510774.txt', elo: 2545.2, level: 'Low Pro', rank: '5d' },
                { file: 'kata1-b6c96-s13733120-d2631546.txt', elo: 2849.0, level: 'Mid Pro', rank: '6d+' },
                { file: 'kata1-b6c96-s175395328-d26788732.txt', elo: 3050.2, level: 'Top Pro', rank: 'Professional' }
            ]
        };
        
        this.networkDir = path.join(__dirname, 'networks');
        
        // Elo ranges for each category
        this.eloRanges = {
            beginner: { min: 1000, max: 1500 },
            normal: { min: 1500, max: 1900 },
            dan: { min: 1941, max: 2400 },
            pro: { min: 2545, max: 3050 }
        };
    }

    /**
     * Get network by Elo rating
     */
    getNetworkByElo(targetElo) {
        let bestNetwork = null;
        let bestCategory = null;
        let minDifference = Infinity;

        for (const [category, networks] of Object.entries(this.networks)) {
            for (const network of networks) {
                const difference = Math.abs(network.elo - targetElo);
                if (difference < minDifference) {
                    minDifference = difference;
                    bestNetwork = network;
                    bestCategory = category;
                }
            }
        }

        return { network: bestNetwork, category: bestCategory };
    }

    /**
     * Get network by rank approximation
     */
    getNetworkByRank(rank) {
        const rankLower = rank.toLowerCase();
        
        // Parse rank (e.g., '5k', '2d')
        const match = rankLower.match(/(\d+)([kd])/);
        if (!match) {
            console.log('Invalid rank format. Use format like: 5k, 2d, etc.');
            return null;
        }
        
        const [, number, type] = match;
        const num = parseInt(number);
        
        if (type === 'k') {
            // Kyu players - map to Elo ranges
            if (num >= 8) return this.networks.beginner[0];  // 8k-7k: ~1071 Elo
            if (num >= 6) return this.networks.normal[0];    // 6k-5k: ~1539 Elo
            if (num >= 5) return this.networks.normal[1];    // 5k-4k: ~1611 Elo
            if (num >= 4) return this.networks.normal[2];    // 4k-3k: ~1711 Elo
            if (num >= 1) return this.networks.normal[3];    // 2k-1k: ~1862 Elo
        } else if (type === 'd') {
            // Dan players
            if (num === 1) return this.networks.dan[0];      // 1d: ~1941 Elo
            if (num === 2) return this.networks.dan[1];      // 2d: ~2113 Elo
            if (num === 3) return this.networks.dan[2];      // 3d: ~2293 Elo
            if (num === 4) return this.networks.dan[3];      // 4d: ~2398 Elo
            if (num === 5) return this.networks.pro[0];      // 5d: ~2545 Elo
            if (num >= 6) return this.networks.pro[1];       // 6d+: ~2849 Elo
        }
        
        return null;
    }

    /**
     * Get networks by category
     */
    getNetworksByCategory(category) {
        return this.networks[category] || [];
    }

    /**
     * Get category by Elo range
     */
    getCategoryByElo(elo) {
        for (const [category, range] of Object.entries(this.eloRanges)) {
            if (elo >= range.min && elo <= range.max) {
                return category;
            }
        }
        return null;
    }

    /**
     * List all networks
     */
    listAllNetworks() {
        console.log('\n=== Available KataGo Networks by Elo Range ===\n');
        
        Object.entries(this.networks).forEach(([category, networks]) => {
            const range = this.eloRanges[category];
            console.log(`📁 ${category.toUpperCase()} (${range.min}-${range.max} Elo):`);
            networks.forEach((network, index) => {
                const exists = this.checkNetworkExists(category, network.file);
                const status = exists ? '✅' : '❌';
                console.log(`  ${index + 1}. ${status} ${network.level} (${network.rank}) - ${network.elo} Elo`);
                console.log(`     File: ${network.file}`);
            });
            console.log('');
        });
    }

    /**
     * Check if network file exists
     */
    checkNetworkExists(category, filename) {
        const filePath = path.join(this.networkDir, category, filename);
        return fs.existsSync(filePath);
    }

    /**
     * Get network path
     */
    getNetworkPath(category, filename) {
        return path.join(this.networkDir, category, filename);
    }

    /**
     * Recommend network for player
     */
    recommend(playerRank) {
        const network = this.getNetworkByRank(playerRank);
        if (!network) {
            console.log(`❌ Could not find network for rank: ${playerRank}`);
            return null;
        }

        const category = this.findNetworkCategory(network);
        const exists = this.checkNetworkExists(category, network.file);
        const path = this.getNetworkPath(category, network.file);

        console.log(`\n🎯 Recommended network for ${playerRank} player:`);
        console.log(`   Level: ${network.level} (${network.rank})`);
        console.log(`   Elo: ${network.elo}`);
        console.log(`   Category: ${category} (${this.eloRanges[category].min}-${this.eloRanges[category].max} Elo)`);
        console.log(`   File: ${network.file}`);
        console.log(`   Path: ${path}`);
        console.log(`   Status: ${exists ? '✅ Available' : '❌ Not downloaded'}`);

        if (!exists) {
            console.log(`\n💡 Network not found. Check the networks directory or re-extract if needed.`);
        }

        return { network, category, path, exists };
    }

    /**
     * Find which category a network belongs to
     */
    findNetworkCategory(targetNetwork) {
        for (const [category, networks] of Object.entries(this.networks)) {
            if (networks.find(n => n.file === targetNetwork.file)) {
                return category;
            }
        }
        return null;
    }
}

// CLI Usage
if (require.main === module) {
    const selector = new NetworkSelector();
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log('🔧 KataGo Network Selector');
        console.log('\nUsage:');
        console.log('  node network-selector.js <rank>     # Get recommendation for rank (e.g., 5k, 2d)');
        console.log('  node network-selector.js list       # List all available networks');
        console.log('  node network-selector.js elo <elo>  # Get recommendation by Elo rating');
        console.log('\nExamples:');
        console.log('  node network-selector.js 5k');
        console.log('  node network-selector.js 2d');
        console.log('  node network-selector.js elo 1800');
        console.log('  node network-selector.js list');
        process.exit(1);
    }

    const command = args[0].toLowerCase();

    if (command === 'list') {
        selector.listAllNetworks();
    } else if (command === 'elo' && args[1]) {
        const targetElo = parseInt(args[1]);
        const result = selector.getNetworkByElo(targetElo);
        if (result.network) {
            console.log(`\n🎯 Best network for ${targetElo} Elo:`);
            console.log(`   Network: ${result.network.level} (${result.network.rank})`);
            console.log(`   Elo: ${result.network.elo}`);
            console.log(`   Category: ${result.category}`);
            console.log(`   File: ${result.network.file}`);
        } else {
            console.log(`❌ No network found for Elo: ${targetElo}`);
        }
    } else {
        selector.recommend(command);
    }
}

module.exports = NetworkSelector; 