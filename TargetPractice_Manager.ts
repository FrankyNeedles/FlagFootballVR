import { Component, PropTypes, Entity, Player, Vec3, Color, TriggerGizmo, TextGizmo } from 'horizon/core';

/**
 * TargetPractice_Manager
 * Purpose: Manages the Quarterback practice mode with realistic ball physics.
 * Integration: Uses Ball_Gizmo for realistic throwing mechanics.
 */
export class TargetPractice_Manager extends Component<typeof TargetPractice_Manager> {
  static propsDefinition = {
    // Ball system reference
    ballGizmo: { type: PropTypes.Entity },
    
    // Target spawner
    targetSpawner: { type: PropTypes.Entity },
    
    // Practice area settings
    practiceAreaCenter: { type: PropTypes.Vec3, default: Vec3.zero },
    practiceAreaWidth: { type: PropTypes.Number, default: 30 },
    practiceAreaLength: { type: PropTypes.Number, default: 50 },
    
    // Timing settings
    targetSpawnInterval: { type: PropTypes.Number, default: 3.0 },
    targetIdleTimeout: { type: PropTypes.Number, default: 5.0 },
    maxActiveTargets: { type: PropTypes.Number, default: 3 },
    
    // Scoring settings
    baseScorePerHit: { type: PropTypes.Number, default: 100 },
    distanceMultiplier: { type: PropTypes.Number, default: 2.0 },
    speedMultiplier: { type: PropTypes.Number, default: 1.5 },
    
    // UI
    scoreText: { type: PropTypes.Entity },
    statusText: { type: PropTypes.Entity },
    crosshairText: { type: PropTypes.Entity },
    
    // Debug
    debug: { type: PropTypes.Boolean, default: true },
  };

  // Game state
  private practiceModeActive: boolean = false;
  private lastSpawnTime: number = 0;
  private activeTargets: Array<{entity: Entity, position: Vec3, spawnTime: number, points: number, trigger: TriggerGizmo}> = [];
  
  // Scoring
  private currentScore: number = 0;
  private consecutiveHits: number = 0;
  private totalThrows: number = 0;
  private successfulHits: number = 0;

  // Ball system reference
  private ballGizmo: any = null;

  // Target tracking
  private currentTarget: Entity | null = null;

  start() {
    this.log("Target Practice Manager with Ball Physics initialized");
    this.setupBallSystem();
    this.setupTargetCollisions();
    this.updateUI();
  }

  private setupBallSystem() {
    if (!this.props.ballGizmo) {
      this.log("Ball gizmo not assigned");
      return;
    }

    this.ballGizmo = this.getComponentAny(this.props.ballGizmo, 'Ball_Gizmo');
    if (!this.ballGizmo) {
      this.log("Could not find Ball_Gizmo component");
      return;
    }

    this.log("Ball system connected");
  }

  private setupTargetCollisions() {
    // Setup collision detection for targets
    // This would connect to ball collision events
    this.log("Target collision system setup");
  }

  public startPracticeMode() {
    if (this.practiceModeActive) {
      this.log("Practice mode already active");
      return;
    }

    this.practiceModeActive = true;
    this.resetScore();
    this.lastSpawnTime = Date.now() / 1000;

    // Enable ball throwing
    if (this.ballGizmo) {
      this.ballGizmo.gameMode = 'practice';
    }

    this.log("Practice mode started with ball physics");
    this.updateUI();
  }

  public stopPracticeMode() {
    if (!this.practiceModeActive) {
      this.log("Practice mode not active");
      return;
    }

    this.practiceModeActive = false;
    this.clearAllTargets();
    this.clearCurrentTarget();

    // Disable ball special mode
    if (this.ballGizmo) {
      this.ballGizmo.gameMode = 'standard';
    }

    this.log("Practice mode stopped");
    this.updateUI();
  }

  private resetScore() {
    this.currentScore = 0;
    this.consecutiveHits = 0;
    this.totalThrows = 0;
    this.successfulHits = 0;
  }

  private spawnTarget() {
    if (this.activeTargets.length >= this.props.maxActiveTargets) {
      return;
    }

    const spawner = this.props.targetSpawner as any;
    if (!spawner || typeof spawner.spawn !== 'function') {
      this.log("Target spawner not available");
      return;
    }

    const target = spawner.spawn();
    if (!target) return;

    const position = this.generateTargetPosition();
    const distance = Vec3.distance(this.props.practiceAreaCenter, position);
    const points = Math.floor(this.props.baseScorePerHit + (distance * this.props.distanceMultiplier));

    (target as any).position.set(position);

    // Setup trigger for target
    const trigger = target.as(TriggerGizmo);
    if (trigger) {
      const t = trigger as any;
      if (t.onEnter) {
        t.onEnter.connect((entity: Entity) => this.onTargetHit(entity, target));
      }
    }

    const targetData = {
      entity: target,
      position: position,
      spawnTime: Date.now() / 1000,
      points: points,
      trigger: trigger
    };

    this.activeTargets.push(targetData);
    this.log(`Target spawned at distance ${distance.toFixed(1)} yards, worth ${points} points`);
  }

  private generateTargetPosition(): Vec3 {
    const halfWidth = this.props.practiceAreaWidth / 2;
    const halfLength = this.props.practiceAreaLength / 2;

    const randomX = this.props.practiceAreaCenter.x + (Math.random() - 0.5) * this.props.practiceAreaWidth;
    const randomZ = this.props.practiceAreaCenter.z + (Math.random() - 0.5) * this.props.practiceAreaLength;
    const targetHeight = 1.5 + Math.random() * 2; // Variable height for challenge

    return new Vec3(randomX, targetHeight, randomZ);
  }

  private clearAllTargets() {
    for (const targetData of this.activeTargets) {
      (targetData.entity as any).destroy();
    }
    this.activeTargets = [];
  }

  private onTargetHit(entity: Entity, target: Entity) {
    if (!this.practiceModeActive) return;

    // Check if hit by ball
    const ballState = this.ballGizmo ? this.ballGizmo.getBallState() : null;
    if (!ballState || !ballState.isFlying) return;

    const targetData = this.activeTargets.find(t => t.entity.id === target.id);
    if (!targetData) return;

    const timeToHit = (Date.now() / 1000) - targetData.spawnTime;
    const speedBonus = Math.max(0, this.props.speedMultiplier * (this.props.targetIdleTimeout - timeToHit));
    const totalScore = targetData.points + Math.floor(speedBonus);

    this.currentScore += totalScore;
    this.consecutiveHits++;
    this.successfulHits++;
    this.totalThrows++;

    this.log(`Target hit! Score: ${totalScore} (Base: ${targetData.points}, Speed: ${Math.floor(speedBonus)})`);
    
    // Visual feedback
    this.showHitFeedback(targetData.position, totalScore);
    
    // Remove target
    const index = this.activeTargets.indexOf(targetData);
    if (index !== -1) {
      this.activeTargets.splice(index, 1);
      (targetData.entity as any).destroy();
    }

    this.updateUI();
  }

  private showHitFeedback(position: Vec3, score: number) {
    // Create score popup
    const feedbackText = `+${score}`;
    
    if (this.props.crosshairText) {
      const crosshairGizmo = this.props.crosshairText.as(TextGizmo);
      if (crosshairGizmo) {
        crosshairGizmo.text.set(feedbackText);
        crosshairGizmo.color.set(new Color(0, 1, 0)); // Green
        
        // Reset after delay
        setTimeout(() => {
          crosshairGizmo.text.set("");
        }, 1000);
      }
    }
  }

  private checkTargetTimeouts() {
    const currentTime = Date.now() / 1000;

    for (let i = this.activeTargets.length - 1; i >= 0; i--) {
      const targetData = this.activeTargets[i];
      const timeSinceSpawn = currentTime - targetData.spawnTime;

      if (timeSinceSpawn >= this.props.targetIdleTimeout) {
        this.onTargetMissed(targetData);
        this.activeTargets.splice(i, 1);
        (targetData.entity as any).destroy();
      }
    }
  }

  private onTargetMissed(targetData: any) {
    this.consecutiveHits = 0;
    this.totalThrows++;

    this.log(`Target missed (idle timeout)`);
    this.updateUI();
  }

  private updateUI() {
    if (this.props.statusText) {
      const textGizmo = this.props.statusText.as(TextGizmo);
      if (textGizmo) {
        const status = this.practiceModeActive ? "ACTIVE" : "INACTIVE";
        const instruction = this.practiceModeActive ? 
          "Aim and throw at targets!" : 
          "Press 'P' to start practice mode";
        
        textGizmo.text.set(`Target Practice: ${status}\n${instruction}`);
      }
    }

    if (this.props.scoreText) {
      const scoreGizmo = this.props.scoreText.as(TextGizmo);
      if (scoreGizmo) {
        const accuracy = this.totalThrows > 0 ? 
          ((this.successfulHits / this.totalThrows) * 100).toFixed(1) : "0.0";

        scoreGizmo.text.set(
          `Score: ${this.currentScore}\n` +
          `Accuracy: ${accuracy}%\n` +
          `Streak: ${this.consecutiveHits}`
        );
      }
    }

    // Update crosshair for aiming
    if (this.props.crosshairText && this.practiceModeActive) {
      const crosshairGizmo = this.props.crosshairText.as(TextGizmo);
      if (crosshairGizmo && !crosshairGizmo.text.get().includes('+')) {
        crosshairGizmo.text.set("+");
        crosshairGizmo.color.set(new Color(1, 1, 1)); // White
      }
    }
  }

  private getComponentAny(entity: Entity, componentName: string): any {
    if (!entity) return null;
    
    const e = entity as any;
    if (e.components) {
      return e.components.find((c: any) => c.constructor.name === componentName);
    }
    return null;
  }

  private log(msg: string) {
    if (this.props.debug) console.log(`[TargetPractice] ${msg}`);
  }

  onUpdate(deltaTime: number) {
    if (!this.practiceModeActive) return;

    const currentTime = Date.now() / 1000;

    // Spawn targets at intervals
    if (currentTime - this.lastSpawnTime >= this.props.targetSpawnInterval) {
      this.spawnTarget();
      this.lastSpawnTime = currentTime;
    }

    // Check for idle targets
    this.checkTargetTimeouts();
  }
}

Component.register(TargetPractice_Manager);