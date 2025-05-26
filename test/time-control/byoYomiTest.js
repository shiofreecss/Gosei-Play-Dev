const { expect } = require('chai');
const { handleByoYomiMove, trackMoveTime } = require('../../src/utils/timeControl');

describe('Byo-Yomi Time Control Tests', () => {
  let gameState;
  let player;

  beforeEach(() => {
    gameState = {
      timeControl: {
        byoYomiTime: 30,
        byoYomiPeriods: 5
      }
    };

    player = {
      color: 'black',
      timeRemaining: 0,
      isInByoYomi: true,
      byoYomiPeriodsLeft: 5,
      byoYomiTimeLeft: 30,
      lastMoveTime: Date.now()
    };
  });

  describe('handleByoYomiMove', () => {
    it('should reset period when move is within time', () => {
      const timeSpent = 25;
      handleByoYomiMove(timeSpent, player);
      expect(player.byoYomiTimeLeft).to.equal(30);
      expect(player.byoYomiPeriodsLeft).to.equal(5);
    });

    it('should consume period when move exceeds time', () => {
      const timeSpent = 35;
      handleByoYomiMove(timeSpent, player);
      expect(player.byoYomiPeriodsLeft).to.equal(4);
      expect(player.byoYomiTimeLeft).to.equal(30);
    });

    it('should end game when no periods remain', () => {
      player.byoYomiPeriodsLeft = 1;
      const timeSpent = 35;
      let gameResult = null;
      
      const endGame = (result) => {
        gameResult = result;
      };

      handleByoYomiMove(timeSpent, player, endGame);
      expect(gameResult).to.equal('W+T');
    });
  });

  describe('trackMoveTime', () => {
    it('should transition to byo-yomi when main time expires', () => {
      player.isInByoYomi = false;
      player.timeRemaining = 5;
      const moveStartTime = Date.now() - 10000; // 10 seconds ago

      trackMoveTime(player, moveStartTime);
      expect(player.isInByoYomi).to.be.true;
      expect(player.byoYomiTimeLeft).to.equal(30);
    });

    it('should deduct time from main time when not in byo-yomi', () => {
      player.isInByoYomi = false;
      player.timeRemaining = 60;
      const moveStartTime = Date.now() - 10000; // 10 seconds ago

      trackMoveTime(player, moveStartTime);
      expect(player.timeRemaining).to.be.approximately(50, 1);
    });

    it('should handle byo-yomi moves correctly', () => {
      const moveStartTime = Date.now() - 25000; // 25 seconds ago

      trackMoveTime(player, moveStartTime);
      expect(player.byoYomiTimeLeft).to.equal(30);
      expect(player.byoYomiPeriodsLeft).to.equal(5);
    });
  });
}); 