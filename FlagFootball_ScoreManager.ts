import { Component, PropTypes, Entity, TextGizmo, Vec3, World, Player } from 'horizon/core';

/**
 * FlagFootball_ScoreManager - Simplified Version
 * Purpose: Basic game state and scoring
 */
class FlagFootball_ScoreManager extends Component {
  static propsDefinition = {
    scoreboardText: { type: PropTypes.Entity }, 
    downMarkerText: { type: PropTypes.Entity },
    gameDurationMinutes: { type: PropTypes.Number, default: 20 },
    yardsForFirstDown: { type: PropTypes.Number, default: 20 },
    touchdownPoints: { type: PropTypes.Number, default: 6 },
    manualSpotting: { type: PropTypes.Boolean, default: false },
    debug: { type: PropTypes.Boolean, default: true }
  };

  private isGameActive: boolean = false;
  private timeRemaining: number = 0;
  private currentQuarter: number = 1;
  private scoreA: number = 0;
  private scoreB: number = 0;
  private currentDown: number = 1;
  private possession: 'TeamA' | 'TeamB' = 'TeamA';
  private ballPosition: Vec3 = Vec3.zero;
  private lineOfScrimmage: Vec3 = Vec3.zero;
  private lineToGain: Vec3 = Vec3.zero;
  private waitingForSpot: boolean = false;

  start() {
    this.timeRemaining = this.props.gameDurationMinutes * 60;
    
    try {
      this.connectLocalBroadcastEvent(World.onUpdate, (data) => {
        this.onUpdate(data.deltaTime);
      });
      this.updateUI();
      console.log("Score Manager Initialized.");
    } catch (error) {
      console.error("ScoreManager: Error in start:", error);
    }
  }

  private onUpdate(deltaTime: number) {
    if (this.isGameActive && this.timeRemaining > 0) {
      this.timeRemaining -= deltaTime;
      
      if (this.timeRemaining <= 0) {
        this.endGame();
      }

      if (Math.floor(this.timeRemaining) % 60 === 0) {
        this.updateUI();
      }
    }
  }

  public startGame() {
    try {
      this.isGameActive = true;
      this.scoreA = 0;
      this.scoreB = 0;
      this.currentQuarter = 1;
      this.timeRemaining = this.props.gameDurationMinutes * 60;
      this.resetDowns('TeamA'); 
      console.log("Game Started");
      this.updateUI();
    } catch (error) {
      console.error("ScoreManager: Error starting game:", error);
    }
  }

  public stopGame() {
    this.isGameActive = false;
    this.updateUI();
  }

  public addScore(team: 'TeamA' | 'TeamB', points: number) {
    try {
      if (team === 'TeamA') {
        this.scoreA += points;
      } else {
        this.scoreB += points;
      }
      this.updateUI();
      console.log(`${team} scored ${points} points!`);
    } catch (error) {
      console.error("ScoreManager: Error adding score:", error);
    }
  }

  public onPlayEnded(pullPosition: Vec3) {
    try {
      console.log(`Play ended at: ${pullPosition}`);

      if (this.props.manualSpotting) {
        this.waitingForSpot = true;
      } else {
        this.spotBall(pullPosition);
      }
    } catch (error) {
      console.error("ScoreManager: Error in onPlayEnded:", error);
    }
  }

  public spotBall(position: Vec3) {
    try {
      this.ballPosition = position;
      this.lineOfScrimmage = position;
      this.waitingForSpot = false;

      const distanceGained = this.checkDistanceGained(position);
      
      if (distanceGained) {
        this.currentDown = 1;
        this.calculateLineToGain();
        console.log("First Down!");
      } else {
        this.currentDown++;
        if (this.currentDown > 4) {
          this.turnover();
        }
      }

      this.updateUI();
    } catch (error) {
      console.error("ScoreManager: Error spotting ball:", error);
    }
  }

  public turnover() {
    try {
      this.possession = this.possession === 'TeamA' ? 'TeamB' : 'TeamA';
      this.resetDowns(this.possession);
      console.log("Turnover on downs!");
    } catch (error) {
      console.error("ScoreManager: Error in turnover:", error);
    }
  }

  private resetDowns(team: 'TeamA' | 'TeamB') {
    this.currentDown = 1;
    this.possession = team;
    this.calculateLineToGain();
    this.updateUI();
  }

  private calculateLineToGain() {
    try {
      const direction = this.possession === 'TeamA' ? 1 : -1;
      
      this.lineToGain = new Vec3(
        this.lineOfScrimmage.x,
        this.lineOfScrimmage.y,
        this.lineOfScrimmage.z + (this.props.yardsForFirstDown * direction)
      );
    } catch (error) {
      console.error("ScoreManager: Error calculating line to gain:", error);
    }
  }

  private checkDistanceGained(currentPos: Vec3): boolean {
    try {
      if (this.possession === 'TeamA') {
        return currentPos.z >= this.lineToGain.z;
      } else {
        return currentPos.z <= this.lineToGain.z;
      }
    } catch (error) {
      console.error("ScoreManager: Error checking distance:", error);
      return false;
    }
  }

  private endGame() {
    this.isGameActive = false;
    this.timeRemaining = 0;
    console.log("Game Over");
    this.updateUI();
  }

  private updateUI() {
    try {
      if (this.props.scoreboardText) {
        const textGizmo = this.props.scoreboardText.as(TextGizmo);
        if (textGizmo) {
          const timeStr = this.formatTime(this.timeRemaining);
          textGizmo.text.set(
            `HOME: ${this.scoreA} | GUEST: ${this.scoreB}\nQ${this.currentQuarter} - ${timeStr}`
          );
        }
      }
    } catch (error) {
      console.error("ScoreManager: Error updating scoreboard UI:", error);
    }

    try {
      if (this.props.downMarkerText) {
        const downGizmo = this.props.downMarkerText.as(TextGizmo);
        if (downGizmo) {
          downGizmo.text.set(
            `Down: ${this.currentDown}\nPossession: ${this.possession}`
          );
        }
      }
    } catch (error) {
      console.error("ScoreManager: Error updating down marker UI:", error);
    }
  }

  private formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}

Component.register(FlagFootball_ScoreManager);