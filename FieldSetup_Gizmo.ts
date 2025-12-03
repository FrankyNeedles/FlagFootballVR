import { Component, PropTypes, Entity, Vec3 } from 'horizon/core';

/**
 * FieldSetup_Gizmo - Simplified Version
 * Purpose: Basic field geometry calculation
 */
class FieldSetup_Gizmo extends Component {
  static propsDefinition = {
    fiftyYardLine: { type: PropTypes.Entity },
    endZoneA: { type: PropTypes.Entity },
    endZoneB: { type: PropTypes.Entity },
    debug: { type: PropTypes.Boolean, default: true }
  };

  private fieldLength: number = 0;
  public goalLineA_Z: number = 0;
  public goalLineB_Z: number = 0;

  start() {
    this.calculateGeometry();
  }

  private calculateGeometry() {
    if (!this.props.fiftyYardLine || !this.props.endZoneA || !this.props.endZoneB) {
      if (this.props.debug) {
        console.log("FieldSetup: Missing markers!");
      }
      return;
    }

    try {
      const centerPos = this.props.fiftyYardLine.position.get();
      const posA = this.props.endZoneA.position.get();
      const posB = this.props.endZoneB.position.get();

      this.goalLineA_Z = posA.z;
      this.goalLineB_Z = posB.z;

      const distA = centerPos.distance(posA);
      const distB = centerPos.distance(posB);
      this.fieldLength = distA + distB;

      if (this.props.debug) {
        console.log(`Field Setup Complete.`);
        console.log(`Total Length: ${this.fieldLength.toFixed(2)}m`);
        console.log(`Goal Line A (Z): ${this.goalLineA_Z.toFixed(2)}`);
        console.log(`Goal Line B (Z): ${this.goalLineB_Z.toFixed(2)}`);
      }
    } catch (error) {
      console.error("FieldSetup: Error calculating geometry:", error);
    }
  }

  public isInsideEndZone(position: Vec3, team: 'TeamA' | 'TeamB'): boolean {
    if (team === 'TeamA') {
      return position.z > this.goalLineA_Z;
    } else {
      return position.z < this.goalLineB_Z;
    }
  }
}

Component.register(FieldSetup_Gizmo);