const { expect } = require('chai');
const { validateBlitzSettings, updateBlitzTimeControls } = require('../../src/utils/gameType');

describe('Game Type Tests', () => {
  describe('Blitz Game Settings', () => {
    let settings;

    beforeEach(() => {
      settings = {
        gameType: 'blitz',
        timePerMove: 5,
        mainTime: 0,
        byoYomiEnabled: false,
        byoYomiPeriods: 0,
        byoYomiTime: 0
      };
    });

    describe('validateBlitzSettings', () => {
      it('should validate correct blitz settings', () => {
        const result = validateBlitzSettings(settings);
        expect(result.valid).to.be.true;
      });

      it('should reject byo-yomi in blitz games', () => {
        settings.byoYomiPeriods = 3;
        const result = validateBlitzSettings(settings);
        expect(result.valid).to.be.false;
        expect(result.error).to.equal('Byo-yomi is not allowed in Blitz games');
      });

      it('should reject too low time per move', () => {
        settings.timePerMove = 3;
        const result = validateBlitzSettings(settings);
        expect(result.valid).to.be.false;
        expect(result.error).to.equal('Blitz games require at least 5 seconds per move');
      });
    });

    describe('updateBlitzTimeControls', () => {
      it('should properly configure blitz settings', () => {
        settings.byoYomiEnabled = true;
        settings.byoYomiPeriods = 3;
        settings.byoYomiTime = 30;
        settings.mainTime = 300;
        
        updateBlitzTimeControls(settings);
        
        expect(settings.byoYomiEnabled).to.be.false;
        expect(settings.byoYomiPeriods).to.equal(0);
        expect(settings.byoYomiTime).to.equal(0);
        expect(settings.mainTime).to.equal(0);
      });

      it('should adjust time per move if too low', () => {
        settings.timePerMove = 3;
        updateBlitzTimeControls(settings);
        expect(settings.timePerMove).to.equal(5);
      });

      it('should not modify non-blitz games', () => {
        const standardSettings = {
          gameType: 'even',
          timePerMove: 0,
          mainTime: 1800,
          byoYomiEnabled: true,
          byoYomiPeriods: 5,
          byoYomiTime: 30
        };
        
        const originalSettings = { ...standardSettings };
        updateBlitzTimeControls(standardSettings);
        
        expect(standardSettings).to.deep.equal(originalSettings);
      });
    });
  });

  describe('Game Type Integration', () => {
    it('should handle game type transitions correctly', () => {
      const settings = {
        gameType: 'even',
        timePerMove: 0,
        mainTime: 1800,
        byoYomiEnabled: true,
        byoYomiPeriods: 5,
        byoYomiTime: 30
      };

      // Transition to blitz
      settings.gameType = 'blitz';
      settings.timePerMove = 5;
      updateBlitzTimeControls(settings);
      
      expect(settings.mainTime).to.equal(0);
      expect(settings.byoYomiEnabled).to.be.false;
      expect(settings.byoYomiPeriods).to.equal(0);
      expect(settings.byoYomiTime).to.equal(0);

      // Transition back to even
      settings.gameType = 'even';
      settings.timePerMove = 0;
      settings.mainTime = 1800;
      settings.byoYomiEnabled = true;
      settings.byoYomiPeriods = 5;
      settings.byoYomiTime = 30;
      
      const result = validateBlitzSettings(settings);
      expect(result.valid).to.be.true;
    });
  });
}); 