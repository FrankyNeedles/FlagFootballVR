import { Component, PropTypes, Entity, Player, Vec3, Color, TriggerGizmo, TextGizmo } from 'horizon/core';

/**
 * Spectator_Hud
 * Purpose: Enhanced spectator display with ball physics integration.
 */
export class Spectator_Hud extends Component<typeof Spectator_Hud> {
  static propsDefinition = {
    mainHudText: { type: PropTypes.Entity },
    scoreText: { type: PropTypes.Entity },
    controlsText: { type: PropTypes.Entity },
    ballInfoText: { type: PropTypes.Entity }, // NEW: Ball physics info
    
    showTeamColors: { type: PropTypes.Boolean, default: true },
    teamAColor: { type: PropTypes.Color, default: new Vec3(1, 0, 0) },
    teamBColor: { type: PropTypes.Color, default: new Vec3(0, 0, 1) },
    
    ballManager: { type: PropTypes.Entity }, // NEW: Ball system reference
    scoreManager: { type: PropTypes.Entity },
    gameJoinTrigger: { type: PropTypes.Entity },
    
    debug: { type: PropTypes.Boolean, default: true },
  };

  private isSpectator: boolean = false;
  private flightModeEnabled: boolean = false;
  private lastUpdateTime: number = 0;
  private ballGizmo: any = null;

  start() {
    this.setupBallSystem();
    this.log("Enhanced Spectator HUD initialized");
    this.updateUI();
  }

  private setupBallSystem() {
    if (!this.props.ballManager) {
      this.log("Ball manager not assigned");
      return;
    }

    this.ballGizmo = this.getComponentAny(this.props.ballManager, 'Ball_Gizmo');
    if (!this.ballGizmo) {
      this.log("Could not find Ball_Gizmo component");
      return;
    }

    this.log("Ball system connected to Spectator HUD");
  }

  public enableSpectatorMode() {
    this.isSpectator = true;
    this.flightModeEnabled = true;
    
    this.log("Enhanced spectator mode enabled");
    this.updateUI();
  }

  public disableSpectatorMode() {
    this.isSpectator = false;
    this.flightModeEnabled = false;
    
    this.log("Spectator mode disabled");
    this.updateUI();
  }

  public toggleFlightMode() {
    if (!this.isSpectator) return;

    this.flightModeEnabled = !this.flightModeEnabled;
    
    this.log(`Flight mode ${this.flightModeEnabled ? 'enabled' : 'disabled'}`);
    this.updateUI();
  }

  private updateUI() {
    if (!this.isSpectator) {
      this.hideAllUI();
      return;
    }

    this.showAllUI();
    this.updateMainHud();
    this.updateScoreDisplay();
    this.updateControlsDisplay();
    this.updateBallInfoDisplay(); // NEW: Ball physics info
  }

  private hideAllUI() {
    this.setUIText(this.props.mainHudText, "");
    this.setUIText(this.props.scoreText, "");
    this.setUIText(this.props.controlsText, "");
    this.setUIText(this.props.ballInfoText, ""); // NEW: Hide ball info
  }

  private showAllUI() {
    this.updateMainHud();
    this.updateScoreDisplay();
    this.updateControlsDisplay();
    this.updateBallInfoDisplay(); // NEW: Show ball info
  }

  private updateMainHud() {
    if (!this.props.mainHudText || !this.isSpectator) return;

    const textGizmo = this.props.mainHudText.as(TextGizmo);
    if (!textGizmo) return;

    let hudText = "=== SPECTATOR MODE ===\n";

    const scoreManager = this.getComponentAny(this.props.scoreManager, 'FlagFootball_ScoreManager');
    if (scoreManager) {
      hudText += "Game Status: Active\n";
      hudText += "Flight: " + (this.flightModeEnabled ? 'ON' : 'OFF') + "\n";
    }

    textGizmo.text.set(hudText);
  }

  private updateScoreDisplay() {
    if (!this.props.scoreText || !this.isSpectator) return;

    const scoreGizmo = this.props.scoreText.as(TextGizmo);
    if (!scoreGizmo) return;

    let scoreText = "=== SCORE ===\n";

    const scoreManager = this.getComponentAny(this.props.scoreManager, 'FlagFootball_ScoreManager');
    if (scoreManager) {
      // This would need public methods to be exposed
      scoreText += "Team A: 0\n";
      scoreText += "Team B: 0";
    }

    scoreGizmo.text.set(scoreText);
  }

  private updateControlsDisplay() {
    if (!this.props.controlsText || !this.isSpectator) return;

    const controlsGizmo = this.props.controlsText.as(TextGizmo);
    if (!controlsGizmo) return;

    let controlsText = "=== CONTROLS ===\n";
    controlsText += "WASD: Move\n";
    controlsText += "Space/Shift: Up/Down\n";
    controlsText += "F: Toggle Flight\n";
    controlsText += "ESC: Exit Spectate\n";
    controlsText += "\nCamera: Free";

    controlsGizmo.text.set(controlsText);
  }

  private updateBallInfoDisplay() { // NEW: Ball physics information
    if (!this.props.ballInfoText || !this.isSpectator || !this.ballGizmo) return;

    const ballInfoGizmo = this.props.ballInfoText.as(TextGizmo);
    if (!ballInfoGizmo) return;

    const ballState = this.ballGizmo.getBallState();
    if (!ballState) {
      ballInfoGizmo.text.set("=== BALL INFO ===\nNo ball data");
      return;
    }

    let ballText = "=== BALL INFO ===\n";
    
    if (ballState.isHeld) {
      ballText += `Status: Held by ${ballState.holder?.name || 'Unknown'}\n`;
      ballText += `Position: ${this.formatVec3(ballState.position)}\n`;
    } else if (ballState.isFlying) {
      ballText += `Status: In Flight\n`;
      ballText += `Velocity: ${this.formatVec3(ballState.velocity)}\n`;
      ballText += `Position: ${this.formatVec3(ballState.position)}\n`;
      ballText += `Throw Power: ${ballState.throwPower.toFixed(1)}\n`;
    } else {
      ballText += `Status: On Ground\n`;
      ballText += `Position: ${this.formatVec3(ballState.position)}\n`;
    }

    ballInfoGizmo.text.set(ballText);
  }

  private formatVec3(vec: Vec3): string {
    return `(${vec.x.toFixed(1)}, ${vec.y.toFixed(1)}, ${vec.z.toFixed(1)})`;
  }

  private setUIText(uiEntity: Entity | undefined, text: string) {
    if (!uiEntity) return;
    
    const textGizmo = uiEntity.as(TextGizmo);
    if (textGizmo) {
      textGizmo.text.set(text);
    }
  }

  private getComponentAny(entity: Entity | undefined, componentName: string): any {
    if (!entity) return null;
    
    const e = entity as any;
    if (e.components) {
      return e.components.find((c: any) => c.constructor.name === componentName);
    }
    return null;
  }

  private log(msg: string) {
    if (this.props.debug) console.log(`[SpectatorHUD] ${msg}`);
  }

  onUpdate(deltaTime: number) {
    if (!this.isSpectator) return;

    const currentTime = Date.now() / 1000;
    
    if (currentTime - this.lastUpdateTime >= 0.5) {
      this.lastUpdateTime = currentTime;
      this.updateUI();
    }
  }
}

Component.register(Spectator_Hud);