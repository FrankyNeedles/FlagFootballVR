import { Component, PropTypes, Entity, TextGizmo, Vec3, World, Player } from 'horizon/core';

/**
 * FlagFootball_ScoreManager
 * Purpose: Manages game state, scoring, time, and down/distance logic.
 */
class FlagFootball_ScoreManager extends Component<typeof FlagFootball_ScoreManager> {
  static propsDefinition = {
    // UI References - Drag your Text Gizmos here in the Editor
    scoreboardText: { type: PropTypes.Entity }, 
    downMarkerText: { type: PropTypes.Entity },
    
    // Game Settings
    gameDurationMinutes: { type: PropTypes.Number, default: 20 },
    yardsForFirstDown: { type: PropTypes.Number, default: 20 },
    touchdownPoints: { type: PropTypes.Number, default: 6 },
    manualSpotting: { type: PropTypes.Boolean, default: false }, // If true, Ref must interact to move ball
    
    // Debug
    debug: { type: PropTypes.Boolean, default: true },
  };

  // Game State
  private isGameActive: boolean = false;
  private timeRemaining: number = 0;
  private currentQuarter: number = 1;
  
  // Scoring
  private scoreA: number = 0;
  private scoreB: number = 0;

  // Downs & Distance
  private currentDown: number = 1;
  private possession: 'TeamA' | 'TeamB' = 'TeamA';
  
  // We use Vec3 for Horizon physics/positions
  private ballPosition: Vec3 = Vec3.zero;
  private lineOfScrimmage: Vec3 = Vec3.zero;
  private lineToGain: Vec3 = Vec3.zero;

  // Referee State
  private waitingForSpot: boolean = false;

  start() {
    // Initialize Timer
    this.timeRemaining = this.props.gameDurationMinutes * 60;
    
    // Connect Update Loop for Timer
    this.connectLocalBroadcastEvent(World.onUpdate, (data) => {
      this.onUpdate(data.deltaTime);
    });

    this.updateUI();
    this.log("Score Manager Initialized.");
  }

  /**
   * Main Game Loop
   */
  private onUpdate(deltaTime: number) {
    if (this.isGameActive && this.timeRemaining > 0) {
      this.timeRemaining -= deltaTime;
      
      // Handle Game End
      if (this.timeRemaining <= 0) {
        this.endGame();
      }

      // Update UI every second (optimization to prevent text flicker)
      if (Math.floor(this.timeRemaining) % 1 === 0) {
        this.updateUI();
      }
    }
  }

  // ==========================================
  // Public API (Called by other scripts)
  // ==========================================

  public startGame() {
    this.isGameActive = true;
    this.scoreA = 0;
    this.scoreB = 0;
    this.currentQuarter = 1;
    this.timeRemaining = this.props.gameDurationMinutes * 60;
    this.resetDowns('TeamA'); 
    this.log("Game Started");
    this.updateUI();
  }

  public stopGame() {
    this.isGameActive = false;
    this.updateUI();
  }

  public addScore(team: 'TeamA' | 'TeamB', points: number) {
    if (team === 'TeamA') this.scoreA += points;
    else this.scoreB += points;
    
    this.updateUI();
    this.log(`${team} scored ${points} points!`);
  }

  /**
   * Called by FlagFootball_Gizmo when a flag is pulled
   */
  public onPlayEnded(pullPosition: Vec3) {
    this.log(`Play ended at: ${pullPosition}`);

    if (this.props.manualSpotting) {
      this.waitingForSpot = true;
      // Logic for referee interaction would go here
    } else {
      this.spotBall(pullPosition);
    }
  }

  /**
   * Moves the line of scrimmage to the new spot
   */
  public spotBall(position: Vec3) {
    this.ballPosition = position;
    this.lineOfScrimmage = position;
    this.waitingForSpot = false;

    // Check for First Down
    const distanceGained = this.checkDistanceGained(position);
    
    if (distanceGained) {
      this.currentDown = 1;
      this.calculateLineToGain();
      this.log("First Down!");
    } else {
      this.currentDown++;
      if (this.currentDown > 4) {
        this.turnover();
      }
    }

    this.updateUI();
  }

  public turnover() {
    this.possession = this.possession === 'TeamA' ? 'TeamB' : 'TeamA';
    this.resetDowns(this.possession);
    this.log("Turnover on downs!");
  }

  // ==========================================
  // Internal Logic
  // ==========================================

  private resetDowns(team: 'TeamA' | 'TeamB') {
    this.currentDown = 1;
    this.possession = team;
    this.calculateLineToGain();
    this.updateUI();
  }

  private calculateLineToGain() {
    // Simplified logic: Assuming Z+ is forward for Team A.
    // In a full implementation, FieldSetup_Gizmo would provide direction.
    const direction = this.possession === 'TeamA' ? 1 : -1;
    
    this.lineToGain = new Vec3(
      this.lineOfScrimmage.x,
      this.lineOfScrimmage.y,
      this.lineOfScrimmage.z + (this.props.yardsForFirstDown * direction)
    );
  }

  private checkDistanceGained(currentPos: Vec3): boolean {
    if (this.possession === 'TeamA') {
      return currentPos.z >= this.lineToGain.z;
    } else {
      return currentPos.z <= this.lineToGain.z;
    }
  }

  private endGame() {
    this.isGameActive = false;
    this.timeRemaining = 0;
    this.log("Game Over");
    this.updateUI();
  }

  private updateUI() {
    // Update Scoreboard Text Gizmo
    if (this.props.scoreboardText) {
      const textGizmo = this.props.scoreboardText.as(TextGizmo);
      if (textGizmo) {
        const timeStr = this.formatTime(this.timeRemaining);
        textGizmo.text.set(
          `HOME: ${this.scoreA} | GUEST: ${this.scoreB}\nQ${this.currentQuarter} - ${timeStr}`
        );
      }
    }

    // Update Down Marker Text Gizmo
    if (this.props.downMarkerText) {
      const downGizmo = this.props.downMarkerText.as(TextGizmo);
      if (downGizmo) {
        downGizmo.text.set(
          `Down: ${this.currentDown}\nPossession: ${this.possession}`
        );
      }
    }
  }

  private formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  private log(msg: string) {
    if (this.props.debug) console.log(`[ScoreManager] ${msg}`);
  }
}

Component.register(FlagFootball_ScoreManager);