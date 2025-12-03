import { Component, PropTypes, Entity, Player, Vec3, Color, TriggerGizmo, TextGizmo } from 'horizon/core';

/**
 * Simple Practice Manager
 * Purpose: Basic target practice without complex physics
 */
export class SimplePractice_Manager extends Component {
  static propsDefinition = {
    targetSpawner: { type: PropTypes.Entity },
    ballManager: { type: PropTypes.Entity },
    scoreText: { type: PropTypes.Entity },
    statusText: { type: PropTypes.Entity },
    maxTargets: { type: PropTypes.Number, default: 3 },
    targetTimeout: { type: PropTypes.Number, default: 5.0 },
    debug: { type: PropTypes.Boolean, default: true }
  };

  private practiceActive: boolean = false;
  private targets: any[] = [];
  private score: number = 0;
  private hits: number = 0;
  private throws: number = 0;

  start() {
    try {
      console.log("Simple Practice Manager initialized");
      this.updateUI();
    } catch (error) {
      console.error("Practice Manager: Error in start:", error);
    }
  }

  public startPractice() {
    try {
      if (this.practiceActive) return;
      
      this.practiceActive = true;
      this.score = 0;
      this.hits = 0;
      this.throws = 0;
      
      this.spawnTargets();
      console.log("Practice started");
      this.updateUI();
    } catch (error) {
      console.error("Practice Manager: Error starting practice:", error);
    }
  }

  public stopPractice() {
    try {
      if (!this.practiceActive) return;
      
      this.practiceActive = false;
      this.clearTargets();
      console.log("Practice stopped");
      this.updateUI();
    } catch (error) {
      console.error("Practice Manager: Error stopping practice:", error);
    }
  }

  private spawnTargets() {
    try {
      this.clearTargets();
      
      const spawner = this.props.targetSpawner as any;
      if (!spawner || typeof spawner.spawn !== 'function') {
        console.log("Target spawner not available");
        return;
      }

      for (let i = 0; i < this.props.maxTargets; i++) {
        const target = spawner.spawn();
        if (target) {
          const position = this.getRandomPosition();
          (target as any).position.set(position);
          
          const trigger = target.as(TriggerGizmo);
          if (trigger) {
            const t = trigger as any;
            if (t.onEnter) {
              t.onEnter.connect(() => this.onTargetHit(target));
            }
          }
          
          this.targets.push({
            entity: target,
            spawnTime: Date.now() / 1000
          });
        }
      }
      
      console.log(`Spawned ${this.targets.length} targets`);
    } catch (error) {
      console.error("Practice Manager: Error spawning targets:", error);
    }
  }

  private getRandomPosition(): Vec3 {
    return new Vec3(
      (Math.random() - 0.5) * 20,
      1.5,
      (Math.random() - 0.5) * 30
    );
  }

  private clearTargets() {
    try {
      for (const target of this.targets) {
        if (target.entity && target.entity.destroy) {
          target.entity.destroy();
        }
      }
      this.targets = [];
    } catch (error) {
      console.error("Practice Manager: Error clearing targets:", error);
    }
  }

  private onTargetHit(target: any) {
    try {
      this.hits++;
      this.throws++;
      this.score += 100;
      
      console.log(`Target hit! Score: ${this.score}`);
      
      const index = this.targets.findIndex(t => t.entity.id === target.entity.id);
      if (index !== -1) {
        this.targets.splice(index, 1);
      }
      
      if (target.entity && target.entity.destroy) {
        target.entity.destroy();
      }
      
      this.updateUI();
    } catch (error) {
      console.error("Practice Manager: Error handling target hit:", error);
    }
  }

  private checkTimeouts() {
    try {
      const currentTime = Date.now() / 1000;
      
      for (let i = this.targets.length - 1; i >= 0; i--) {
        const target = this.targets[i];
        const timeSinceSpawn = currentTime - target.spawnTime;
        
        if (timeSinceSpawn >= this.props.targetTimeout) {
          console.log("Target timed out");
          this.targets.splice(i, 1);
          
          if (target.entity && target.entity.destroy) {
            target.entity.destroy();
          }
        }
      }
    } catch (error) {
      console.error("Practice Manager: Error checking timeouts:", error);
    }
  }

  private updateUI() {
    try {
      if (this.props.statusText) {
        const textGizmo = this.props.statusText.as(TextGizmo);
        if (textGizmo) {
          const status = this.practiceActive ? "ACTIVE" : "INACTIVE";
          const instruction = this.practiceActive ? 
            "Hit the targets!" : 
            "Press 'P' to start";
          
          textGizmo.text.set(`Practice: ${status}\n${instruction}`);
        }
      }
    } catch (error) {
      console.error("Practice Manager: Error updating UI:", error);
    }

    try {
      if (this.props.scoreText) {
        const scoreGizmo = this.props.scoreText.as(TextGizmo);
        if (scoreGizmo) {
          const accuracy = this.throws > 0 ? 
            ((this.hits / this.throws) * 100).toFixed(1) : "0.0";

          scoreGizmo.text.set(
            `Score: ${this.score}\n` +
            `Accuracy: ${accuracy}%\n` +
            `Hits: ${this.hits}`
          );
        }
      }
    } catch (error) {
      console.error("Practice Manager: Error updating score UI:", error);
    }
  }

  onUpdate(deltaTime: number) {
    try {
      if (this.practiceActive) {
        this.checkTimeouts();
      }
    } catch (error) {
      console.error("Practice Manager: Error in update:", error);
    }
  }
}

Component.register(SimplePractice_Manager);