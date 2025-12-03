import { Component, PropTypes, Entity, Player, Vec3, Color, TriggerGizmo, TextGizmo } from 'horizon/core';

/**
 * Combine_ObstacleCourse
 * Purpose: A race mode for athletic skills with realistic ball throwing.
 * Integration: Uses Ball_Gizmo for realistic throwing mechanics.
 */
export class Combine_ObstacleCourse extends Component<typeof Combine_ObstacleCourse> {
  static propsDefinition = {
    // Ball system reference
    ballGizmo: { type: PropTypes.Entity },
    
    // Course configuration
    startPosition: { type: PropTypes.Vec3, default: new Vec3(0, 0, 0) },
    endPosition: { type: PropTypes.Vec3, default: new Vec3(0, 0, 100) },
    
    // Checkpoint setup
    checkpointSpawner: { type: PropTypes.Entity },
    numberOfCheckpoints: { type: PropTypes.Number, default: 5 },
    checkpointSpacing: { type: PropTypes.Number, default: 20 },
    
    // End zone setup
    throwingNet: { type: PropTypes.Entity },
    netTriggerDistance: { type: PropTypes.Number, default: 3.0 },
    
    // Timing
    courseTimeLimit: { type: PropTypes.Number, default: 120 },
    
    // UI
    courseText: { type: PropTypes.Entity },
    timerText: { type: PropTypes.Entity },
    leaderboardText: { type: PropTypes.Entity },
    throwPowerText: { type: PropTypes.Entity },
    
    // Debug
    debug: { type: PropTypes.Boolean, default: true },
  };

  // Course state
  private courseActive: boolean = false;
  private courseStartTime: number = 0;
  private activePlayer: Player | null = null;
  private checkpoints: Array<{entity: Entity, position: Vec3, index: number, isPassed: boolean, trigger: TriggerGizmo}> = [];
  
  // Player progress
  private checkpointsPassed: number = 0;
  private courseCompleted: boolean = false;
  private completionTime: number = 0;

  // Ball system reference
  private ballGizmo: any = null;

  // Leaderboard
  private leaderboard: Array<{playerName: string, time: number, date: string}> = [];

  // Throwing challenge
  private throwChallengeActive: boolean = false;
  private throwChallengePosition: Vec3 | null = null;

  start() {
    this.log("Combine Obstacle Course with Ball Physics initialized");
    this.setupBallSystem();
    this.createCheckpoints();
    this.setupNetTrigger();
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

  private createCheckpoints() {
    if (!this.props.checkpointSpawner) {
      this.log("Checkpoint spawner not assigned");
      return;
    }

    const spawner = this.props.checkpointSpawner as any;
    if (!spawner || typeof spawner.spawn !== 'function') {
      this.log("Checkpoint spawner is not valid");
      return;
    }

    this.checkpoints = [];

    for (let i = 0; i < this.props.numberOfCheckpoints; i++) {
      const checkpoint = spawner.spawn();
      if (!checkpoint) continue;

      const position = this.calculateCheckpointPosition(i);
      (checkpoint as any).position.set(position);

      // Setup trigger for checkpoint
      const trigger = checkpoint.as(TriggerGizmo);
      if (trigger) {
        const t = trigger as any;
        if (t.onEnter) {
          t.onEnter.connect((player: Player) => this.onCheckpointReached(player, i));
        }
      }

      this.checkpoints.push({
        entity: checkpoint,
        position: position,
        index: i,
        isPassed: false,
        trigger: trigger
      });
    }

    this.log(`Created ${this.checkpoints.length} checkpoints`);
  }

  private calculateCheckpointPosition(index: number): Vec3 {
    const progress = (index + 1) / (this.props.numberOfCheckpoints + 1);
    const position = Vec3.lerp(this.props.startPosition, this.props.endPosition, progress);

    // Add some lateral variation for more interesting course
    const lateralOffset = Math.sin(index * 0.5) * 5;
    position.x += lateralOffset;

    return position;
  }

  private setupNetTrigger() {
    if (!this.props.throwingNet) return;

    const netTrigger = this.props.throwingNet.as(TriggerGizmo);
    if (netTrigger) {
      const t = netTrigger as any;
      if (t.onEnter) {
        t.onEnter.connect((entity: Entity) => this.onBallEnteredNet(entity));
      }
    }
  }

  public startCourse(player: Player): boolean {
    if (this.courseActive) {
      this.log("Course already active");
      return false;
    }

    this.activePlayer = player;
    this.courseActive = true;
    this.courseStartTime = Date.now() / 1000;
    this.checkpointsPassed = 0;
    this.courseCompleted = false;

    // Reset checkpoints
    for (const checkpoint of this.checkpoints) {
      checkpoint.isPassed = false;
    }

    // Move player to start position
    (player as any).position.set(this.props.startPosition);

    // Give ball to player
    if (this.ballGizmo) {
      this.ballGizmo.giveBallToPlayer(player);
      this.ballGizmo.gameMode = 'combine';
    }

    this.log(`Course started for ${player.name}`);
    this.updateUI();
    return true;
  }

  public stopCourse(reason: string = "Course stopped") {
    if (!this.courseActive) return;

    this.courseActive = false;

    // Take ball from player
    if (this.ballGizmo && this.activePlayer) {
      this.ballGizmo.takeBallFromCurrentHolder();
      this.ballGizmo.gameMode = 'standard';
    }

    this.log(`Course stopped: ${reason}`);
    this.updateUI();
  }

  private onCheckpointReached(player: Player, checkpointIndex: number) {
    if (!this.courseActive || player !== this.activePlayer) return;

    const checkpoint = this.checkpoints[checkpointIndex];
    if (checkpoint.isPassed) return;

    checkpoint.isPassed = true;
    this.checkpointsPassed++;

    const currentTime = (Date.now() / 1000) - this.courseStartTime;

    this.log(`${player.name} reached checkpoint ${checkpointIndex + 1} at ${currentTime.toFixed(2)}s`);
    this.updateUI();

    // Activate throwing challenge at final checkpoint
    if (this.checkpointsPassed === this.props.numberOfCheckpoints) {
      this.activateThrowChallenge();
    }
  }

  private activateThrowChallenge() {
    if (!this.props.throwingNet || !this.activePlayer) return;

    this.throwChallengeActive = true;
    this.throwChallengePosition = this.props.throwingNet.position.get();

    // Set target position for ball
    if (this.ballGizmo) {
      this.ballGizmo.setTargetPosition(this.throwChallengePosition);
    }

    // Show throw power indicator
    this.updateThrowPowerUI();

    this.log("Throw challenge activated - throw ball into net!");
  }

  private onBallEnteredNet(entity: Entity) {
    if (!this.courseActive || !this.activePlayer) return;

    // Check if ball entered the net
    const ballState = this.ballGizmo ? this.ballGizmo.getBallState() : null;
    if (!ballState || !ballState.isFlying) return;

    // Check distance to net center
    const netPosition = this.props.throwingNet.position.get();
    const ballPosition = this.ballGizmo.getBallPosition();
    const distance = Vec3.distance(netPosition, ballPosition);

    if (distance <= this.props.netTriggerDistance) {
      this.onCourseCompleted();
    }
  }

  private onCourseCompleted() {
    if (!this.activePlayer) return;

    this.completionTime = (Date.now() / 1000) - this.courseStartTime;
    this.courseCompleted = true;
    this.courseActive = false;
    this.throwChallengeActive = false;

    // Clear target position
    if (this.ballGizmo) {
      this.ballGizmo.clearTargetPosition();
      this.ballGizmo.takeBallFromCurrentHolder();
      this.ballGizmo.gameMode = 'standard';
    }

    // Add to leaderboard
    this.addToLeaderboard(this.activePlayer.name, this.completionTime);

    this.log(`${this.activePlayer.name} completed course in ${this.completionTime.toFixed(2)}s`);
    this.updateUI();
    this.updateLeaderboardUI();
  }

  private addToLeaderboard(playerName: string, time: number) {
    const entry = {
      playerName: playerName,
      time: time,
      date: new Date().toLocaleDateString()
    };

    this.leaderboard.push(entry);
    this.leaderboard.sort((a, b) => a.time - b.time);

    // Keep only top 10
    if (this.leaderboard.length > 10) {
      this.leaderboard = this.leaderboard.slice(0, 10);
    }
  }

  private updateUI() {
    if (this.props.courseText) {
      const textGizmo = this.props.courseText.as(TextGizmo);
      if (textGizmo) {
        const status = this.courseActive ? "ACTIVE" : "INACTIVE";
        const instruction = this.courseActive ? 
          `Run through checkpoints!\nCheckpoints: ${this.checkpointsPassed}/${this.props.numberOfCheckpoints}` : 
          "Press 'C' to start obstacle course";

        if (this.throwChallengeActive) {
          textGizmo.text.set(`Throw Challenge: ACTIVE\nThrow ball into net!`);
        } else {
          textGizmo.text.set(`Obstacle Course: ${status}\n${instruction}`);
        }
      }
    }

    if (this.props.timerText) {
      const timerGizmo = this.props.timerText.as(TextGizmo);
      if (timerGizmo) {
        if (this.courseActive) {
          const currentTime = (Date.now() / 1000) - this.courseStartTime;
          const timeRemaining = Math.max(0, this.props.courseTimeLimit - currentTime);

          timerGizmo.text.set(
            `Time: ${currentTime.toFixed(1)}s\n` +
            `Limit: ${timeRemaining.toFixed(1)}s`
          );
        } else {
          timerGizmo.text.set("Timer: Ready");
        }
      }
    }

    this.updateThrowPowerUI();
  }

  private updateThrowPowerUI() {
    if (!this.props.throwPowerText) return;

    const powerGizmo = this.props.throwPowerText.as(TextGizmo);
    if (!powerGizmo) return;

    if (this.throwChallengeActive && this.ballGizmo) {
      const ballState = this.ballGizmo.getBallState();
      const powerPercent = (ballState.throwPower / this.ballGizmo.maxThrowPower) * 100;
      
      powerGizmo.text.set(
        `Throw Power: ${powerPercent.toFixed(0)}%\n` +
        `Aim for the net!`
      );
    } else {
      powerGizmo.text.set("");
    }
  }

  private updateLeaderboardUI() {
    if (!this.props.leaderboardText) return;

    const leaderboardGizmo = this.props.leaderboardText.as(TextGizmo);
    if (!leaderboardGizmo) return;

    let leaderboardText = "=== LEADERBOARD ===\n";

    if (this.leaderboard.length === 0) {
      leaderboardText += "No times yet!";
    } else {
      for (let i = 0; i < Math.min(5, this.leaderboard.length); i++) {
        const entry = this.leaderboard[i];
        leaderboardText += `${i + 1}. ${entry.playerName}: ${entry.time.toFixed(2)}s\n`;
      }
    }

    leaderboardGizmo.text = leaderboardText;
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
    if (this.props.debug) console.log(`[ObstacleCourse] ${msg}`);
  }

  onUpdate(deltaTime: number) {
    if (!this.courseActive) return;

    // Check time limit
    const currentTime = (Date.now() / 1000) - this.courseStartTime;
    if (currentTime >= this.props.courseTimeLimit) {
      this.stopCourse("Time limit exceeded");
    }

    // Update throw power UI if challenge is active
    if (this.throwChallengeActive) {
      this.updateThrowPowerUI();
    }

    this.updateUI();
  }
}

Component.register(Combine_ObstacleCourse);