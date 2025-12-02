import { Component, PropTypes, Entity, Player, Vec3, Color } from 'horizon/core';

/**
 * FlagFootball_Gizmo
 * Purpose: Manages attaching flags to players hips using a Spawner Gizmo.
 */
export class FlagFootball_Gizmo extends Component<typeof FlagFootball_Gizmo> {
  static propsDefinition = {
    // Drag a Spawner Gizmo (containing your flag template) here
    flagSpawner: { type: PropTypes.Entity },
    
    teamAColor: { type: PropTypes.Color, default: new Color(1, 0, 0) },
    teamBColor: { type: PropTypes.Color, default: new Color(0, 0, 1) },
    
    debug: { type: PropTypes.Boolean, default: true },
  };

  private playerFlags = new Map<number, { left: Entity, right: Entity, team: string }>();

  start() {
    if (!this.props.flagSpawner) {
      console.error("FlagFootball_Gizmo: No Flag Spawner assigned!");
    }
  }

  // ==========================================
  // Public API
  // ==========================================

  public attachFlagsToPlayer(player: Player, team: string) {
    this.removeFlagsFromPlayer(player);

    if (!this.props.flagSpawner) return;

    // TS Fix: Cast to 'any' to bypass missing type definitions
    const spawner = this.props.flagSpawner as any;

    if (typeof spawner.spawn !== 'function') {
      console.error("FlagFootball_Gizmo: Assigned entity is not a Spawner!");
      return;
    }

    // Spawn Flags
    const leftFlag = spawner.spawn();
    const rightFlag = spawner.spawn();

    if (leftFlag && rightFlag) {
      // Parent to player
      (leftFlag as any).setParent(player);
      (rightFlag as any).setParent(player);
      
      // Store references
      this.playerFlags.set(player.id, { left: leftFlag, right: rightFlag, team: team });
      
      if (this.props.debug) console.log(`Flags spawned for ${player.name}`);
    }
  }

  public removeFlagsFromPlayer(player: Player) {
    if (this.playerFlags.has(player.id)) {
      const data = this.playerFlags.get(player.id)!;
      
      // Destroy flags
      if (data.left) (data.left as any).destroy();
      if (data.right) (data.right as any).destroy();
      
      this.playerFlags.delete(player.id);
    }
  }
}

Component.register(FlagFootball_Gizmo);``