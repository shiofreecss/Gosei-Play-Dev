const { expect } = require('chai');
const { validateTimePerMove, detectGameTypeFromTime, updateTimeControls } = require('../../src/utils/timeControl');

describe('Time per Move Tests', () => {
  describe('validateTimePerMove', () => {
    it('should validate blitz game settings correctly', () => {
      const validSettings = {
        gameType: 'blitz',
        timePerMove: 5
      };
      expect(validateTimePerMove(validSettings).valid).to.be.true;

      const invalidSettings = {
        gameType: 'blitz',
        timePerMove: 3
      };
      expect(validateTimePerMove(invalidSettings).valid).to.be.false;
    });

    it('should validate standard game settings correctly', () => {
      const validSettings = {
        gameType: 'even',
        timePerMove: 0
      };
      expect(validateTimePerMove(validSettings).valid).to.be.true;

      const invalidSettings = {
        gameType: 'even',
        timePerMove: 5
      };
      expect(validateTimePerMove(invalidSettings).valid).to.be.false;
    });
  });

  describe('detectGameTypeFromTime', () => {
    it('should detect blitz games correctly', () => {
      expect(detectGameTypeFromTime(5)).to.equal('blitz');
      expect(detectGameTypeFromTime(10)).to.equal('blitz');
    });

    it('should detect even games correctly', () => {
      expect(detectGameTypeFromTime(0)).to.equal('even');
    });
  });

  describe('updateTimeControls', () => {
    let settings;

    beforeEach(() => {
      settings = {
        gameType: '',
        timePerMove: 0,
        mainTime: 0,
        byoYomiEnabled: false,
        byoYomiPeriods: 0,
        boardSize: 19
      };
    });

    it('should configure blitz game settings correctly', () => {
      settings.timePerMove = 5;
      updateTimeControls(settings);
      
      expect(settings.mainTime).to.equal(0);
      expect(settings.byoYomiEnabled).to.be.false;
      expect(settings.byoYomiPeriods).to.equal(0);
    });

    it('should configure standard game settings correctly', () => {
      settings.timePerMove = 0;
      updateTimeControls(settings);
      
      expect(settings.mainTime).to.be.above(0);
      expect(settings.byoYomiEnabled).to.be.true;
    });

    it('should adjust time per move for blitz games if too low', () => {
      settings.timePerMove = 3;
      updateTimeControls(settings);
      
      expect(settings.timePerMove).to.equal(5);
    });
  });
}); 