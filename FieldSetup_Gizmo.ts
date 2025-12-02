import { Component, PropTypes, Entity, Vec3 } from 'horizon/core';

/**
 * FieldSetup_Gizmo
 * Purpose: Calculates field geometry based on physical markers placed in the world.
 * This helps define where the Goal Lines are.
 */
class FieldSetup_Gizmo extends Component<typeof FieldSetup_Gizmo> {
  static propsDefinition = {
    // Drag entities here in the editor to define the field
    fiftyYardLine: { type: PropTypes.Entity },
    endZoneA: { type: PropTypes.Entity }, // Place at the Goal Line of Team A
    endZoneB: { type: PropTypes.Entity }, // Place at the Goal Line of Team B
    
    debug: { type: PropTypes.Boolean, default: true },
  };

  private fieldLength: number = 0;
  
  // Z-Coordinates of the goal lines (assuming field runs along Z-axis)
  public goalLineA_Z: number = 0;
  public goalLineB_Z: number = 0;

  start() {
    this.calculateGeometry();
  }

  private calculateGeometry() {
    // Safety Check
    if (!this.props.fiftyYardLine || !this.props.endZoneA || !this.props.endZoneB) {
      if (this.props.debug) console.log("FieldSetup: Missing markers! Please assign them in properties.");
      return;
    }

    // Get Positions
    const centerPos = this.props.fiftyYardLine.position.get();
    const posA = this.props.endZoneA.position.get();
    const posB = this.props.endZoneB.position.get();

    // Store Goal Line Z positions
    // We assume the markers are placed exactly on the goal line
    this.goalLineA_Z = posA.z;
    this.goalLineB_Z = posB.z;

    // Calculate total length
    const distA = centerPos.distance(posA);
    const distB = centerPos.distance(posB);
    this.fieldLength = distA + distB;

    if (this.props.debug) {
      console.log(`Field Setup Complete.`);
      console.log(`Total Length: ${this.fieldLength.toFixed(2)}m`);
      console.log(`Goal Line A (Z): ${this.goalLineA_Z.toFixed(2)}`);
      console.log(`Goal Line B (Z): ${this.goalLineB_Z.toFixed(2)}`);
    }
  }

  /**
   * Helper to check if a position is inside a specific EndZone
   * (Assumes standard field orientation along Z axis)
   */
  public isInsideEndZone(position: Vec3, team: 'TeamA' | 'TeamB'): boolean {
    // Simple check: Is the position past the goal line?
    if (team === 'TeamA') {
      // Assuming Team A is in positive Z direction
      return position.z > this.goalLineA_Z;
    } else {
      // Assuming Team B is in negative Z direction
      return position.z < this.goalLineB_Z;
    }
  }
}

Component.register(FieldSetup_Gizmo);