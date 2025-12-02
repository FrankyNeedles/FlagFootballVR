import { Component, PropTypes, Player, TriggerGizmo, TextGizmo, Entity } from 'horizon/core';

/**
 * GameJoinTrigger_Logic
 * Purpose: Place this on a Trigger Gizmo. When a player enters, they join the specified team.
 */
class GameJoinTrigger_Logic extends Component<typeof GameJoinTrigger_Logic> {
  static propsDefinition = {
    role: { type: PropTypes.String, default: 'TeamA' }, 
    flagManager: { type: PropTypes.Entity },
    feedbackText: { type: PropTypes.Entity },
  };

  start() {
    // FIX 1: Use .as(TriggerGizmo) instead of .getComponent
    const trigger = this.entity.as(TriggerGizmo);
    
    if (trigger) {
      // FIX 2: Handle the event safely. 
      // We cast to 'any' to check which event exists at runtime.
      const t = trigger as any;
      
      if (t.onEnter) {
        t.onEnter.connect((player: Player) => this.handlePlayerJoin(player));
      } else if (t.onPlayerEnter) {
        // Some API versions use specific player events
        t.onPlayerEnter.connect((player: Player) => this.handlePlayerJoin(player));
      } else {
        console.error("TriggerGizmo: Could not find 'onEnter' or 'onPlayerEnter' signal!");
      }
    } else {
      console.error("GameJoinTrigger_Logic: Entity is not a TriggerGizmo!");
    }
  }

  private handlePlayerJoin(entityOrPlayer: any) {
    // FIX 3: Safety check to ensure we have a Player object
    // In some versions, the event returns an Entity, in others a Player.
    let player: Player | null = null;

    if (entityOrPlayer && typeof entityOrPlayer.name === 'string') {
        // Likely a Player object already
        player = entityOrPlayer;
    } 
    // If it's a generic entity, try to cast (this part is tricky in strict TS without .as check)
    // We will assume for the TriggerGizmo onEnter, it passes the Player or an Entity that IS the player.
    
    if (!player) {
        console.log("Object entered trigger, but it might not be a player.");
        return;
    }

    const role = this.props.role;
    console.log(`Player ${player.name} joined ${role}`);

    // Visual Feedback
    if (this.props.feedbackText) {
      const t = this.props.feedbackText.as(TextGizmo);
      if (t) t.text.set(`Welcome ${player.name} to ${role}!`);
    }

    // Logic Connection
    if (this.props.flagManager) {
      const managerAny = this.getComponentAny(this.props.flagManager, 'FlagFootball_Gizmo');
      
      if (managerAny) {
        if (role === 'Spectator') {
           managerAny.removeFlagsFromPlayer(player);
        } else {
           managerAny.attachFlagsToPlayer(player, role);
        }
      }
    }
  }

  private getComponentAny(entity: Entity, componentName: string): any {
     const e = entity as any;
     if (e.components) {
        return e.components.find((c: any) => c.constructor.name === componentName);
     }
     return null;
  }
}

Component.register(GameJoinTrigger_Logic);