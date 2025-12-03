import { Component, PropTypes, Entity, Player, Vec3, Color } from 'horizon/core';

/**
 * FlagFootball_Gizmo - Simplified Version
 * Purpose: Basic flag attachment to players
 */
export class FlagFootball_Gizmo extends Component {
  static propsDefinition = {
    flagSpawner: { type: PropTypes.Entity },
    teamAColor: { type: PropTypes.Color, default: new Color(1, 0, 0) },
    teamBColor: { type: PropTypes.Color, default: new Color(0, 0, 1) },
    debug: { type: PropTypes.Boolean, default: true }
  };

  private playerFlags = new Map();

  start() {
    try {
      if (!this.props.flagSpawner) {
        console.error("FlagFootball_Gizmo: No Flag Spawner assigned!");
      } else {
        console.log("FlagFootball_Gizmo initialized");
      }
    } catch (error) {
      console.error("FlagFootball_Gizmo: Error in start:", error);
    }
  }

  public attachFlagsToPlayer(player: Player, team: string) {
    try {
      this.removeFlagsFromPlayer(player);

      if (!this.props.flagSpawner) return;

      const spawner = this.props.flagSpawner as any;

      if (!spawner || typeof spawner.spawn !== 'function') {
        console.error("FlagFootball_Gizmo: Spawner not valid!");
        return;
      }

      const leftFlag = spawner.spawn();
      const rightFlag = spawner.spawn();

      if (leftFlag && rightFlag) {
        const teamColor = team === 'TeamA' ? this.props.teamAColor : this.props.teamBColor;
        
        if (leftFlag.setMaterialColor) {
          leftFlag.setMaterialColor(teamColor);
        }
        if (rightFlag.setMaterialColor) {
          rightFlag.setMaterialColor(teamColor);
        }
        
        if (leftFlag.setParent) {
          leftFlag.setParent(player);
        }
        if (rightFlag.setParent) {
          rightFlag.setParent(player);
        }
        
        this.playerFlags.set(player.id, { left: leftFlag, right: rightFlag, team: team });
        
        if (this.props.debug) {
          console.log(`Flags spawned for ${player.name} on team ${team}`);
        }
      }
    } catch (error) {
      console.error("FlagFootball_Gizmo: Error attaching flags:", error);
    }
  }

  public removeFlagsFromPlayer(player: Player) {
    try {
      if (this.playerFlags.has(player.id)) {
        const data = this.playerFlags.get(player.id);
        
        if (data) {
          if (data.left && data.left.destroy) {
            data.left.destroy();
          }
          if (data.right && data.right.destroy) {
            data.right.destroy();
          }
        }
        
        this.playerFlags.delete(player.id);
        
        if (this.props.debug) {
          console.log(`Flags removed from ${player.name}`);
        }
      }
    } catch (error) {
      console.error("FlagFootball_Gizmo: Error removing flags:", error);
    }
  }
}

Component.register(FlagFootball_Gizmo);