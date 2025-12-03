import { Component, PropTypes, Entity, Player, Vec3, Color, TriggerGizmo, TextGizmo } from 'horizon/core';

/**
 * Ball_Gizmo - Simplified Version
 * Purpose: Basic ball throwing mechanics
 */
export class Ball_Gizmo extends Component {
  static propsDefinition = {
    ballEntity: { type: PropTypes.Entity },
    maxThrowPower: { type: PropTypes.Number, default: 25.0 },
    minThrowPower: { type: PropTypes.Number, default: 5.0 },
    gravity: { type: PropTypes.Number, default: 9.81 },
    showTrajectory: { type: PropTypes.Boolean, default: false },
    debug: { type: PropTypes.Boolean, default: true }
  };

  private ballState = {
    isHeld: false,
    isThrown: false,
    holder: null as Player | null,
    position: Vec3.zero,
    velocity: Vec3.zero,
    throwPower: 0,
    isCharging: false,
    chargeStartTime: 0
  };

  start() {
    try {
      if (!this.props.ballEntity) {
        console.error("Ball_Gizmo: No ball entity assigned!");
        return;
      }
      
      this.ballState.position = this.props.ballEntity.position.get();
      console.log("Ball_Gizmo initialized");
    } catch (error) {
      console.error("Ball_Gizmo: Error in start:", error);
    }
  }

  public giveBallToPlayer(player: Player) {
    try {
      if (this.ballState.holder) {
        this.takeBallFromCurrentHolder();
      }

      this.ballState.holder = player;
      this.ballState.isHeld = true;
      this.ballState.isThrown = false;

      const ball = this.props.ballEntity as any;
      if (ball && ball.setParent) {
        ball.setParent(player);
      }

      if (this.props.debug) {
        console.log(`Ball given to ${player.name}`);
      }
    } catch (error) {
      console.error("Ball_Gizmo: Error giving ball:", error);
    }
  }

  public takeBallFromCurrentHolder() {
    try {
      if (this.ballState.holder) {
        const ball = this.props.ballEntity as any;
        if (ball && ball.setParent) {
          ball.setParent(null);
        }
        
        this.ballState.holder = null;
        this.ballState.isHeld = false;
        
        if (this.props.debug) {
          console.log("Ball taken from current holder");
        }
      }
    } catch (error) {
      console.error("Ball_Gizmo: Error taking ball:", error);
    }
  }

  public startThrowCharge() {
    try {
      if (!this.ballState.isHeld || !this.ballState.holder) return;
      if (this.ballState.isCharging) return;

      this.ballState.isCharging = true;
      this.ballState.chargeStartTime = Date.now() / 1000;
      this.ballState.throwPower = 0;

      if (this.props.debug) {
        console.log("Throw charge started");
      }
    } catch (error) {
      console.error("Ball_Gizmo: Error starting charge:", error);
    }
  }

  public releaseThrow(targetPosition?: Vec3) {
    try {
      if (!this.ballState.isCharging || !this.ballState.holder) return;

      this.ballState.isCharging = false;
      
      const chargeTime = (Date.now() / 1000) - this.ballState.chargeStartTime;
      const chargeRatio = Math.min(chargeTime / 2.0, 1.0);
      this.ballState.throwPower = this.props.minThrowPower + 
        (this.props.maxThrowPower - this.props.minThrowPower) * chargeRatio;

      this.executeThrow(targetPosition);

      if (this.props.debug) {
        console.log(`Throw released with power: ${this.ballState.throwPower.toFixed(1)}`);
      }
    } catch (error) {
      console.error("Ball_Gizmo: Error releasing throw:", error);
    }
  }

  private executeThrow(targetPosition?: Vec3) {
    try {
      const holder = this.ballState.holder;
      if (!holder) return;

      const holderPos = holder.position.get();
      this.ballState.position = holderPos.clone();

      let throwDirection: Vec3;
      if (targetPosition) {
        throwDirection = Vec3.subtract(targetPosition, holderPos).normalize();
      } else {
        throwDirection = new Vec3(0, 0, 1); // Forward
      }

      this.ballState.velocity = throwDirection.clone().multiplyScalar(this.ballState.throwPower);
      this.ballState.velocity.y += this.ballState.throwPower * 0.3; // Add upward arc

      this.ballState.isHeld = false;
      this.ballState.isThrown = true;

      const ball = this.props.ballEntity as any;
      if (ball && ball.setParent) {
        ball.setParent(null);
      }

      if (this.props.debug) {
        console.log("Throw executed");
      }
    } catch (error) {
      console.error("Ball_Gizmo: Error executing throw:", error);
    }
  }

  public getBallState() {
    return { ...this.ballState };
  }

  public isBallHeld(): boolean {
    return this.ballState.isHeld;
  }

  public getCurrentHolder(): Player | null {
    return this.ballState.holder;
  }

  public getBallPosition(): Vec3 {
    try {
      return this.props.ballEntity.position.get();
    } catch (error) {
      console.error("Ball_Gizmo: Error getting position:", error);
      return Vec3.zero;
    }
  }

  onUpdate(deltaTime: number) {
    try {
      if (this.ballState.isThrown && !this.ballState.isHeld) {
        this.ballState.velocity.y -= this.props.gravity * deltaTime;
        
        const ball = this.props.ballEntity as any;
        if (ball && ball.position) {
          const currentPos = ball.position.get();
          const newPos = Vec3.add(currentPos, this.ballState.velocity.clone().multiplyScalar(deltaTime));
          ball.position.set(newPos);
        }

        if (this.ballState.position.y <= 0.5) {
          this.ballState.velocity = Vec3.zero;
          this.ballState.isThrown = false;
          
          if (this.props.debug) {
            console.log("Ball hit ground");
          }
        }
      }
    } catch (error) {
      console.error("Ball_Gizmo: Error in update:", error);
    }
  }
}

Component.register(Ball_Gizmo);